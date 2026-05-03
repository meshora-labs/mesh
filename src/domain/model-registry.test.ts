import { describe, expect, it } from "vitest";
import {
	createDefaultModelInput,
	createModelRegistryRecord,
	getModelRegistryStatus,
	upsertModelRegistryRecord,
	type ModelRegistryInput,
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
		const existing = createModelRegistryRecord(
			input,
			"2026-05-03T10:00:00.000Z",
			"model:existing",
		);
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
});
