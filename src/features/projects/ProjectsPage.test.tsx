import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { mockProjects } from "@/mocks/mesh-fixtures";
import { ProjectsPage } from "@/features/projects/ProjectsPage";

describe("ProjectsPage", () => {
	it("renders project fixtures and selected state", () => {
		const html = renderToString(
				<ProjectsPage
					onAddLocalProject={vi.fn()}
					onCloneGitProject={vi.fn()}
					onSelectDirectory={vi.fn()}
					onSelectProject={vi.fn()}
					projects={mockProjects}
					selectedProjectId="project:reemx"
				/>,
		);

		expect(html).toContain("Project registry");
		expect(html).toContain("Reemx");
		expect(html).toContain("is-selected");
	});
});
