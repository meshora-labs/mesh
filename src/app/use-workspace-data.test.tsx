// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MeshRepositories } from "@/data/repositories";
import type { Project, Run, Workspace } from "@/domain/types";
import { mockRuns, mockWorkspace } from "@/mocks/mesh-fixtures";
import { cloneRepository, pickDirectory } from "@/platform/projects";
import { useWorkspaceData } from "@/app/use-workspace-data";

vi.mock("@/platform/projects", () => ({
	cloneRepository: vi.fn(),
	pickDirectory: vi.fn(),
}));

const localProject: Project = {
	id: "project:local",
	name: "Local app",
	path: "/Users/test/local-app",
	source: "local",
	status: "active",
	updatedAt: "2026-05-03T10:00:00.000Z",
};

const gitProject: Project = {
	id: "project:git",
	name: "Git app",
	path: "/Users/test/git-app",
	repoUrl: "https://github.com/owner/repo.git",
	source: "git",
	status: "active",
	updatedAt: "2026-05-03T11:00:00.000Z",
};

function createRepositories({
	projects = [],
	runs = mockRuns,
	workspace = mockWorkspace,
}: {
	projects?: Project[];
	runs?: Run[];
	workspace?: Workspace;
} = {}) {
	return {
		workspaceRepository: {
			getCurrent: vi.fn().mockResolvedValue(workspace),
		},
		projectsRepository: {
			addGitProject: vi.fn().mockResolvedValue(gitProject),
			addLocalProject: vi.fn().mockResolvedValue(localProject),
			getById: vi.fn().mockResolvedValue(null),
			list: vi.fn().mockResolvedValue(projects),
		},
		runsRepository: {
			list: vi.fn().mockResolvedValue(runs),
			listByProject: vi.fn().mockResolvedValue([]),
		},
	} satisfies MeshRepositories;
}

function Harness({ repositories }: { repositories: MeshRepositories }) {
	const data = useWorkspaceData(repositories);
	const [selectedDirectory, setSelectedDirectory] = useState("none");

	async function selectDirectory() {
		setSelectedDirectory((await data.selectDirectory()) ?? "none");
	}

	return (
		<div>
			<span>{data.loading ? "loading" : "ready"}</span>
			<span>{data.workspace?.name ?? "no workspace"}</span>
			<span>{data.projectError ?? "no error"}</span>
			<span>{data.isCloning ? "cloning" : "not cloning"}</span>
			<span>{selectedDirectory}</span>
			<ProjectList>{data.projects.map((project) => project.name).join(",")}</ProjectList>
			<button onClick={() => void data.addLocalProject("", "/Users/test/local-app")} type="button">
				add local
			</button>
			<button onClick={() => void data.cloneGitProject("", "", "/Users/test/git-app")} type="button">
				clone missing url
			</button>
			<button
				onClick={() =>
					void data.cloneGitProject(
						"",
						"https://github.com/owner/repo.git",
						"/Users/test/git-app",
					)
				}
				type="button"
			>
				clone git
			</button>
			<button onClick={() => void selectDirectory()} type="button">
				select directory
			</button>
		</div>
	);
}

function ProjectList({ children }: { children: ReactNode }) {
	return <output aria-label="projects">{children}</output>;
}

describe("useWorkspaceData", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("loads workspace, projects, and runs on mount", async () => {
		const repositories = createRepositories({ projects: [localProject] });

		render(<Harness repositories={repositories} />);

		expect(screen.getByText("loading")).toBeTruthy();
		await screen.findByText("ready");

		expect(screen.getByText("Mesh Local")).toBeTruthy();
		expect(screen.getByLabelText("projects").textContent).toBe("Local app");
		expect(repositories.workspaceRepository.getCurrent).toHaveBeenCalledTimes(1);
		expect(repositories.projectsRepository.list).toHaveBeenCalledTimes(1);
		expect(repositories.runsRepository.list).toHaveBeenCalledTimes(1);
	});

	it("adds local projects into the loaded project list", async () => {
		const user = userEvent.setup();
		const repositories = createRepositories();

		render(<Harness repositories={repositories} />);
		await screen.findByText("ready");
		await user.click(screen.getByRole("button", { name: "add local" }));

		await screen.findByText("Local app");
		expect(repositories.projectsRepository.addLocalProject).toHaveBeenCalledWith({
			nameInput: "",
			localPathInput: "/Users/test/local-app",
		});
	});

	it("validates git clone input before calling the platform clone helper", async () => {
		const user = userEvent.setup();
		const repositories = createRepositories();
		const cloneRepositoryMock = vi.mocked(cloneRepository);

		render(<Harness repositories={repositories} />);
		await screen.findByText("ready");
		await user.click(screen.getByRole("button", { name: "clone missing url" }));

		expect(screen.getByText("L'URL Git est obligatoire.")).toBeTruthy();
		expect(cloneRepositoryMock).not.toHaveBeenCalled();
		expect(repositories.projectsRepository.addGitProject).not.toHaveBeenCalled();
	});

	it("clones git projects and registers the cloned local path", async () => {
		const user = userEvent.setup();
		const repositories = createRepositories();
		const cloneRepositoryMock = vi.mocked(cloneRepository).mockResolvedValue({
			localPath: "/Users/test/git-app",
		});

		render(<Harness repositories={repositories} />);
		await screen.findByText("ready");
		await user.click(screen.getByRole("button", { name: "clone git" }));

		await screen.findByText("Git app");
		expect(cloneRepositoryMock).toHaveBeenCalledWith({
			repoUrl: "https://github.com/owner/repo.git",
			destinationPath: "/Users/test/git-app",
		});
		expect(repositories.projectsRepository.addGitProject).toHaveBeenCalledWith({
			nameInput: "",
			localPathInput: "/Users/test/git-app",
			repoUrlInput: "https://github.com/owner/repo.git",
		});
	});

	it("returns selected directories through the platform picker", async () => {
		const user = userEvent.setup();
		vi.mocked(pickDirectory).mockResolvedValue("/Users/test/selected");

		render(<Harness repositories={createRepositories()} />);
		await screen.findByText("ready");
		await user.click(screen.getByRole("button", { name: "select directory" }));

		await screen.findByText("/Users/test/selected");
	});
});
