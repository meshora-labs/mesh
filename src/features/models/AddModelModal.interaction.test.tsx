// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddModelModal } from "@/features/models/AddModelModal";

function renderModal(overrides: Partial<Parameters<typeof AddModelModal>[0]> = {}) {
	const props: Parameters<typeof AddModelModal>[0] = {
		discoverySources: [
			{
				id: "ollama",
				kind: "ollama",
				label: "Ollama",
				baseUrl: "http://localhost:11434",
				online: true,
				models: [{ id: "llama3.2:latest", label: "llama3.2:latest" }],
			},
		],
		discoveryStatus: "1 source, 1 model.",
		onDiscover: vi.fn(),
		onFetchCatalog: vi.fn().mockResolvedValue([]),
		onOpenChange: vi.fn(),
		onSave: vi.fn().mockResolvedValue(true),
		open: true,
		...overrides,
	};

	render(<AddModelModal {...props} />);

	return props;
}

describe("AddModelModal interactions", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("uses a discovered Ollama model and submits the normalized provider input", async () => {
		const user = userEvent.setup();
		const props = renderModal();

		await user.click(screen.getByRole("button", { name: /Ollama/ }));
		await user.click(screen.getByRole("button", { name: "Use" }));
		await user.click(screen.getByRole("button", { name: "Save model" }));

		expect(props.onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				providerKind: "ollama",
				integrationMethod: "auto-discovery",
				label: "Ollama",
				modelId: "llama3.2:latest",
				baseUrl: "http://localhost:11434",
				auth: { type: "none" },
				source: "ollama",
			}),
		);
		await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false));
	});

	it("loads a provider catalog and applies the selected model id", async () => {
		const user = userEvent.setup();
		const onFetchCatalog = vi.fn().mockResolvedValue([
			{
				id: "gpt-test",
				label: "GPT Test",
				owner: "openai",
				contextWindow: 128000,
			},
		]);
		const props = renderModal({ onFetchCatalog });

		await user.click(screen.getByRole("button", { name: "Load" }));
		await screen.findByText("gpt-test");
		await user.click(screen.getByRole("button", { name: "Use" }));

		expect((screen.getByLabelText("Model ID") as HTMLInputElement).value).toBe("gpt-test");

		await user.click(screen.getByRole("button", { name: "Save model" }));

		expect(onFetchCatalog).toHaveBeenCalledWith(
			expect.objectContaining({
				providerKind: "openai",
				baseUrl: "https://api.openai.com/v1",
			}),
		);
		expect(props.onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				label: "OpenAI / GPT Test",
				modelId: "gpt-test",
			}),
		);
	});
});
