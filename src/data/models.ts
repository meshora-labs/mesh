import { invoke } from "@tauri-apps/api/core";

// Based on `old/src/lib/llm-discovery.ts`

export interface LlmDiscoveredModel {
	id: string;
	label: string;
	sizeBytes?: number | null;
	modifiedAt?: string | null;
}

export interface LlmDiscoveredProvider {
	// kind: Extract<LlmClientKind, "ollama" | "lm-studio">; // LlmClientKind is not defined in the new structure yet
	kind: "ollama" | "lm-studio";
	name: string;
	baseUrl: string;
	online: boolean;
	models: LlmDiscoveredModel[];
	message?: string | null;
}

export async function discoverLocalLlmProviders() {
	return invoke<LlmDiscoveredProvider[]>("discover_local_llm_providers");
}
