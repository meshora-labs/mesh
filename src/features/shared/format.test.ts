import { describe, expect, it } from "vitest";
import { formatCurrency, formatDuration, formatRelativeTime } from "@/features/shared/format";

describe("shared format helpers", () => {
	it("formats durations for idle, minute, and hour ranges", () => {
		expect(formatDuration(0)).toBe("not started");
		expect(formatDuration(30_000)).toBe("1m");
		expect(formatDuration(3_600_000)).toBe("1h");
		expect(formatDuration(5_580_000)).toBe("1h 33m");
	});

	it("formats currency as USD", () => {
		expect(formatCurrency(1.4)).toBe("$1.40");
		expect(formatCurrency(0)).toBe("$0.00");
	});

	it("formats invalid dates as unknown", () => {
		expect(formatRelativeTime("not-a-date")).toBe("unknown");
	});
});
