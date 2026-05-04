import { describe, expect, it } from "vitest";
import {
	createDefaultModelInput,
	createModelRegistryRecord,
	getModelRegistryStatus,
	hasUsableAuth,
	type ModelRegistryInput,
	normalizeModelInput,
	updateModelRegistryRecord,
	upsertModelRegistryRecord,
} from "@/domain/model-registry";

describe("model registry domain", () => {
  it("marks provider configs ready only when required auth is present", () => {
    const openaiInput = createDefaultModelInput("openai");

    expect(getModelRegistryStatus(openaiInput)).toBe("ready");
    expect(
      getModelRegistryStatus({
        ...openaiInput,
        auth: { type: "none" },
      }),
    ).toBe("needs-attention");
  });

  it("validates manual CLI command separately from HTTP endpoints", () => {
    const cliInput = createDefaultModelInput("manual-cli");

    expect(getModelRegistryStatus(cliInput)).toBe("ready");
    expect(
      getModelRegistryStatus({
        ...cliInput,
        command: "",
      }),
    ).toBe("needs-attention");
  });

	it("deduplicates records by provider, model, endpoint, and command", () => {
		const input: ModelRegistryInput = {
      providerKind: "manual-http",
      integrationMethod: "manual",
      label: "Local HTTP",
      modelId: "worker",
      baseUrl: "http://localhost:8000/v1",
      auth: { type: "none" },
    };
    const existing = createModelRegistryRecord(input, "2026-05-03T10:00:00.000Z", "model:existing");
    const result = upsertModelRegistryRecord(
      [existing],
      {
        ...input,
        label: "Local HTTP renamed",
        baseUrl: "http://localhost:8000/v1/",
      },
      "2026-05-03T11:00:00.000Z",
      () => "model:new",
    );

    expect(result.action).toBe("updated");
    expect(result.records).toHaveLength(1);
		expect(result.record.id).toBe("model:existing");
		expect(result.record.label).toBe("Local HTTP renamed");
	});

	it("normalizes user-entered fields before deriving status", () => {
		const input: ModelRegistryInput = {
			...createDefaultModelInput("manual-http"),
			label: "  Local HTTP  ",
			modelId: "  worker  ",
			baseUrl: "  http://localhost:8000/v1  ",
			auth: { type: "local", apiKey: "  key  " },
			source: "  manual  ",
		};

		expect(normalizeModelInput(input)).toEqual({
			providerKind: "manual-http",
			integrationMethod: "manual",
			label: "Local HTTP",
			modelId: "worker",
			baseUrl: "http://localhost:8000/v1",
			command: undefined,
			args: undefined,
			auth: { type: "local", apiKey: "key" },
			source: "manual",
		});
		expect(getModelRegistryStatus(input)).toBe("ready");
	});

	it("preserves creation metadata while updating records", () => {
		const current = createModelRegistryRecord(
			createDefaultModelInput("openai"),
			"2026-05-03T10:00:00.000Z",
			"model:openai",
		);

		const updated = updateModelRegistryRecord(
			current,
			{
				...createDefaultModelInput("openai"),
				label: "OpenAI updated",
				modelId: "",
			},
			"2026-05-03T11:00:00.000Z",
		);

		expect(updated.id).toBe("model:openai");
		expect(updated.createdAtIso).toBe("2026-05-03T10:00:00.000Z");
		expect(updated.updatedAtIso).toBe("2026-05-03T11:00:00.000Z");
		expect(updated.status).toBe("needs-attention");
	});

	it("creates a new record when the registry identity changes", () => {
		const existing = createModelRegistryRecord(
			{
				...createDefaultModelInput("manual-cli"),
				command: "codex",
				args: "--model gpt-5.2",
			},
			"2026-05-03T10:00:00.000Z",
			"model:existing",
		);

		const result = upsertModelRegistryRecord(
			[existing],
			{
				...createDefaultModelInput("manual-cli"),
				command: "codex",
				args: "--model gpt-5.4",
			},
			"2026-05-03T11:00:00.000Z",
			() => "model:new",
		);

		expect(result.action).toBe("created");
		expect(result.records).toHaveLength(2);
		expect(result.record.id).toBe("model:new");
	});

	it("accepts only non-empty env and local auth credentials", () => {
		expect(hasUsableAuth({ type: "none" })).toBe(false);
		expect(hasUsableAuth({ type: "env", envVar: "  " })).toBe(false);
		expect(hasUsableAuth({ type: "env", envVar: "OPENAI_API_KEY" })).toBe(true);
		expect(hasUsableAuth({ type: "local", apiKey: "  " })).toBe(false);
		expect(hasUsableAuth({ type: "local", apiKey: "sk-test" })).toBe(true);
	});
});
