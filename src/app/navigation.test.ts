import { describe, expect, it } from "vitest";
import {
	defaultRoute,
	getEnabledNavigationItems,
	getNavigationItem,
	navigationItems,
} from "@/app/navigation";

describe("navigation helpers", () => {
	it("keeps command center as the default route", () => {
		expect(defaultRoute).toBe("command-center");
		expect(getNavigationItem(defaultRoute).label).toBe("Command Center");
	});

	it("separates enabled shell routes from prepared routes", () => {
		expect(getEnabledNavigationItems().map((item) => item.id)).toEqual([
			"command-center",
			"projects",
			"runs",
			"workbench",
			"models",
		]);
	});
});
