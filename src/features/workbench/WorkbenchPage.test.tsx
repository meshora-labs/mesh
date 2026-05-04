import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkbenchPage } from "@/features/workbench/WorkbenchPage";
import { mockAgents, mockModelRegistry, mockProjects } from "@/mocks/mesh-fixtures";

describe("WorkbenchPage", () => {
  it("renders the desktop agent configuration and message console", () => {
    const html = renderToString(
      <WorkbenchPage agents={mockAgents} models={mockModelRegistry} projects={mockProjects} />,
    );

    expect(html).toContain("Agent profile");
    expect(html).toContain("Generation");
    expect(html).toContain("Reasoning effort");
    expect(html).toContain("Verbosity");
    expect(html).toContain("Summary");
    expect(html).toContain("JSON Schema");
    expect(html).toContain("Meshora built-in");
    expect(html).toContain("LLM built-in");
    expect(html).toContain("Functions");
    expect(html).toContain("System instruction");
    expect(html).toContain("Assistant prompt");
    expect(html).toContain("User prompt");
    expect(html).toContain("Auto follow");
    expect(html).toContain("Replay");
    expect(html).toContain("Debug logs");
    expect(html).toContain("Realtime");
    expect(html).toContain("Telemetry");
  });
});
