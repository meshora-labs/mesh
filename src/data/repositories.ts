import type {
	AddGitProjectInput,
	AddLocalProjectInput,
	Project,
	Run,
	Workspace,
} from "@/domain/types";
import { mockProjects, mockRuns, mockWorkspace } from "@/mocks/mesh-fixtures";

export interface WorkspaceRepository {
	getCurrent(): Promise<Workspace>;
}

export interface ProjectsRepository {
	list(): Promise<Project[]>;
	getById(projectId: string): Promise<Project | null>;
	addLocalProject(input: AddLocalProjectInput): Promise<Project>;
	addGitProject(input: AddGitProjectInput): Promise<Project>;
}

export interface RunsRepository {
	list(): Promise<Run[]>;
	listByProject(projectId: string): Promise<Run[]>;
}

export interface MeshRepositories {
	workspaceRepository: WorkspaceRepository;
	projectsRepository: ProjectsRepository;
	runsRepository: RunsRepository;
}

const clone = <T>(value: T): T => structuredClone(value);

function getLastPathSegment(path: string) {
	const segments = path.split(/[\\/]/).filter(Boolean);
	return segments.at(-1) ?? "";
}

function createProjectId() {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function assertUniqueProjectPath(projects: Project[], path: string) {
	if (projects.some((project) => project.path === path)) {
		throw new Error("Ce projet local existe deja.");
	}
}

export function createMockRepositories(): MeshRepositories {
	const workspace = clone(mockWorkspace);
	const projects = clone(mockProjects);
	const runs = clone(mockRuns);

	return {
		workspaceRepository: {
			async getCurrent() {
				return clone(workspace);
			},
		},
		projectsRepository: {
			async list() {
				return clone(projects);
			},
			async getById(projectId) {
				return clone(
					projects.find((project) => project.id === projectId) ?? null,
				);
			},
			async addLocalProject(input) {
				const localPath = input.localPathInput.trim();

				if (!localPath) {
					throw new Error("Le chemin local est obligatoire.");
				}

				assertUniqueProjectPath(projects, localPath);

				const project: Project = {
					id: createProjectId(),
					name:
						input.nameInput.trim() ||
						getLastPathSegment(localPath) ||
						"Projet local",
					path: localPath,
					source: "local",
					status: "active",
					updatedAt: new Date().toISOString(),
				};

				projects.push(project);

				return clone(project);
			},
			async addGitProject(input) {
				const localPath = input.localPathInput.trim();
				const repoUrl = input.repoUrlInput.trim();

				if (!repoUrl) {
					throw new Error("L'URL Git est obligatoire.");
				}

				if (!localPath) {
					throw new Error("Le chemin de destination est obligatoire.");
				}

				assertUniqueProjectPath(projects, localPath);

				const project: Project = {
					id: createProjectId(),
					name:
						input.nameInput.trim() ||
						getLastPathSegment(localPath) ||
						getLastPathSegment(repoUrl).replace(/\.git$/, "") ||
						"Projet Git",
					path: localPath,
					source: "git",
					repoUrl,
					status: "active",
					updatedAt: new Date().toISOString(),
				};

				projects.push(project);

				return clone(project);
			},
		},
		runsRepository: {
			async list() {
				return clone(runs);
			},
			async listByProject(projectId) {
				return clone(runs.filter((run) => run.projectId === projectId));
			},
		},
	};
}
