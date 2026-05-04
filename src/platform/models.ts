import { invoke } from "@tauri-apps/api/core";
import type { ModelAuth, ModelProviderKind, ModelRegistryRecord } from "@/domain/model-registry";

const MODEL_REGISTRY_STORAGE_KEY = "mesh.model.registry";

export interface DiscoveredModel {
  id: string;
  label: string;
  sizeBytes?: number | null;
  modifiedAt?: string | null;
}

export interface DiscoveredModelSource {
  id: string;
  kind: "ollama" | "lm-studio" | "docker";
  label: string;
  baseUrl?: string | null;
  online: boolean;
  models: DiscoveredModel[];
  message?: string | null;
  image?: string | null;
  status?: string | null;
  ports?: string | null;
  containerId?: string | null;
}

export interface ModelCatalogEntry {
  id: string;
  label: string;
  owner?: string | null;
  contextWindow?: number | null;
}

export interface FetchModelCatalogInput {
  providerKind: ModelProviderKind;
  baseUrl?: string;
  auth: ModelAuth;
}

export async function loadModelRegistry(): Promise<ModelRegistryRecord[]> {
  if (isTauriRuntime()) {
    return invoke<ModelRegistryRecord[]>("load_model_registry");
  }

  return parseModelRegistry(globalThis.localStorage?.getItem(MODEL_REGISTRY_STORAGE_KEY) ?? null);
}

export async function saveModelRegistry(
  models: ModelRegistryRecord[],
): Promise<ModelRegistryRecord[]> {
  if (isTauriRuntime()) {
    return invoke<ModelRegistryRecord[]>("save_model_registry", { models });
  }

  globalThis.localStorage?.setItem(MODEL_REGISTRY_STORAGE_KEY, JSON.stringify(models));

  return models;
}

export async function discoverModelSources(): Promise<DiscoveredModelSource[]> {
  if (isTauriRuntime()) {
    return invoke<DiscoveredModelSource[]>("discover_model_sources");
  }

  return discoverModelSourcesInBrowser();
}

export async function fetchModelCatalog({
  providerKind,
  baseUrl,
  auth,
}: FetchModelCatalogInput): Promise<ModelCatalogEntry[]> {
  const apiKey = auth.type === "local" ? auth.apiKey : undefined;
  const apiKeyEnv = auth.type === "env" ? auth.envVar : undefined;

  if (isTauriRuntime()) {
    return invoke<ModelCatalogEntry[]>("fetch_model_catalog", {
      request: { providerKind, baseUrl, apiKey, apiKeyEnv },
    });
  }

  return fetchModelCatalogInBrowser({ providerKind, baseUrl, apiKey });
}

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in globalThis;
}

function parseModelRegistry(value: string | null): ModelRegistryRecord[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isModelRegistryRecord) : [];
  } catch {
    return [];
  }
}

function isModelRegistryRecord(value: unknown): value is ModelRegistryRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<ModelRegistryRecord>;

  return Boolean(
    record.id &&
      record.providerKind &&
      record.integrationMethod &&
      record.label &&
      record.modelId &&
      record.auth &&
      record.status &&
      record.createdAtIso &&
      record.updatedAtIso,
  );
}

async function discoverModelSourcesInBrowser() {
  const [ollama, lmStudio] = await Promise.all([
    probeBrowserProvider("ollama", "Ollama", "http://localhost:11434", "/api/tags"),
    probeBrowserProvider("lm-studio", "LM Studio", "http://localhost:1234/v1", "/models"),
  ]);

  return [ollama, lmStudio];
}

async function probeBrowserProvider(
  kind: "ollama" | "lm-studio",
  label: string,
  baseUrl: string,
  path: string,
): Promise<DiscoveredModelSource> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return {
        id: kind,
        kind,
        label,
        baseUrl,
        online: false,
        models: [],
        message: `HTTP ${response.status}`,
      };
    }

    const payload = await response.json();
    const models = kind === "ollama" ? readOllamaModels(payload) : readOpenAiModelList(payload);

    return { id: kind, kind, label, baseUrl, online: true, models };
  } catch (error) {
    return {
      id: kind,
      kind,
      label,
      baseUrl,
      online: false,
      models: [],
      message: error instanceof Error ? error.message : "Discovery unavailable",
    };
  }
}

async function fetchModelCatalogInBrowser({
  providerKind,
  baseUrl,
  apiKey,
}: {
  providerKind: ModelProviderKind;
  baseUrl?: string;
  apiKey?: string;
}) {
  const endpoint = getBrowserCatalogEndpoint(providerKind, baseUrl, apiKey);
  const headers: HeadersInit = { accept: "application/json" };

  if (
    apiKey &&
    providerKind !== "gemini" &&
    providerKind !== "anthropic" &&
    providerKind !== "hugging-face"
  ) {
    headers.authorization = `Bearer ${apiKey}`;
  }

  if (apiKey && providerKind === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  }

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    throw new Error(`Catalog request failed with HTTP ${response.status}.`);
  }

  return normalizeCatalogPayload(providerKind, await response.json());
}

