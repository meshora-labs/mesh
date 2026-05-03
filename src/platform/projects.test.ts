import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cloneRepository, pickDirectory } from "@/platform/projects";

describe("platform project utilities", () => {
	let promptSpy: ReturnType<typeof vi.spyOn> | null = null;

	beforeEach(() => {
		vi.stubGlobal("window", { prompt: vi.fn(() => null) } as any);
		promptSpy = vi.spyOn(globalThis.window as any, "prompt").mockImplementation(() => null);
	});

	afterEach(() => {
		if (promptSpy) {
			promptSpy.mockRestore();
		}
		vi.unstubAllGlobals();
	});

	it("returns a selected directory from the browser fallback", async () => {
		promptSpy!.mockImplementation(() => "/Users/test/project");

		const directory = await pickDirectory();

		expect(directory).toBe("/Users/test/project");
	});

	it("returns null when directory selection is cancelled", async () => {
		promptSpy!.mockImplementation(() => null);

		const directory = await pickDirectory();

		expect(directory).toBeNull();
	});

	it("mocks git clone in browser fallback", async () => {
		const result = await cloneRepository({
			repoUrl: "https://github.com/owner/repo.git",
			destinationPath: "/Users/test/repo",
		});

		expect(result).toEqual({ localPath: "/Users/test/repo" });
	});

	it("throws when git URL is empty", async () => {
		await expect(
			cloneRepository({ repoUrl: "", destinationPath: "/Users/test/repo" }),
		).rejects.toThrow("L'URL Git est obligatoire.");
	});

	it("throws when destination path is empty", async () => {
		await expect(
			cloneRepository({ repoUrl: "https://github.com/owner/repo.git", destinationPath: "" }),
		).rejects.toThrow("Le chemin de destination est obligatoire.");
	});
});
