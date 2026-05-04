import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/data/repositories";

describe("mock repositories", () => {
  it("returns cloned workspace data", async () => {
    const repositories = createMockRepositories();
    const first = await repositories.workspaceRepository.getCurrent();
    const second = await repositories.workspaceRepository.getCurrent();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it("finds projects by id", async () => {
    const repositories = createMockRepositories();
    const project = await repositories.projectsRepository.getById("project:mesh");

    expect(project?.name).toBe("Mesh");
  });

  it("filters runs by project", async () => {
    const repositories = createMockRepositories();
    const runs = await repositories.runsRepository.listByProject("project:mesh");

    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((run) => run.projectId === "project:mesh")).toBe(true);
  });

  it("adds a local project", async () => {
    const repositories = createMockRepositories();
    const project = await repositories.projectsRepository.addLocalProject({
      nameInput: "",
      localPathInput: "/Users/shayn/Development/new-app",
    });
    const projects = await repositories.projectsRepository.list();

    expect(project.name).toBe("new-app");
    expect(project.source).toBe("local");
    expect(projects.at(-1)).toEqual(project);
  });

  it("adds a cloned git project", async () => {
    const repositories = createMockRepositories();
    const project = await repositories.projectsRepository.addGitProject({
      nameInput: "",
      localPathInput: "/Users/shayn/Development/new-git-app",
      repoUrlInput: "git@github.com:owner/new-git-app.git",
    });

    expect(project.name).toBe("new-git-app");
    expect(project.source).toBe("git");
    expect(project.repoUrl).toBe("git@github.com:owner/new-git-app.git");
  });
});
