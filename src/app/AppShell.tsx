import { Bell, Command, PanelRight, Search } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { type AppRoute, getNavigationItem, navigationItems, quickActions } from "@/app/navigation";
import { useWorkspaceData } from "@/app/use-workspace-data";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarItem } from "@/components/ui/sidebar-item";
import { StatusDot } from "@/components/ui/status-dot";
import type { MeshRepositories } from "@/data/repositories";
import { getRunStatusTone } from "@/domain/status";
import { CommandCenterPage } from "@/features/command-center/CommandCenterPage";
import { ModelsPage } from "@/features/models/ModelsPage";
import { PlaceholderPage } from "@/features/placeholders/PlaceholderPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { RunsPage } from "@/features/runs/RunsPage";
import { WorkbenchPage } from "@/features/workbench/WorkbenchPage";
import { mockAgents, mockModelDiscoverySources, mockModelRegistry } from "@/mocks/mesh-fixtures";

const interactiveTopbarSelector = "button, input, textarea, select, a, label, kbd";

interface AppShellProps {
  activeRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  repositories: MeshRepositories;
}

const CONTEXT_PANEL_STORAGE_KEY = "mesh-context-panel-open";

function pureHandleTopbarMouseDown(event: MouseEvent<HTMLElement>) {
  if (event.button !== 0) {
    return;
  }

  const target = event.target;
  if (target instanceof Element && target.closest(interactiveTopbarSelector)) {
    return;
  }

  if (!("__TAURI_INTERNALS__" in globalThis)) {
    return;
  }

  void import("@tauri-apps/api/window")
    .then(({ getCurrentWindow }) => getCurrentWindow().startDragging())
    .catch(() => {
      // Browser preview and some embedded contexts do not expose window drag.
    });
}

export function AppShell({ activeRoute, onRouteChange, repositories }: Readonly<AppShellProps>) {
  const data = useWorkspaceData(repositories);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);

  useEffect(() => {
    const storedValue = globalThis.localStorage.getItem(CONTEXT_PANEL_STORAGE_KEY);
    if (storedValue !== null) {
      setIsContextPanelOpen(storedValue === "true");
    }
  }, []);

  useEffect(() => {
    globalThis.localStorage.setItem(CONTEXT_PANEL_STORAGE_KEY, String(isContextPanelOpen));
  }, [isContextPanelOpen]);

  const route = getNavigationItem(activeRoute);
  const selectedProject =
    data.projects.find((project) => project.id === selectedProjectId) ?? data.projects[0] ?? null;
  const activeRuns = data.runs.filter((run) => run.status === "running");
  const recentRun = data.runs[0] ?? null;
  const contextLines = useMemo(
    () => [
      selectedProject ? `Selected: ${selectedProject.name}` : "No project selected",
      `${activeRuns.length} active run${activeRuns.length === 1 ? "" : "s"}`,
      recentRun ? `Latest: ${recentRun.title}` : "No runs yet",
    ],
    [activeRuns.length, recentRun, selectedProject],
  );

  return (
    <div className="app-shell">
      <header className="topbar" data-tauri-drag-region>
        <div
          className="window-drag-space"
          aria-hidden="true"
          data-tauri-drag-region
          onMouseDown={pureHandleTopbarMouseDown}
        />
        <label className="global-search" htmlFor="global-search-input">
          <Search aria-hidden="true" size={16} />
          <Input id="global-search-input" placeholder="Search projects, runs, agents" />
          <kbd>⌘K</kbd>
        </label>
        <div className="topbar__actions">
          <IconButton label="Open command palette">
            <Command size={17} />
          </IconButton>
          <IconButton label="Notifications">
            <Bell size={17} />
          </IconButton>
          <IconButton
            aria-expanded={isContextPanelOpen}
            aria-controls="context-panel"
            label={isContextPanelOpen ? "Hide context panel" : "Show context panel"}
            onClick={() => setIsContextPanelOpen((value) => !value)}
          >
            <PanelRight size={17} />
          </IconButton>
        </div>
      </header>

      <aside className="sidebar" aria-label="Primary">
        <nav className="sidebar__nav">
          {navigationItems.map((item) => (
            <SidebarItem
              active={item.id === activeRoute}
              disabled={!item.enabled}
              icon={item.icon}
              key={item.id}
              onSelect={() => item.enabled && onRouteChange(item.id)}
            />
          ))}
        </nav>
      </aside>

      <div className="workspace-frame">
        <main
          className={
            isContextPanelOpen ? "main-surface" : "main-surface main-surface--context-closed"
          }
        >
          <section className="content-region" aria-labelledby="page-title">
            <div className="page-heading">
              <div>
                <span className="eyebrow">{route.description}</span>
                <h1 id="page-title">{route.label}</h1>
              </div>
              <div className="page-heading__actions">
                {quickActions.map((action) => (
                  <Button
                    icon={<action.icon size={15} />}
                    key={action.id}
                    size="sm"
                    variant={action.id === "new-run" ? "primary" : "secondary"}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
            {activeRoute === "command-center" ? (
              <CommandCenterPage
                loading={data.loading}
                projects={data.projects}
                runs={data.runs}
                workspace={data.workspace}
              />
            ) : null}
            {activeRoute === "projects" ? (
              <ProjectsPage
                connectingProject={data.connectingProject}
                isCloning={data.isCloning}
                onAddLocalProject={async (nameInput, localPathInput) => {
                  const project = await data.addLocalProject(nameInput, localPathInput);

                  if (project) {
                    setSelectedProjectId(project.id);
                  }

                  return project;
                }}
                onCloneGitProject={async (nameInput, urlInput, destinationInput) => {
                  const project = await data.cloneGitProject(nameInput, urlInput, destinationInput);

                  if (project) {
                    setSelectedProjectId(project.id);
                  }

                  return project;
                }}
                onSelectProject={setSelectedProjectId}
                onSelectDirectory={data.selectDirectory}
                projectError={data.projectError}
                projects={data.projects}
                selectedProjectId={selectedProjectId}
              />
            ) : null}
            {activeRoute === "runs" ? <RunsPage projects={data.projects} runs={data.runs} /> : null}
            {activeRoute === "workbench" ? (
              <WorkbenchPage
                agents={mockAgents}
                models={mockModelRegistry}
                projects={data.projects}
              />
            ) : null}
            {activeRoute === "models" ? (
              <ModelsPage
                initialDiscoverySources={mockModelDiscoverySources}
                initialModels={mockModelRegistry}
              />
            ) : null}
            {["command-center", "projects", "runs", "workbench", "models"].includes(
              activeRoute,
            ) ? null : (
              <PlaceholderPage route={route} />
            )}
          </section>

          {isContextPanelOpen ? (
            <aside className="context-panel" id="context-panel" aria-label="Context">
              <div className="context-panel__header">
                <div>
                  <span className="eyebrow">Context</span>
                  <h2>Local state</h2>
                </div>
              </div>
              <div className="context-list">
                {contextLines.map((line) => (
                  <div className="context-list__item" key={line}>
                    {line}
                  </div>
                ))}
              </div>
              <div className="context-panel__section">
                <div className="context-panel__label">Run health</div>
                {data.runs.slice(0, 4).map((run) => (
                  <div className="mini-run" key={run.id}>
                    <StatusDot tone={getRunStatusTone(run.status)} />
                    <span>{run.title}</span>
                  </div>
                ))}
              </div>
            </aside>
          ) : null}
        </main>
      </div>
    </div>
  );
}
