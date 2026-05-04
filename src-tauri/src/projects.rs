use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CloneRepositoryResult {
    pub local_path: String,
}

#[tauri::command]
pub fn pick_directory() -> Option<String> {
    rfd::FileDialog::new()
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn clone_repository(
    repo_url: String,
    destination_path: String,
) -> Result<CloneRepositoryResult, String> {
    let repo_url = repo_url.trim();
    let destination = PathBuf::from(destination_path.trim());

    if repo_url.is_empty() {
        return Err("Repository URL is required".to_string());
    }

    if destination.as_os_str().is_empty() {
        return Err("Destination path is required".to_string());
    }

    if destination.exists() {
        return Err("Destination path already exists".to_string());
    }

    if let Some(parent) = destination.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|error| format!("Unable to create destination directory: {error}"))?;
        }
    }

    let output = Command::new("git")
        .arg("clone")
        .arg(repo_url)
        .arg(&destination)
        .output()
        .map_err(|error| format!("Unable to run git clone command: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git clone failed: {stderr}"));
    }

    let canonical_destination = std::fs::canonicalize(&destination)
        .unwrap_or(destination)
        .to_string_lossy()
        .to_string();

    Ok(CloneRepositoryResult {
        local_path: canonical_destination,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clone_repository_rejects_empty_repo_url() {
        let result = clone_repository("   ".to_string(), "/tmp/mesh-test-repo".to_string());

        assert_eq!(result.unwrap_err(), "Repository URL is required");
    }

    #[test]
    fn clone_repository_rejects_empty_destination_path() {
        let result = clone_repository(
            "https://github.com/owner/repo.git".to_string(),
            "   ".to_string(),
        );

        assert_eq!(result.unwrap_err(), "Destination path is required");
    }
}
