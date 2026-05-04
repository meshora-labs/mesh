import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunsPage } from "@/features/runs/RunsPage";
import { mockProjects, mockRuns } from "@/mocks/mesh-fixtures";

describe("RunsPage", () => {
  it("renders all planned run statuses", () => {
    const html = renderToString(<RunsPage projects={mockProjects} runs={mockRuns} />);

    expect(html).toContain("Queued");
    expect(html).toContain("Running");
    expect(html).toContain("Completed");
    expect(html).toContain("Failed");
  });
});
