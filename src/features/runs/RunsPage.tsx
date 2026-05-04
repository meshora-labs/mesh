import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatusDot } from "@/components/ui/status-dot";
import { getRunStatusLabel, getRunStatusTone } from "@/domain/status";
import type { Project, Run, RunStatus } from "@/domain/types";
import { formatCurrency, formatDuration, formatRelativeTime } from "@/features/shared/format";

interface RunsPageProps {
  projects: Project[];
  runs: Run[];
}

const statusIcons: Record<RunStatus, typeof Clock3> = {
  queued: Clock3,
  running: Loader2,
  completed: CheckCircle2,
  failed: AlertTriangle,
};

export function RunsPage({ projects, runs }: RunsPageProps) {
  if (runs.length === 0) {
    return (
      <EmptyState
        description="Runs will appear here after an agent or workflow starts work."
        icon={<Clock3 size={22} />}
        title="No runs yet"
      />
    );
  }

  return (
    <Panel description="Mocked execution history across the local workspace" title="Run ledger">
      <table className="run-table">
        <thead>
          <tr className="run-table__header">
            <th>Run</th>
            <th>Project</th>
            <th>Agent</th>
            <th>Duration</th>
            <th>Cost</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const project = projects.find((entry) => entry.id === run.projectId);
            const Icon = statusIcons[run.status];

            return (
              <tr className="run-table__row" key={run.id}>
                <td className="run-title">
                  <Icon size={16} />
                  <span>
                    <strong>{run.title}</strong>
                    <small>{formatRelativeTime(run.startedAt)}</small>
                  </span>
                </td>
                <td>{project?.name ?? "Unknown"}</td>
                <td>
                  {run.agent}
                  <small>{run.model}</small>
                </td>
                <td>{formatDuration(run.durationMs)}</td>
                <td>{formatCurrency(run.costEstimate)}</td>
                <td>
                  <Badge tone={getRunStatusTone(run.status)}>
                    <StatusDot tone={getRunStatusTone(run.status)} />
                    {getRunStatusLabel(run.status)}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
