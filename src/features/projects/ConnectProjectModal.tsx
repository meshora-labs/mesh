import {
  BrainCircuit,
  Cpu,
  FolderOpen,
  GitBranch,
  GitPullRequest,
  LayoutDashboard,
  Link2,
  type LucideIcon,
  Server,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { Project } from "@/domain/types";

type ProjectSourceId =
  | "local"
  | "repo-url"
  | "github"
  | "gitlab"
  | "bitbucket"
  | "azure"
  | "gcp"
  | "codecommit";

type ProjectSourceGroup = "direct" | "git-hosting" | "provider";

interface ProjectSourceOption {
  id: ProjectSourceId;
  label: string;
  group: ProjectSourceGroup;
  description: string;
  kind: "local" | "git";
  icon: LucideIcon;
  variants: string[];
}

interface ConnectProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLocalProject: (nameInput: string, localPathInput: string) => Promise<Project | null>;
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

const projectSourceOptions: ProjectSourceOption[] = [
  {
    id: "local",
    label: "Local folder",
    group: "direct",
    description: "Connect an existing folder on this machine.",
    kind: "local",
    icon: FolderOpen,
    variants: ["Existing workspace", "Monorepo folder", "Standalone app"],
  },
  {
    id: "repo-url",
    label: "Repository URL",
    group: "direct",
    description: "Clone from any Git-compatible remote URL.",
    kind: "git",
    icon: Link2,
    variants: ["HTTPS", "SSH", "file://", "custom Git remote"],
  },
  {
    id: "github",
    label: "GitHub",
    group: "git-hosting",
    description: "github.com/org/repo.git",
    kind: "git",
    icon: GitPullRequest,
    variants: ["GitHub.com", "GitHub Enterprise", "HTTPS", "SSH"],
  },
  {
    id: "gitlab",
    label: "GitLab",
    group: "git-hosting",
    description: "gitlab.com/group/repo.git",
    kind: "git",
    icon: LayoutDashboard,
    variants: ["GitLab.com", "Self-managed", "Group repos", "SSH"],
  },
  {
    id: "bitbucket",
    label: "Bitbucket",
    group: "git-hosting",
    description: "bitbucket.org/workspace/repo.git",
    kind: "git",
    icon: GitBranch,
    variants: ["Bitbucket Cloud", "Data Center", "Workspace repos", "SSH"],
  },
  {
    id: "azure",
    label: "Azure DevOps",
    group: "provider",
    description: "dev.azure.com/org/project/_git/repo",
    kind: "git",
    icon: Server,
    variants: ["Azure Repos", "DevOps Server", "Project collections", "SSH"],
  },
  {
    id: "gcp",
    label: "Google Cloud",
    group: "provider",
    description: "source.developers.google.com/...",
    kind: "git",
    icon: Cpu,
    variants: ["Cloud Source Repositories", "Cloud Build repos", "HTTPS", "SSH"],
  },
  {
    id: "codecommit",
    label: "AWS CodeCommit",
    group: "provider",
    description: "git-codecommit.<region>.amazonaws.com",
    kind: "git",
    icon: BrainCircuit,
    variants: ["HTTPS Git credentials", "SSH", "credential helper", "IAM auth"],
  },
];

const sourceGroupLabels: Record<ProjectSourceGroup, string> = {
  direct: "Direct",
  "git-hosting": "Git hosting",
  provider: "Cloud providers",
};

export function ConnectProjectModal({
  open,
  onOpenChange,
  onAddLocalProject,
  onCloneGitProject,
  onSelectDirectory,
  connectingProject = false,
  isCloning = false,
  projectError = null,
}: ConnectProjectModalProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<ProjectSourceId>("local");
  const [nameInput, setNameInput] = useState("");
  const [localPathInput, setLocalPathInput] = useState("");
  const [repoUrlInput, setRepoUrlInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const selectedSource =
    projectSourceOptions.find((option) => option.id === selectedSourceId) ??
    projectSourceOptions[0];
  const isLocalSource = selectedSource.kind === "local";
  const SelectedSourceIcon = selectedSource.icon;

  function resetForm() {
    setNameInput("");
    setLocalPathInput("");
    setRepoUrlInput("");
    setDestinationInput("");
    setSelectedSourceId("local");
  }

  function closeModal() {
    if (connectingProject) {
      return;
    }

    resetForm();
    onOpenChange(false);
  }

  async function handleSelectDirectory() {
    const directory = await onSelectDirectory();

    if (directory) {
      setLocalPathInput(directory);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const project =
      selectedSource.kind === "local"
        ? await onAddLocalProject(nameInput, localPathInput)
        : await onCloneGitProject(nameInput, repoUrlInput, destinationInput);

    if (project) {
      resetForm();
      onOpenChange(false);
    }
  }

  return (
    <Modal
      description="Connect a folder or clone from the same providers supported by the legacy workspace flow."
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }

        closeModal();
      }}
      open={open}
      title="Connect project"
    >
      <form className="connect-project-form" onSubmit={handleSubmit}>
        <div className="connect-project-layout">
          <section className="connect-source-list" aria-label="Project source">
            {(["direct", "git-hosting", "provider"] as const).map((group) => (
              <div className="connect-source-group" key={group}>
                <div className="connect-source-group__label">{sourceGroupLabels[group]}</div>
                {projectSourceOptions
                  .filter((option) => option.group === group)
                  .map((option) => {
                    const Icon = option.icon;

                    return (
                      <button
                        aria-pressed={option.id === selectedSource.id}
                        className={
                          option.id === selectedSource.id
                            ? "connect-source-option is-selected"
                            : "connect-source-option"
                        }
                        disabled={connectingProject}
                        key={option.id}
                        onClick={() => setSelectedSourceId(option.id)}
                        type="button"
                      >
                        <span className="connect-source-option__icon">
                          <Icon size={16} />
                        </span>
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.kind === "local" ? "Local" : "Git"}</small>
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))}
          </section>

          <div className="connect-project-config">
            <div className="connect-source-summary">
              <div className="connect-source-summary__header">
                <span className="connect-method__icon">
                  <SelectedSourceIcon size={17} />
                </span>
                <div>
                  <h3>{selectedSource.label}</h3>
                  <p>{selectedSource.description}</p>
                </div>
              </div>
              <ul className="variant-list" aria-label="Supported variants">
                {selectedSource.variants.map((variant) => (
                  <li className="variant-chip" key={variant}>
                    {variant}
                  </li>
                ))}
              </ul>
            </div>

            <div className="connect-project-fields">
              <label className="field-stack" htmlFor="project-name">
                <span>Name</span>
                <Input
                  id="project-name"
                  disabled={connectingProject}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="Inferred from path when empty"
                  value={nameInput}
                />
              </label>
              {isLocalSource ? (
                <label className="field-stack" htmlFor="local-path">
                  <span>Local path</span>
                  <div className="input-action-row">
                    <Input
                      id="local-path"
                      disabled={connectingProject}
                      onChange={(event) => setLocalPathInput(event.target.value)}
                      placeholder="/Users/shayn/Development/project"
                      value={localPathInput}
                    />
                    <Button
                      disabled={connectingProject}
                      icon={<FolderOpen size={14} />}
                      onClick={handleSelectDirectory}
                      size="sm"
                    >
                      Browse
                    </Button>
                  </div>
                </label>
              ) : (
                <>
                  <label className="field-stack" htmlFor="repo-url">
                    <span>Repository URL</span>
                    <Input
                      id="repo-url"
                      disabled={connectingProject}
                      onChange={(event) => setRepoUrlInput(event.target.value)}
                      placeholder={selectedSource.description}
                      value={repoUrlInput}
                    />
                  </label>
                  <label className="field-stack" htmlFor="dest-path">
                    <span>Destination path</span>
                    <div className="input-action-row">
                      <Input
                        id="dest-path"
                        disabled={connectingProject}
                        onChange={(event) => setDestinationInput(event.target.value)}
                        placeholder="/Users/shayn/Development/repo"
                        value={destinationInput}
                      />
                      <Button
                        disabled={connectingProject}
                        icon={<FolderOpen size={14} />}
                        onClick={async () => {
                          const directory = await onSelectDirectory();

                          if (directory) {
                            setDestinationInput(directory);
                          }
                        }}
                        size="sm"
                      >
                        Browse
                      </Button>
                    </div>
                  </label>
                </>
              )}
            </div>

            <div className="connect-project-actions">
              <div className="button-row">
                <Button disabled={connectingProject} type="submit" variant="primary">
                  {isCloning
                    ? "Cloning..."
                    : isLocalSource
                      ? "Add local project"
                      : `Clone from ${selectedSource.label}`}
                </Button>
                <Button disabled={connectingProject} onClick={closeModal}>
                  Cancel
                </Button>
              </div>
              {projectError ? <p className="inline-status">{projectError}</p> : null}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
