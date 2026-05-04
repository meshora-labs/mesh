import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/app/AppShell";
import { createMockRepositories } from "@/data/repositories";

describe("AppShell", () => {
	it("renders the desktop shell, sidebar, topbar, and active page", () => {
		const html = renderToString(
			<AppShell
				activeRoute="command-center"
				onRouteChange={vi.fn()}
				repositories={createMockRepositories()}
			/>,
		);

		expect(html).toContain("window-drag-space");
		expect(html).toContain("data-tauri-drag-region");
		expect(html).toContain("Command Center");
		expect(html).toContain("sidebar-item");
		expect(html).toContain("lucide-folder-kanban");
		expect(html).toContain("lucide-circle-play");
		expect(html).toContain("lucide-sliders-horizontal");
		expect(html).toContain("Show context panel");
		expect(html).toContain("Search projects, runs, agents");
	});
});
