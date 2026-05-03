import { FolderOpen, GitBranch } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatusDot } from "@/components/ui/status-dot";
import { Tabs } from "@/components/ui/tabs";
import {
	getProjectStatusLabel,
	getProjectStatusTone,
} from "@/domain/status";
import type { Project } from "@/domain/types";
import { ConnectProjectModal } from "@/features/projects/ConnectProjectModal";
import { formatRelativeTime } from "@/features/shared/format";

interface ProjectsPageProps {
	projects: Project[];
	selectedProjectId: string | null;
	onSelectProject: (projectId: string) => void;
	onAddLocalProject: (
		nameInput: string,
		localPathInput: string,
	) => Promise<Project | null>;
	onCloneGitProject: (
		nameInput: string,
		urlInput: string,
		destinationInput: string,
	) => Promise<Project | null>;
	onSelectDirectory: () => Promise<string | null>;
	connectingProject?: boolean;
	isCloning?: boolean;
	projectError?: string | null;
}

type ProjectFilter = "all" | "active" | "blocked";

const tabs = [
	{ id: "all", label: "All" },
	{ id: "active", label: "Active" },
	{ id: "blocked", label: "Blocked" },
] satisfies Array<{ id: ProjectFilter; label: string }>;

export function ProjectsPage({
	projects,
	selectedProjectId,
	onSelectProject,
	onAddLocalProject,
	onCloneGitProject,
	onSelectDirectory,
	connectingProject = false,
	isCloning = false,
	projectError = null,
}: ProjectsPageProps) {
	const [filter, setFilter] = useState<ProjectFilter>("all");
	const [connectModalOpen, setConnectModalOpen] = useState(false);
	const visibleProjects = projects.filter((project) => {
		if (filter === "all") {
			return true;
		}

		return project.status === filter;
	});
	const selectedProject =
		projects.find((project) => project.id === selectedProjectId) ??
		visibleProjects[0] ??
		null;

	const connectProjectButton = (
		<Button
			disabled={connectingProject}
			icon={<FolderOpen size={14} />}
			onClick={() => setConnectModalOpen(true)}
			size={projects.length > 0 ? "sm" : "md"}
		>
			Connect project
		</Button>
	);

	const connectProjectModal = (
		<ConnectProjectModal
			connectingProject={connectingProject}
			isCloning={isCloning}
			onAddLocalProject={onAddLocalProject}
			onCloneGitProject={onCloneGitProject}
			onOpenChange={setConnectModalOpen}
			onSelectDirectory={onSelectDirectory}
			open={connectModalOpen}
			projectError={projectError}
		/>
	);

	if (projects.length === 0) {
		return (
			<>
				<EmptyState
					action={<div className="action-stack">{connectProjectButton}</div>}
					description="Connect a local folder or Git repository to start orchestrating work."
					icon={<FolderOpen size={22} />}
					title="No projects connected"
				/>
				{connectProjectModal}
			</>
		);
	}

	return (
		<>
			<div className="split-grid">
				<Panel
					action={connectProjectButton}
					description="Dense local project inventory"
					title="Project registry"
				>
					{projectError && !connectModalOpen ? (
						<p className="inline-status">{projectError}</p>
					) : null}
					<Tabs items={tabs} onChange={setFilter} value={filter} />
					<div className="table-list" role="list">
						{visibleProjects.map((project) => (
							<button
								className={
									project.id === selectedProject?.id
										? "table-row is-selected"
										: "table-row"
								}
								key={project.id}
								onClick={() => onSelectProject(project.id)}
								type="button"
							>
								<span className="table-row__name">
									{project.source === "git" ? (
										<GitBranch size={16} />
									) : (
										<FolderOpen size={16} />
									)}
									<span>
										<strong>{project.name}</strong>
										<small>{project.path}</small>
									</span>
								</span>
								<span className="table-row__meta">
									<small>{formatRelativeTime(project.updatedAt)}</small>
									<Badge tone={getProjectStatusTone(project.status)}>
										{getProjectStatusLabel(project.status)}
									</Badge>
								</span>
							</button>
						))}
					</div>
				</Panel>

				<Panel description="Selection context" title="Project detail">
					{selectedProject ? (
						<div className="detail-stack">
							<div className="detail-header">
								<StatusDot tone={getProjectStatusTone(selectedProject.status)} />
								<div>
									<h2>{selectedProject.name}</h2>
									<p>{selectedProject.path}</p>
								</div>
							</div>
							<div className="property-grid">
								<span>Source</span>
								<strong>{selectedProject.source}</strong>
								<span>Status</span>
								<strong>{getProjectStatusLabel(selectedProject.status)}</strong>
								<span>Updated</span>
								<strong>{formatRelativeTime(selectedProject.updatedAt)}</strong>
							</div>
							<div className="button-row">
								<Button variant="primary">Create run</Button>
								<Button>Open context</Button>
							</div>
						</div>
					) : (
						<EmptyState
							description="Select a project to inspect its local state."
							title="No project selected"
						/>
					)}
				</Panel>
			</div>
			{connectProjectModal}
		</>
	);
}
