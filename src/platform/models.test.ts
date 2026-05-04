import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createDefaultModelInput,
	createModelRegistryRecord,
	type ModelRegistryRecord,
} from "@/domain/model-registry";
import {
	discoverModelSources,
	fetchModelCatalog,
	loadModelRegistry,
	saveModelRegistry,
} from "@/platform/models";

const registryStorageKey = "mesh.model.registry";

function stubLocalStorage(getItem: ReturnType<typeof vi.fn>) {
	const setItem = vi.fn();

	vi.stubGlobal("localStorage", {
		getItem,
		setItem,
	} as unknown as Storage);

	return { setItem };
}

function createRegistryRecord(): ModelRegistryRecord {
	return createModelRegistryRecord(
		{
			...createDefaultModelInput("openai"),
			label: "OpenAI primary",
			modelId: "gpt-5.2",
		},
		"2026-05-03T10:00:00.000Z",
		"model:openai",
	);
}

function createJsonResponse(payload: unknown, init?: Partial<Response>) {
	return {
		ok: init?.ok ?? true,
		status: init?.status ?? 200,
		json: vi.fn().mockResolvedValue(payload),
	} as unknown as Response;
}

describe("platform model utilities", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("loads only valid model registry records from browser storage", async () => {
		const record = createRegistryRecord();
		stubLocalStorage(vi.fn(() => JSON.stringify([record, { id: "incomplete" }])));

		await expect(loadModelRegistry()).resolves.toEqual([record]);
	});

	it("treats missing or malformed browser registry storage as empty", async () => {
		const getItem = vi.fn<() => string | null>(() => "{not-json");
		stubLocalStorage(getItem);

		await expect(loadModelRegistry()).resolves.toEqual([]);

		getItem.mockReturnValue(null);

		await expect(loadModelRegistry()).resolves.toEqual([]);
	});

	it("saves model registry records to browser storage", async () => {
		const record = createRegistryRecord();
		const { setItem } = stubLocalStorage(vi.fn(() => null));

		await expect(saveModelRegistry([record])).resolves.toEqual([record]);
		expect(setItem).toHaveBeenCalledWith(registryStorageKey, JSON.stringify([record]));
	});

	it("discovers browser Ollama models and reports offline providers", async () => {
		const fetchMock = vi.fn((url: string | URL | Request) => {
			const endpoint = String(url);

			if (endpoint === "http://localhost:11434/api/tags") {
				return Promise.resolve(
					createJsonResponse({
						models: [
							{
								name: "llama3.2:latest",
								size: 123,
								modified_at: "2026-05-03T10:00:00.000Z",
							},
						],
					}),
				);
			}

			return Promise.resolve(createJsonResponse({}, { ok: false, status: 503 }));
		});
		vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

		const sources = await discoverModelSources();

		expect(sources).toHaveLength(2);
		expect(sources[0]).toMatchObject({
			id: "ollama",
			kind: "ollama",
			online: true,
			models: [
				{
					id: "llama3.2:latest",
					label: "llama3.2:latest",
					sizeBytes: 123,
					modifiedAt: "2026-05-03T10:00:00.000Z",
				},
			],
		});
		expect(sources[1]).toMatchObject({
			id: "lm-studio",
			kind: "lm-studio",
			online: false,
			message: "HTTP 503",
		});
	});

	it("fetches OpenAI-compatible catalogs with bearer auth and normalized entries", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			createJsonResponse({
				data: [
					{
						id: "gpt-5.2",
						display_name: "GPT-5.2",
						owned_by: "openai",
						context_length: 200000,
					},
					{ object: "not-a-model" },
				],
			}),
		);
		vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

		const entries = await fetchModelCatalog({
			providerKind: "openai",
			baseUrl: "https://api.openai.com/v1/",
			auth: { type: "local", apiKey: "sk-test" },
		});

		expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/models", {
			headers: {
				accept: "application/json",
				authorization: "Bearer sk-test",
			},
		});
		expect(entries).toEqual([
			{
				id: "gpt-5.2",
				label: "GPT-5.2",
				owner: "openai",
				contextWindow: 200000,
			},
		]);
	});

	it("uses provider-specific catalog endpoints and headers", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			createJsonResponse({
				models: [
					{
						name: "models/gemini-2.0-flash",
						displayName: "Gemini 2.0 Flash",
						inputTokenLimit: 1048576,
					},
				],
			}),
		);
		vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

		await expect(
			fetchModelCatalog({
				providerKind: "gemini",
				baseUrl: "https://generativelanguage.googleapis.com/v1beta/",
				auth: { type: "local", apiKey: "abc 123" },
			}),
		).resolves.toEqual([
			{
				id: "gemini-2.0-flash",
				label: "Gemini 2.0 Flash",
				owner: null,
				contextWindow: 1048576,
			},
		]);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://generativelanguage.googleapis.com/v1beta/models?key=abc%20123",
			{ headers: { accept: "application/json" } },
		);

		fetchMock.mockResolvedValue(createJsonResponse({ data: [] }));

		await fetchModelCatalog({
			providerKind: "anthropic",
			baseUrl: "https://api.anthropic.com/v1",
			auth: { type: "local", apiKey: "anthropic-key" },
		});

		expect(fetchMock).toHaveBeenLastCalledWith("https://api.anthropic.com/v1/models", {
			headers: {
				accept: "application/json",
				"anthropic-version": "2023-06-01",
				"x-api-key": "anthropic-key",
			},
		});
	});
});