function getBrowserCatalogEndpoint(
  providerKind: ModelProviderKind,
  baseUrl?: string,
  apiKey?: string,
) {
  if (providerKind === "hugging-face") {
    return "https://huggingface.co/api/models?inference_provider=all&pipeline_tag=text-generation&limit=100";
  }

  if (providerKind === "gemini") {
    const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : "";
    return `${trimTrailingSlash(baseUrl ?? "https://generativelanguage.googleapis.com/v1beta")}/models${keyParam}`;
  }

  const defaults: Partial<Record<ModelProviderKind, string>> = {
    openai: "https://api.openai.com/v1",
    openrouter: "https://openrouter.ai/api/v1",
    anthropic: "https://api.anthropic.com/v1",
    perplexity: "https://api.perplexity.ai/v1",
    mistral: "https://api.mistral.ai/v1",
    qwen: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    deepseek: "https://api.deepseek.com",
    "llama-meta": "https://api.llama.com/compat/v1",
    "manual-http": "http://localhost:8000/v1",
  };

  return `${trimTrailingSlash(baseUrl ?? defaults[providerKind] ?? "")}/models`;
}

function normalizeCatalogPayload(
  providerKind: ModelProviderKind,
  payload: unknown,
): ModelCatalogEntry[] {
  if (providerKind === "gemini" && isRecord(payload)) {
    return readGeminiModels(payload);
  }

  if (providerKind === "hugging-face" && Array.isArray(payload)) {
    return payload.map(readHuggingFaceModel).filter(isCatalogEntry);
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.map(readOpenAiCatalogModel).filter(isCatalogEntry);
  }

  if (isRecord(payload) && Array.isArray(payload.models)) {
    return payload.models.map(readGenericModel).filter(isCatalogEntry);
  }

  if (Array.isArray(payload)) {
    return payload.map(readGenericModel).filter(isCatalogEntry);
  }

  return [];
}

function readOllamaModels(payload: unknown): DiscoveredModel[] {
  if (!isRecord(payload) || !Array.isArray(payload.models)) {
    return [];
  }

  return payload.models
    .map((model): DiscoveredModel | null => {
      if (!isRecord(model) || typeof model.name !== "string") {
        return null;
      }

      return {
        id: model.name,
        label: model.name,
        sizeBytes: typeof model.size === "number" ? model.size : null,
        modifiedAt: typeof model.modified_at === "string" ? model.modified_at : null,
      } satisfies DiscoveredModel;
    })
    .filter((model): model is DiscoveredModel => model !== null);
}

function readOpenAiModelList(payload: unknown): DiscoveredModel[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return [];
  }

  return payload.data
    .map((model): DiscoveredModel | null => {
      if (!isRecord(model) || typeof model.id !== "string") {
        return null;
      }

      return {
        id: model.id,
        label: model.id,
      } satisfies DiscoveredModel;
    })
    .filter((model): model is DiscoveredModel => model !== null);
}

function readOpenAiCatalogModel(model: unknown): ModelCatalogEntry | null {
  if (!isRecord(model) || typeof model.id !== "string") {
    return null;
  }

  return {
    id: model.id,
    label:
      (typeof model.name === "string" && model.name) ||
      (typeof model.display_name === "string" && model.display_name) ||
      model.id,
    owner: typeof model.owned_by === "string" ? model.owned_by : null,
    contextWindow: typeof model.context_length === "number" ? model.context_length : null,
  };
}

function readGeminiModels(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.models)) {
    return [];
  }

  return payload.models.map(readGenericModel).filter(isCatalogEntry);
}

function readHuggingFaceModel(model: unknown): ModelCatalogEntry | null {
  if (!isRecord(model) || typeof model.id !== "string") {
    return null;
  }

  return {
    id: model.id,
    label: model.id,
    owner: typeof model.author === "string" ? model.author : null,
    contextWindow: null,
  };
}

function readGenericModel(model: unknown): ModelCatalogEntry | null {
  if (!isRecord(model)) {
    return null;
  }

  const id =
    (typeof model.id === "string" && model.id) ||
    (typeof model.name === "string" && model.name.replace(/^models\//, "")) ||
    "";

  if (!id) {
    return null;
  }

  return {
    id,
    label:
      (typeof model.displayName === "string" && model.displayName) ||
      (typeof model.display_name === "string" && model.display_name) ||
      id,
    owner:
      (typeof model.owned_by === "string" && model.owned_by) ||
      (typeof model.owner === "string" && model.owner) ||
      null,
    contextWindow:
      (typeof model.contextWindow === "number" && model.contextWindow) ||
      (typeof model.context_window === "number" && model.context_window) ||
      (typeof model.inputTokenLimit === "number" && model.inputTokenLimit) ||
      null,
  };
}

function isCatalogEntry(value: ModelCatalogEntry | null): value is ModelCatalogEntry {
  return value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}
