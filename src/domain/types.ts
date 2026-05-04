export type WorkspaceStatus = "local" | "syncing" | "attention";

export interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  status: WorkspaceStatus;
}

export type ProjectSource = "local" | "git";
export type ProjectStatus = "active" | "blocked" | "idle";

export interface Project {
  id: string;
  name: string;
  path: string;
  source: ProjectSource;
  repoUrl?: string;
  status: ProjectStatus;
  updatedAt: string;
}

export interface AddLocalProjectInput {
  nameInput: string;
  localPathInput: string;
}

export interface CloneGitProjectInput {
  nameInput: string;
  urlInput: string;
  destinationInput: string;
}

export interface AddGitProjectInput {
  nameInput: string;
  localPathInput: string;
  repoUrlInput: string;
}

export type RunStatus = "queued" | "running" | "completed" | "failed";

export interface Run {
  id: string;
  projectId: string;
  title: string;
  status: RunStatus;
  agent: string;
  model: string;
  startedAt: string;
  durationMs: number;
  costEstimate: number;
}

export type AgentStatus = "available" | "busy" | "disabled";

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
}

export type ModelStatus = "online" | "offline" | "limited";

export interface ModelProfile {
  id: string;
  provider: string;
  name: string;
  capabilities: string[];
  status: ModelStatus;
}
