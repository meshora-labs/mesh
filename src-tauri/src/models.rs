use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use tauri::Manager;

const MODEL_REGISTRY_FILE_NAME: &str = "models.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelRegistryRecord {
    pub id: String,
    pub provider_kind: String,
    pub integration_method: String,
    pub label: String,
    pub model_id: String,
    pub base_url: Option<String>,
    pub command: Option<String>,
    pub args: Option<String>,
    pub auth: Value,
    pub status: String,
    pub created_at_iso: String,
    pub updated_at_iso: String,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredModel {
    pub id: String,
    pub label: String,
    pub size_bytes: Option<u64>,
    pub modified_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredModelSource {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub base_url: Option<String>,
    pub online: bool,
    pub models: Vec<DiscoveredModel>,
    pub message: Option<String>,
    pub image: Option<String>,
    pub status: Option<String>,
    pub ports: Option<String>,
    pub container_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCatalogRequest {
    pub provider_kind: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub api_key_env: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCatalogEntry {
    pub id: String,
    pub label: String,
    pub owner: Option<String>,
    pub context_window: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
    size: Option<u64>,
    modified_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAiModelsResponse {
    data: Vec<OpenAiModel>,
}

#[derive(Debug, Deserialize)]
struct OpenAiModel {
    id: String,
}

#[derive(Debug, Deserialize)]
struct DockerContainerLine {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "Image")]
    image: String,
    #[serde(rename = "Names")]
    names: String,
    #[serde(rename = "Status")]
    status: String,
    #[serde(rename = "Ports")]
    ports: String,
}

#[tauri::command]
pub fn load_model_registry(
    app_handle: tauri::AppHandle,
) -> Result<Vec<ModelRegistryRecord>, String> {
    let path = model_registry_path(&app_handle)?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Unable to read model registry: {error}"))?;

    serde_json::from_str::<Vec<ModelRegistryRecord>>(&content)
        .map_err(|error| format!("Model registry is not valid JSON: {error}"))
}

#[tauri::command]
pub fn save_model_registry(
    app_handle: tauri::AppHandle,
    models: Vec<ModelRegistryRecord>,
) -> Result<Vec<ModelRegistryRecord>, String> {
    let path = model_registry_path(&app_handle)?;
    let serialized = serde_json::to_string_pretty(&models)
        .map_err(|error| format!("Unable to serialize model registry: {error}"))?;
    let tmp_path = path.with_extension("json.tmp");

    fs::write(&tmp_path, serialized)
        .map_err(|error| format!("Unable to write model registry: {error}"))?;
    fs::rename(&tmp_path, &path)
        .map_err(|error| format!("Unable to commit model registry: {error}"))?;

    Ok(models)
}

#[tauri::command]
pub async fn discover_model_sources() -> Vec<DiscoveredModelSource> {
    let client = Client::builder()
        .timeout(Duration::from_millis(900))
        .build();

    let mut sources = match client {
        Ok(client) => vec![probe_ollama(&client).await, probe_lm_studio(&client).await],
        Err(error) => vec![
            offline_source(
                "ollama",
                "ollama",
                "Ollama",
                Some("http://localhost:11434"),
                format!("HTTP client unavailable: {error}"),
            ),
            offline_source(
                "lm-studio",
                "lm-studio",
                "LM Studio",
                Some("http://localhost:1234/v1"),
                format!("HTTP client unavailable: {error}"),
            ),
        ],
    };

    sources.extend(discover_docker_containers());
    sources
}

#[tauri::command]
pub async fn fetch_model_catalog(
    request: ModelCatalogRequest,
) -> Result<Vec<ModelCatalogEntry>, String> {
    let api_key = resolve_api_key(&request);
    let endpoint = catalog_endpoint(&request, api_key.as_deref());
    let client = Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|error| format!("HTTP client unavailable: {error}"))?;
    let mut http_request = client
        .get(endpoint)
        .header(reqwest::header::ACCEPT, "application/json");

    match request.provider_kind.as_str() {
        "anthropic" => {
            if let Some(api_key) = api_key.as_deref() {
                http_request = http_request.header("x-api-key", api_key);
            }
            http_request = http_request.header("anthropic-version", "2023-06-01");
        }
        "gemini" => {}
        _ => {
            if let Some(api_key) = api_key.as_deref() {
                http_request = http_request.bearer_auth(api_key);
            }
        }
    }

    let response = http_request
        .send()
        .await
        .map_err(|error| format!("Catalog request failed: {error}"))?;
    let status = response.status();

    if !status.is_success() {
        return Err(format!("Catalog request failed with HTTP {status}."));
    }

    let payload = response
        .json::<Value>()
        .await
        .map_err(|error| format!("Catalog response is not valid JSON: {error}"))?;

    Ok(normalize_catalog_payload(&request.provider_kind, &payload))
}

async fn probe_ollama(client: &Client) -> DiscoveredModelSource {
    let base_url = "http://localhost:11434";
    let endpoint = format!("{base_url}/api/tags");

    match client.get(endpoint).send().await {
        Ok(response) if response.status().is_success() => {
            match response.json::<OllamaTagsResponse>().await {
                Ok(decoded) => DiscoveredModelSource {
                    id: "ollama".to_string(),
                    kind: "ollama".to_string(),
                    label: "Ollama".to_string(),
                    base_url: Some(base_url.to_string()),
                    online: true,
                    models: decoded
                        .models
                        .into_iter()
                        .map(|model| DiscoveredModel {
                            id: model.name.clone(),
                            label: model.name,
                            size_bytes: model.size,
                            modified_at: model.modified_at,
                        })
                        .collect(),
                    message: None,
                    image: None,
                    status: None,
                    ports: None,
                    container_id: None,
                },
                Err(error) => offline_source(
                    "ollama",
                    "ollama",
                    "Ollama",
                    Some(base_url),
                    format!("Unreadable /api/tags response: {error}"),
                ),
            }
        }
        Ok(response) => offline_source(
            "ollama",
            "ollama",
            "Ollama",
            Some(base_url),
            format!("HTTP {}", response.status()),
        ),
        Err(error) => offline_source(
            "ollama",
            "ollama",
            "Ollama",
            Some(base_url),
            error.to_string(),
        ),
    }
}

async fn probe_lm_studio(client: &Client) -> DiscoveredModelSource {
    let base_url = "http://localhost:1234/v1";
    let endpoint = format!("{base_url}/models");

    match client.get(endpoint).send().await {
        Ok(response) if response.status().is_success() => {
            match response.json::<OpenAiModelsResponse>().await {
                Ok(decoded) => DiscoveredModelSource {
                    id: "lm-studio".to_string(),
                    kind: "lm-studio".to_string(),
                    label: "LM Studio".to_string(),
                    base_url: Some(base_url.to_string()),
                    online: true,
                    models: decoded
                        .data
                        .into_iter()
                        .map(|model| DiscoveredModel {
                            id: model.id.clone(),
                            label: model.id,
                            size_bytes: None,
                            modified_at: None,
                        })
                        .collect(),
                    message: None,
                    image: None,
                    status: None,
                    ports: None,
                    container_id: None,
                },
                Err(error) => offline_source(
                    "lm-studio",
                    "lm-studio",
                    "LM Studio",
                    Some(base_url),
                    format!("Unreadable /v1/models response: {error}"),
                ),
            }
        }
        Ok(response) => offline_source(
            "lm-studio",
            "lm-studio",
            "LM Studio",
            Some(base_url),
            format!("HTTP {}", response.status()),
        ),
        Err(error) => offline_source(
            "lm-studio",
            "lm-studio",
            "LM Studio",
            Some(base_url),
            error.to_string(),
        ),
    }
}

fn discover_docker_containers() -> Vec<DiscoveredModelSource> {
    let output = Command::new("docker")
        .args(["ps", "--format", "{{json .}}"])
        .output();

    let output = match output {
        Ok(output) => output,
        Err(error) => {
            return vec![offline_source(
                "docker",
                "docker",
                "Docker",
                None,
                format!("Docker unavailable: {error}"),
            )];
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return vec![offline_source(
            "docker",
            "docker",
            "Docker",
            None,
            if stderr.is_empty() {
                "Docker did not return active containers.".to_string()
            } else {
                stderr
            },
        )];
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut sources = Vec::new();

    for line in stdout.lines().filter(|line| !line.trim().is_empty()) {
        let parsed = serde_json::from_str::<DockerContainerLine>(line);

        if let Ok(container) = parsed {
            let base_url = detect_docker_base_url(&container.ports);
            let message = if base_url.is_some() {
                None
            } else {
                Some("No HTTP endpoint detected from exposed ports.".to_string())
            };

            sources.push(DiscoveredModelSource {
                id: format!("docker:{}", container.id),
                kind: "docker".to_string(),
                label: container.names.clone(),
                base_url,
                online: true,
                models: Vec::new(),
                message,
                image: Some(container.image),
                status: Some(container.status),
                ports: Some(container.ports),
                container_id: Some(container.id),
            });
        }
    }

    if sources.is_empty() {
        return vec![offline_source(
            "docker",
            "docker",
            "Docker",
            None,
            "No active Docker containers found.",
        )];
    }

    sources
}

fn detect_docker_base_url(ports: &str) -> Option<String> {
    for segment in ports.split(',').map(str::trim) {
        let Some((host_side, container_side)) = segment.split_once("->") else {
            continue;
        };
        let host_port = host_side.rsplit(':').next()?.trim();
        let container_port = container_side.split('/').next()?.trim();

        if host_port.is_empty() {
            continue;
        }

        match container_port {
            "11434" => return Some(format!("http://localhost:{host_port}")),
            "1234" | "8000" | "8080" | "5000" | "3000" => {
                return Some(format!("http://localhost:{host_port}/v1"));
            }
            _ => {}
        }
    }

    None
}

fn offline_source(
    id: impl Into<String>,
    kind: impl Into<String>,
    label: impl Into<String>,
    base_url: Option<&str>,
    message: impl Into<String>,
) -> DiscoveredModelSource {
    DiscoveredModelSource {
        id: id.into(),
        kind: kind.into(),
        label: label.into(),
        base_url: base_url.map(str::to_string),
        online: false,
        models: Vec::new(),
        message: Some(message.into()),
        image: None,
        status: None,
        ports: None,
        container_id: None,
    }
}

fn model_registry_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve app data directory: {error}"))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|error| format!("Unable to create app data directory: {error}"))?;

    Ok(app_data_dir.join(MODEL_REGISTRY_FILE_NAME))
}

fn resolve_api_key(request: &ModelCatalogRequest) -> Option<String> {
    normalized_optional(request.api_key.clone()).or_else(|| {
        normalized_optional(request.api_key_env.clone())
            .and_then(|env_name| std::env::var(env_name).ok())
            .and_then(|value| normalized_optional(Some(value)))
    })
}

fn catalog_endpoint(request: &ModelCatalogRequest, api_key: Option<&str>) -> String {
    if request.provider_kind == "hugging-face" {
        return "https://huggingface.co/api/models?inference_provider=all&pipeline_tag=text-generation&limit=100".to_string();
    }

    let base_url = normalized_optional(request.base_url.clone())
        .unwrap_or_else(|| default_catalog_base_url(&request.provider_kind).to_string());
    let base_url = base_url.trim_end_matches('/');

    if request.provider_kind == "gemini" {
        let key = api_key
            .map(|value| format!("?key={value}"))
            .unwrap_or_default();
        return format!("{base_url}/models{key}");
    }

    format!("{base_url}/models")
}

fn default_catalog_base_url(provider_kind: &str) -> &'static str {
    match provider_kind {
        "openai" => "https://api.openai.com/v1",
        "openrouter" => "https://openrouter.ai/api/v1",
        "anthropic" => "https://api.anthropic.com/v1",
        "perplexity" => "https://api.perplexity.ai/v1",
        "mistral" => "https://api.mistral.ai/v1",
        "qwen" => "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        "deepseek" => "https://api.deepseek.com",
        "llama-meta" => "https://api.llama.com/compat/v1",
        "gemini" => "https://generativelanguage.googleapis.com/v1beta",
        "manual-http" | "docker" | "lm-studio" => "http://localhost:8000/v1",
        "ollama" => "http://localhost:11434",
        _ => "http://localhost:8000/v1",
    }
}

fn normalize_catalog_payload(provider_kind: &str, payload: &Value) -> Vec<ModelCatalogEntry> {
    if provider_kind == "hugging-face" {
        return payload
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| {
                        let id = string_field(item, "id")?;
                        Some(ModelCatalogEntry {
                            label: id.clone(),
                            id,
                            owner: string_field(item, "author"),
                            context_window: None,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();
    }

    if provider_kind == "gemini" {
        return payload
            .get("models")
            .and_then(Value::as_array)
            .map(|items| items.iter().filter_map(read_catalog_entry).collect())
            .unwrap_or_default();
    }

    if let Some(items) = payload.get("data").and_then(Value::as_array) {
        return items.iter().filter_map(read_catalog_entry).collect();
    }

    if let Some(items) = payload.get("models").and_then(Value::as_array) {
        return items.iter().filter_map(read_catalog_entry).collect();
    }

    payload
        .as_array()
        .map(|items| items.iter().filter_map(read_catalog_entry).collect())
        .unwrap_or_default()
}

fn read_catalog_entry(item: &Value) -> Option<ModelCatalogEntry> {
    let id = string_field(item, "id").or_else(|| {
        string_field(item, "name").map(|name| name.trim_start_matches("models/").to_string())
    })?;
    let label = string_field(item, "displayName")
        .or_else(|| string_field(item, "display_name"))
        .or_else(|| string_field(item, "name"))
        .unwrap_or_else(|| id.clone());

    Some(ModelCatalogEntry {
        id,
        label,
        owner: string_field(item, "owned_by").or_else(|| string_field(item, "owner")),
        context_window: u64_field(item, "context_length")
            .or_else(|| u64_field(item, "contextWindow"))
            .or_else(|| u64_field(item, "context_window"))
            .or_else(|| u64_field(item, "inputTokenLimit")),
    })
}

fn string_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(str::to_string)
}

fn u64_field(value: &Value, key: &str) -> Option<u64> {
    value.get(key).and_then(Value::as_u64)
}

fn normalized_optional(value: Option<String>) -> Option<String> {
    value
        .map(|entry| entry.trim().to_string())
        .filter(|entry| !entry.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn detects_docker_base_url_from_known_container_ports() {
        assert_eq!(
            detect_docker_base_url("0.0.0.0:11434->11434/tcp"),
            Some("http://localhost:11434".to_string())
        );
        assert_eq!(
            detect_docker_base_url("127.0.0.1:49152->8000/tcp"),
            Some("http://localhost:49152/v1".to_string())
        );
        assert_eq!(detect_docker_base_url("0.0.0.0:9000->9000/tcp"), None);
    }

    #[test]
    fn builds_catalog_endpoints_for_provider_shapes() {
        let openai = ModelCatalogRequest {
            provider_kind: "openai".to_string(),
            base_url: Some("https://api.openai.com/v1/".to_string()),
            api_key: None,
            api_key_env: None,
        };
        let gemini = ModelCatalogRequest {
            provider_kind: "gemini".to_string(),
            base_url: Some("https://generativelanguage.googleapis.com/v1beta/".to_string()),
            api_key: None,
            api_key_env: None,
        };
        let hugging_face = ModelCatalogRequest {
            provider_kind: "hugging-face".to_string(),
            base_url: Some("https://ignored.example".to_string()),
            api_key: None,
            api_key_env: None,
        };

        assert_eq!(
            catalog_endpoint(&openai, None),
            "https://api.openai.com/v1/models"
        );
        assert_eq!(
            catalog_endpoint(&gemini, Some("gemini-key")),
            "https://generativelanguage.googleapis.com/v1beta/models?key=gemini-key"
        );
        assert_eq!(
            catalog_endpoint(&hugging_face, None),
            "https://huggingface.co/api/models?inference_provider=all&pipeline_tag=text-generation&limit=100"
        );
    }

    #[test]
    fn resolves_direct_api_key_before_env_key() {
        let request = ModelCatalogRequest {
            provider_kind: "openai".to_string(),
            base_url: None,
            api_key: Some("  direct-key  ".to_string()),
            api_key_env: Some("MESH_TEST_UNUSED".to_string()),
        };

        assert_eq!(resolve_api_key(&request), Some("direct-key".to_string()));
    }

    #[test]
    fn normalizes_openai_compatible_catalog_payloads() {
        let payload = json!({
            "data": [
                {
                    "id": "gpt-5.2",
                    "display_name": "GPT-5.2",
                    "owned_by": "openai",
                    "context_length": 200000
                },
                {
                    "object": "invalid"
                }
            ]
        });

        let entries = normalize_catalog_payload("openai", &payload);

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "gpt-5.2");
        assert_eq!(entries[0].label, "GPT-5.2");
        assert_eq!(entries[0].owner, Some("openai".to_string()));
        assert_eq!(entries[0].context_window, Some(200000));
    }

    #[test]
    fn normalizes_gemini_and_hugging_face_catalog_payloads() {
        let gemini_payload = json!({
            "models": [
                {
                    "name": "models/gemini-2.0-flash",
                    "displayName": "Gemini 2.0 Flash",
                    "inputTokenLimit": 1048576
                }
            ]
        });
        let hugging_face_payload = json!([
            {
                "id": "meta-llama/Llama-3.3-70B-Instruct",
                "author": "meta-llama"
            }
        ]);

        let gemini_entries = normalize_catalog_payload("gemini", &gemini_payload);
        let hugging_face_entries = normalize_catalog_payload("hugging-face", &hugging_face_payload);

        assert_eq!(gemini_entries[0].id, "gemini-2.0-flash");
        assert_eq!(gemini_entries[0].label, "Gemini 2.0 Flash");
        assert_eq!(gemini_entries[0].context_window, Some(1048576));
        assert_eq!(
            hugging_face_entries[0].id,
            "meta-llama/Llama-3.3-70B-Instruct"
        );
        assert_eq!(
            hugging_face_entries[0].owner,
            Some("meta-llama".to_string())
        );
    }
}
