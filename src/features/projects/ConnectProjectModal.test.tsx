import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConnectProjectModal } from "@/features/projects/ConnectProjectModal";

describe("ConnectProjectModal", () => {
  it("renders the local project form when open", () => {
    const html = renderToString(
      <ConnectProjectModal
        onAddLocalProject={vi.fn()}
        onCloneGitProject={vi.fn()}
        onOpenChange={vi.fn()}
        onSelectDirectory={vi.fn()}
        open={true}
      />,
    );

    expect(html).toContain("Connect project");
    expect(html).toContain("Local folder");
    expect(html).toContain("Repository URL");
    expect(html).toContain("GitHub");
    expect(html).toContain("GitLab");
    expect(html).toContain("Bitbucket");
    expect(html).toContain("Azure DevOps");
    expect(html).toContain("Google Cloud");
    expect(html).toContain("AWS CodeCommit");
    expect(html).toContain("Local path");
    expect(html).toContain("Add local project");
  });
});
