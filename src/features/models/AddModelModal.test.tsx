import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AddModelModal } from "@/features/models/AddModelModal";

describe("AddModelModal", () => {
	it("renders discovery, built-in, and manual model methods", () => {
		const html = renderToString(
			<AddModelModal
				discoverySources={[
					{
						id: "ollama",
						kind: "ollama",
						label: "Ollama",
						baseUrl: "http://localhost:11434",
						online: true,
						models: [{ id: "llama3.2", label: "llama3.2" }],
					},
				]}
				discoveryStatus="1 source, 1 model."
				onDiscover={vi.fn()}
				onFetchCatalog={vi.fn().mockResolvedValue([])}
				onOpenChange={vi.fn()}
				onSave={vi.fn()}
				open={true}
			/>,
		);

		expect(html).toContain("Add model");
		expect(html).toContain("Ollama");
		expect(html).toContain("LM Studio");
		expect(html).toContain("Docker");
		expect(html).toContain("OpenAI");
		expect(html).toContain("OpenRouter");
		expect(html).toContain("Anthropic");
		expect(html).toContain("Perplexity");
		expect(html).toContain("Mistral");
		expect(html).toContain("Qwen");
		expect(html).toContain("DeepSeek");
		expect(html).toContain("Llama / Meta");
		expect(html).toContain("Hugging Face");
		expect(html).toContain("Gemini / Google");
		expect(html).toContain("HTTP config");
		expect(html).toContain("Local CLI");
		expect(html).toContain("Save model");
	});
});
