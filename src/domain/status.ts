import type {
	AgentStatus,
	ModelStatus,
	ProjectStatus,
	RunStatus,
	WorkspaceStatus,
} from "@/domain/types";

export type StatusTone = "neutral" | "good" | "warning" | "danger" | "live";

export function getWorkspaceStatusLabel(status: WorkspaceStatus) {
	const labels: Record<WorkspaceStatus, string> = {
		local: "Local",
		syncing: "Syncing",
		attention: "Needs attention",
	};

	return labels[status];
}

export function getProjectStatusLabel(status: ProjectStatus) {
	const labels: Record<ProjectStatus, string> = {
		active: "Active",
		blocked: "Blocked",
		idle: "Idle",
	};

	return labels[status];
}

export function getRunStatusLabel(status: RunStatus) {
	const labels: Record<RunStatus, string> = {
		queued: "Queued",
		running: "Running",
		completed: "Completed",
		failed: "Failed",
	};

	return labels[status];
}

export function getAgentStatusLabel(status: AgentStatus) {
	const labels: Record<AgentStatus, string> = {
		available: "Available",
		busy: "Busy",
		disabled: "Disabled",
	};

	return labels[status];
}

export function getModelStatusLabel(status: ModelStatus) {
	const labels: Record<ModelStatus, string> = {
		online: "Online",
		offline: "Offline",
		limited: "Limited",
	};

	return labels[status];
}

export function getRunStatusTone(status: RunStatus): StatusTone {
	const tones: Record<RunStatus, StatusTone> = {
		queued: "neutral",
		running: "live",
		completed: "good",
		failed: "danger",
	};

	return tones[status];
}

export function getProjectStatusTone(status: ProjectStatus): StatusTone {
	const tones: Record<ProjectStatus, StatusTone> = {
		active: "good",
		blocked: "danger",
		idle: "neutral",
	};

	return tones[status];
}

export function getWorkspaceStatusTone(status: WorkspaceStatus): StatusTone {
	const tones: Record<WorkspaceStatus, StatusTone> = {
		local: "neutral",
		syncing: "live",
		attention: "warning",
	};

	return tones[status];
}
