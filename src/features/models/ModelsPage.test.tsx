import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDefaultModelInput, createModelRegistryRecord } from "@/domain/model-registry";
import { ModelsPage } from "@/features/models/ModelsPage";

describe("ModelsPage", () => {
  it("renders an empty registry without mock model data", () => {
    const html = renderToString(<ModelsPage disablePersistence initialModels={[]} />);

    expect(html).toContain("No models registered");
    expect(html).toContain("Add model");
    expect(html).not.toContain("GPT-5.5");
    expect(html).not.toContain("Worker Small");
  });

  it("renders registered model rows and selection details", () => {
    const model = createModelRegistryRecord(
      {
        ...createDefaultModelInput("openai"),
        label: "OpenAI primary",
        modelId: "gpt-5.2",
      },
      "2026-05-03T10:00:00.000Z",
      "model:openai",
    );
    const html = renderToString(<ModelsPage disablePersistence initialModels={[model]} />);

    expect(html).toContain("Model registry");
    expect(html).toContain("OpenAI primary");
    expect(html).toContain("gpt-5.2");
    expect(html).toContain("Ready");
    expect(html).toContain("Model detail");
  });
});
