// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkbenchPage } from "@/features/workbench/WorkbenchPage";
import { mockAgents, mockModelRegistry, mockProjects } from "@/mocks/mesh-fixtures";

describe("WorkbenchPage interactions", () => {
	beforeEach(() => {
		Element.prototype.scrollIntoView = vi.fn();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("prepares a run from the composer and can replay the last prompt", async () => {
		const user = userEvent.setup();
		render(
			<WorkbenchPage
				agents={mockAgents}
				models={mockModelRegistry}
				projects={mockProjects}
			/>,
		);
		const promptInput = screen.getByLabelText("User prompt") as HTMLTextAreaElement;

		await user.type(promptInput, "Ship the model registry flow");
		await user.click(screen.getByRole("button", { name: "Send" }));

		expect(screen.getByText("Ship the model registry flow")).toBeTruthy();
		expect(promptInput.value).toBe("");
		expect(screen.getByText("Prepared")).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "Replay" }));

		expect(promptInput.value).toBe("Ship the model registry flow");
	});

	it("stores debug logs only while log storage is enabled", async () => {
		const user = userEvent.setup();
		render(
			<WorkbenchPage
				agents={mockAgents}
				models={mockModelRegistry}
				projects={mockProjects}
			/>,
		);

		await user.click(screen.getByLabelText("Store logs"));
		await user.type(screen.getByLabelText("User prompt"), "Inspect project state");
		await user.click(screen.getByRole("button", { name: "Send" }));
		await user.click(screen.getByRole("button", { name: "Debug logs" }));

		expect(screen.getByText("No debug logs.")).toBeTruthy();
	});
});
