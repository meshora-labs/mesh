import { invoke } from "@tauri-apps/api/core";

export interface CloneRepositoryPayload {
	repoUrl: string;
	destinationPath: string;
}

export interface CloneRepositoryResult {
	localPath: string;
}

export async function pickDirectory(): Promise<string | null> {
	if ("__TAURI_INTERNALS__" in window) {
		return invoke<string | null>("pick_directory");
	}

	// Prefer the File System Access API when available in modern browsers.
	// Note: the File System Access API does not expose a full filesystem path
	// for security reasons. We return the directory name as a best-effort
	// user-facing representation and fall back to a prompt when not available.
	try {
		const globalAny = globalThis as any;

		if (typeof globalAny.showDirectoryPicker === "function") {
			const handle = await globalAny.showDirectoryPicker();

			if (handle && typeof handle.name === "string") {
				return handle.name;
			}

			// If the handle doesn't expose a name, fall back to prompt behavior.
		}
	} catch (err) {
		// If the user cancels the directory picker or the API throws,
		// swallow and fall back to the prompt below.
	}

	return window.prompt("Project folder path");
}

export async function cloneRepository(
	payload: CloneRepositoryPayload,
): Promise<CloneRepositoryResult> {
	const repoUrl = payload.repoUrl.trim();
	const destinationPath = payload.destinationPath.trim();

	if (!repoUrl) {
		throw new Error("L'URL Git est obligatoire.");
	}

	if (!destinationPath) {
		throw new Error("Le chemin de destination est obligatoire.");
	}

	if ("__TAURI_INTERNALS__" in window) {
		return invoke<CloneRepositoryResult>("clone_repository", {
			repoUrl: payload.repoUrl,
			destinationPath: payload.destinationPath,
		});
	}

	// Browser / web fallback:
	// Try a cheap heuristic: if the URL looks like a GitHub/GitLab repo, attempt
	// to fetch an archive as a quick existence check. This is best-effort and
	// will silently fall back to a simulated clone when network/CORS prevents
	// access. The function always returns the intended destination path for
	// the UI to proceed as if the repo was cloned.
	try {
		const globalAny = globalThis as any;

		// Only attempt network check if `fetch` is available.
		if (typeof globalAny.fetch === "function") {
			let archiveUrl: string | null = null;

			try {
				const url = new URL(repoUrl.replace(/\.git$/, ""));

				if (url.hostname.endsWith("github.com")) {
					// Try the default `main` branch archive as a heuristic.
					archiveUrl = `${url.origin}${url.pathname.replace(/\/$/, "")}/archive/refs/heads/main.zip`;
				} else if (url.hostname.endsWith("gitlab.com")) {
					// GitLab also exposes project archive endpoint.
					archiveUrl = `${url.origin}${url.pathname.replace(/\/$/, "")}/-/archive/main/${url.pathname.split("/").pop() || "archive"}.zip`;
				}
			} catch {
				archiveUrl = null;
			}

			if (archiveUrl) {
				try {
					const res = await globalAny.fetch(archiveUrl, { method: "HEAD" });

					if (res && (res.ok || res.status === 200)) {
						// quick success — pretend we cloned into destinationPath
						return { localPath: destinationPath };
					}
				} catch {
					// ignore network/CORS errors and fall back to simulated clone
				}
			}
		}
	} catch {
		// ignore and fallback to simulated clone
	}

	// Simulate a clone delay for web preview / tests.
	await new Promise((resolve) => setTimeout(resolve, 250));

	return {
		localPath: destinationPath,
	};
}
