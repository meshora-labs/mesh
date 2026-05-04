import { useCallback, useEffect, useState } from "react";
import type { MeshRepositories } from "@/data/repositories";
import type { Project, Run, Workspace } from "@/domain/types";
import { cloneRepository, pickDirectory } from "@/platform/projects";

export interface WorkspaceData {
  workspace: Workspace | null;
  projects: Project[];
  runs: Run[];
  loading: boolean;
  connectingProject: boolean;
  projectError: string | null;
  isCloning: boolean;
  addLocalProject(nameInput: string, localPathInput: string): Promise<Project | null>;
  cloneGitProject(
    nameInput: string,
    urlInput: string,
    destinationInput: string,
  ): Promise<Project | null>;
  selectDirectory(): Promise<string | null>;
}

export function useWorkspaceData(repositories: MeshRepositories): WorkspaceData {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingProject, setConnectingProject] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      const [nextWorkspace, nextProjects, nextRuns] = await Promise.all([
        repositories.workspaceRepository.getCurrent(),
        repositories.projectsRepository.list(),
        repositories.runsRepository.list(),
      ]);

      if (!mounted) {
        return;
      }

      setWorkspace(nextWorkspace);
      setProjects(nextProjects);
      setRuns(nextRuns);
      setLoading(false);
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [repositories]);

  const upsertProject = useCallback((project: Project) => {
    setProjects((currentProjects) => {
      const withoutProject = currentProjects.filter((entry) => entry.id !== project.id);

      return [...withoutProject, project];
    });
  }, []);

  const addLocalProject = useCallback(
    async (nameInput: string, localPathInput: string) => {
      if (!workspace) {
        setProjectError("Configure d'abord une workspace.");
        return null;
      }

      setConnectingProject(true);
      setProjectError(null);

      try {
        const project = await repositories.projectsRepository.addLocalProject({
          nameInput,
          localPathInput,
        });
        upsertProject(project);

        return project;
      } catch (error) {
        setProjectError(
          error instanceof Error ? error.message : "Impossible d'ajouter le projet local.",
        );
        return null;
      } finally {
        setConnectingProject(false);
      }
    },
    [repositories, upsertProject, workspace],
  );

  const cloneGitProject = useCallback(
    async (nameInput: string, urlInput: string, destinationInput: string) => {
      if (!workspace) {
        setProjectError("Configure d'abord une workspace.");
        return null;
      }

      const repoUrl = urlInput.trim();
      const destinationPath = destinationInput.trim();

      if (!repoUrl) {
        setProjectError("L'URL Git est obligatoire.");
        return null;
      }

      if (!destinationPath) {
        setProjectError("Le chemin de destination est obligatoire.");
        return null;
      }

      setConnectingProject(true);
      setIsCloning(true);
      setProjectError(null);

      try {
        const cloned = await cloneRepository({ repoUrl, destinationPath });
        const project = await repositories.projectsRepository.addGitProject({
          nameInput,
          localPathInput: cloned.localPath,
          repoUrlInput: repoUrl,
        });
        upsertProject(project);

        return project;
      } catch (error) {
        setProjectError(
          error instanceof Error
            ? error.message
            : "Le clonage a echoue. Verifie l'URL et la destination.",
        );
        return null;
      } finally {
        setIsCloning(false);
        setConnectingProject(false);
      }
    },
    [repositories, upsertProject, workspace],
  );

  const selectDirectory = useCallback(async () => {
    try {
      return await pickDirectory();
    } catch {
      setProjectError("Impossible d'ouvrir le selecteur de dossier.");
      return null;
    }
  }, []);

  return {
    workspace,
    projects,
    runs,
    loading,
    connectingProject,
    projectError,
    isCloning,
    addLocalProject,
    cloneGitProject,
    selectDirectory,
  };
}
