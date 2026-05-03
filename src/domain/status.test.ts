import { describe, expect, it } from "vitest";
import {
	getProjectStatusLabel,
	getProjectStatusTone,
	getRunStatusLabel,
	getRunStatusTone,
	getWorkspaceStatusLabel,
	getWorkspaceStatusTone,
} from "@/domain/status";

describe("status normalization", () => {
	it("maps workspace statuses to stable labels and tones", () => {
		expect(getWorkspaceStatusLabel("local")).toBe("Local");
		expect(getWorkspaceStatusTone("syncing")).toBe("live");
		expect(getWorkspaceStatusTone("attention")).toBe("warning");
	});

	it("maps project statuses to stable labels and tones", () => {
		expect(getProjectStatusLabel("active")).toBe("Active");
		expect(getProjectStatusTone("blocked")).toBe("danger");
		expect(getProjectStatusTone("idle")).toBe("neutral");
	});

	it("maps run statuses to stable labels and tones", () => {
		expect(getRunStatusLabel("queued")).toBe("Queued");
		expect(getRunStatusTone("running")).toBe("live");
		expect(getRunStatusTone("completed")).toBe("good");
		expect(getRunStatusTone("failed")).toBe("danger");
	});
});
