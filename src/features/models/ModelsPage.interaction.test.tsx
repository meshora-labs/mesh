// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultModelInput, createModelRegistryRecord } from "@/domain/model-registry";
import { ModelsPage } from "@/features/models/ModelsPage";

const openAiModel = createModelRegistryRecord(
	{
		...createDefaultModelInput("openai"),
		label: "OpenAI primary",
		modelId: "gpt-5.2",
	},
	"2026-05-03T10:00:00.000Z",
	"model:openai",
);

const ollamaModel = createModelRegistryRecord(
	{
		...createDefaultModelInput("ollama"),
		label: "Ollama local",
		modelId: "llama3.2:latest",
	},
	"2026-05-03T11:00:00.000Z",
	"model:ollama",
);

describe("ModelsPage interactions", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("filters registered models and shows an empty result state", async () => {
		const user = userEvent.setup();
		render(<ModelsPage disablePersistence initialModels={[openAiModel, ollamaModel]} />);
		const searchInput = screen.getByPlaceholderText("Search provider, model, endpoint");

		await user.type(searchInput, "ollama");

		expect(screen.getByText("Ollama local")).toBeTruthy();

		await user.clear(searchInput);
		await user.type(searchInput, "missing");

		expect(screen.getByText("No matches")).toBeTruthy();
	});

	it("updates the selected model in the in-memory registry", async () => {
		const user = userEvent.setup();
		render(<ModelsPage disablePersistence initialModels={[openAiModel]} />);

		await user.clear(screen.getByLabelText("Name"));
		await user.type(screen.getByLabelText("Name"), "Renamed OpenAI");
		await user.click(screen.getByRole("button", { name: "Save changes" }));

		await waitFor(() => expect(screen.getByText("Model updated.")).toBeTruthy());
		expect(screen.getAllByText("Renamed OpenAI").length).toBeGreaterThan(0);
	});

	it("honors delete confirmation before removing a model", async () => {
		const user = userEvent.setup();
		const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
		render(<ModelsPage disablePersistence initialModels={[openAiModel, ollamaModel]} />);

		await user.click(screen.getByRole("button", { name: "Delete" }));

		expect(confirmSpy).toHaveBeenCalledWith('Delete model "OpenAI primary"?');
		expect(screen.getAllByText("OpenAI primary").length).toBeGreaterThan(0);

		await user.click(screen.getByRole("button", { name: "Delete" }));

		await waitFor(() => expect(screen.getByText("Model deleted.")).toBeTruthy());
		expect(screen.queryAllByText("OpenAI primary")).toHaveLength(0);
		expect(screen.getAllByText("Ollama local").length).toBeGreaterThan(0);
	});
});
