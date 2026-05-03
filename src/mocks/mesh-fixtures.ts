import type {
	AgentProfile,
	ModelProfile,
	Project,
	Run,
	Workspace,
} from "@/domain/types";

export const mockWorkspace: Workspace = {
	id: "workspace:mesh-local",
	name: "Mesh Local",
	rootPath: "/Users/shayn/Development/mesh",
	status: "local",
};

export const mockProjects: Project[] = [
	{
		id: "project:mesh",
		name: "Mesh",
		path: "/Users/shayn/Development/mesh",
		source: "local",
		status: "active",
		updatedAt: "2026-05-02T08:30:00.000Z",
	},
	{
		id: "project:reemx",
		name: "Reemx",
		path: "/Users/shayn/Development/reemx",
		source: "git",
		status: "active",
		updatedAt: "2026-05-01T19:12:00.000Z",
	},
	{
		id: "project:meshora",
		name: "Meshora",
		path: "/Users/shayn/Development/meshora",
		source: "local",
		status: "idle",
		updatedAt: "2026-04-30T15:45:00.000Z",
	},
	{
		id: "project:launch",
		name: "Launch System",
		path: "/Users/shayn/Development/launch-system",
		source: "git",
		status: "blocked",
		updatedAt: "2026-04-29T11:05:00.000Z",
	},
];

export const mockRuns: Run[] = [
	{
		id: "run:001",
		projectId: "project:mesh",
		title: "Rebuild desktop workbench foundation",
		status: "running",
		agent: "Planner",
		model: "GPT-5.5",
		startedAt: "2026-05-02T08:42:00.000Z",
		durationMs: 1380000,
		costEstimate: 1.42,
	},
	{
		id: "run:002",
		projectId: "project:reemx",
		title: "Generate trial activation checklist",
		status: "completed",
		agent: "Product Operator",
		model: "GPT-5.4",
		startedAt: "2026-05-01T17:08:00.000Z",
		durationMs: 2480000,
		costEstimate: 0.88,
	},
	{
		id: "run:003",
		projectId: "project:meshora",
		title: "Inspect extension capability contracts",
		status: "queued",
		agent: "Code Explorer",
		model: "GPT-5.4 Mini",
		startedAt: "2026-05-02T09:10:00.000Z",
		durationMs: 0,
		costEstimate: 0.18,
	},
	{
		id: "run:004",
		projectId: "project:launch",
		title: "Validate analytics migration plan",
		status: "failed",
		agent: "Verifier",
		model: "GPT-5.4",
		startedAt: "2026-04-30T10:20:00.000Z",
		durationMs: 720000,
		costEstimate: 0.36,
	},
];

export const mockAgents: AgentProfile[] = [
	{
		id: "agent:planner",
		name: "Planner",
		role: "Turns intent into scoped work packages.",
		status: "available",
	},
	{
		id: "agent:operator",
		name: "Product Operator",
		role: "Keeps project direction and release gates aligned.",
		status: "busy",
	},
	{
		id: "agent:verifier",
		name: "Verifier",
		role: "Checks acceptance criteria and risk before release.",
		status: "available",
	},
];

export const mockModels: ModelProfile[] = [
	{
		id: "model:gpt-5-5",
		provider: "OpenAI",
		name: "GPT-5.5",
		capabilities: ["planning", "coding", "review"],
		status: "online",
	},
	{
		id: "model:gpt-5-4",
		provider: "OpenAI",
		name: "GPT-5.4",
		capabilities: ["execution", "analysis"],
		status: "online",
	},
	{
		id: "model:local-worker",
		provider: "Local",
		name: "Worker Small",
		capabilities: ["summaries", "classification"],
		status: "limited",
	},
];
