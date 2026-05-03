import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatusDot } from "@/components/ui/status-dot";
import {
	getProjectStatusLabel,
	getProjectStatusTone,
	getRunStatusLabel,
	getRunStatusTone,
} from "@/domain/status";
import type { Project, Run, Workspace } from "@/domain/types";
import { formatCurrency, formatDuration } from "@/features/shared/format";

interface CommandCenterPageProps {
	workspace: Workspace | null;
	projects: Project[];
	runs: Run[];
	loading: boolean;
}

export function CommandCenterPage({
	workspace,
	projects,
	runs,
	loading,
}: CommandCenterPageProps) {
	const activeProjects = projects.filter((project) => project.status === "active");
	const activeRuns = runs.filter((run) => run.status === "running");
	const completedRuns = runs.filter((run) => run.status === "completed");
	const totalCost = runs.reduce((sum, run) => sum + run.costEstimate, 0);

	if (loading && !workspace) {
		return (
			<EmptyState
				description="Mesh is preparing the local workbench state."
				icon={<Clock3 size={22} />}
				title="Loading workspace"
			/>
		);
	}

	return (
		<div className="page-stack">
			<section className="metric-strip" aria-label="Workspace metrics">
				<div className="metric">
					<span>Projects</span>
					<strong>{projects.length}</strong>
					<small>{activeProjects.length} active</small>
				</div>
				<div className="metric">
					<span>Runs</span>
					<strong>{runs.length}</strong>
					<small>{activeRuns.length} running</small>
				</div>
				<div className="metric">
					<span>Completed</span>
					<strong>{completedRuns.length}</strong>
					<small>last execution window</small>
				</div>
				<div className="metric">
					<span>Estimate</span>
					<strong>{formatCurrency(totalCost)}</strong>
					<small>mocked local cost</small>
				</div>
			</section>

			<div className="two-column-grid">
				<Panel
					description={workspace?.rootPath ?? "Local workspace"}
					title="Active projects"
				>
					<div className="dense-list">
						{projects.slice(0, 4).map((project) => (
							<div className="dense-row" key={project.id}>
								<div className="dense-row__main">
									<StatusDot tone={getProjectStatusTone(project.status)} />
									<div>
										<strong>{project.name}</strong>
										<span>{project.path}</span>
									</div>
								</div>
								<Badge tone={getProjectStatusTone(project.status)}>
									{getProjectStatusLabel(project.status)}
								</Badge>
							</div>
						))}
					</div>
				</Panel>

				<Panel
					description="Execution states across local projects"
					title="Recent runs"
				>
					<div className="dense-list">
						{runs.slice(0, 4).map((run) => (
							<div className="dense-row" key={run.id}>
								<div className="dense-row__main">
									<StatusDot tone={getRunStatusTone(run.status)} />
									<div>
										<strong>{run.title}</strong>
										<span>
											{run.agent} · {run.model} · {formatDuration(run.durationMs)}
										</span>
									</div>
								</div>
								<Badge tone={getRunStatusTone(run.status)}>
									{getRunStatusLabel(run.status)}
								</Badge>
							</div>
						))}
					</div>
				</Panel>
			</div>

		</div>
	);
}
