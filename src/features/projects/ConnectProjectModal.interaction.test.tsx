// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/domain/types";
import { ConnectProjectModal } from "@/features/projects/ConnectProjectModal";

const connectedProject: Project = {
	id: "project:new",
	name: "New project",
	path: "/Users/test/new-project",
	source: "local",
	status: "active",
	updatedAt: "2026-05-03T10:00:00.000Z",
};

function renderModal(
	overrides: Partial<Parameters<typeof ConnectProjectModal>[0]> = {},
) {
	const props: Parameters<typeof ConnectProjectModal>[0] = {
		onAddLocalProject: vi.fn().mockResolvedValue(connectedProject),
		onCloneGitProject: vi.fn().mockResolvedValue({ ...connectedProject, source: "git" }),
		onOpenChange: vi.fn(),
		onSelectDirectory: vi.fn().mockResolvedValue("/Users/test/selected"),
		open: true,
		...overrides,
	};

	render(<ConnectProjectModal {...props} />);

	return props;
}

describe("ConnectProjectModal interactions", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("submits a local project and closes on success", async () => {
		const user = userEvent.setup();
		const props = renderModal();

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "New project" },
		});
		fireEvent.change(screen.getByLabelText("Local path"), {
			target: { value: "/Users/test/new-project" },
		});
		await user.click(screen.getByRole("button", { name: "Add local project" }));

		expect(props.onAddLocalProject).toHaveBeenCalledWith(
			"New project",
			"/Users/test/new-project",
		);
		await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false));
	});

	it("fills a git destination through browse and submits clone input", async () => {
		const user = userEvent.setup();
		const props = renderModal();

		await user.click(screen.getByRole("button", { name: /GitHub/ }));
		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Cloned project" },
		});
		fireEvent.change(screen.getByLabelText("Repository URL"), {
			target: { value: "https://github.com/owner/repo.git" },
		});
		await user.click(screen.getByRole("button", { name: "Browse" }));

		expect((screen.getByLabelText("Destination path") as HTMLInputElement).value).toBe(
			"/Users/test/selected",
		);

		await user.click(screen.getByRole("button", { name: "Clone from GitHub" }));

		expect(props.onCloneGitProject).toHaveBeenCalledWith(
			"Cloned project",
			"https://github.com/owner/repo.git",
			"/Users/test/selected",
		);
	});

	it("does not close while a project is connecting", async () => {
		const user = userEvent.setup();
		const props = renderModal({ connectingProject: true });

		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(props.onOpenChange).not.toHaveBeenCalled();
	});
});
