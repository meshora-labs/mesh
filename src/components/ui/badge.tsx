import type { HTMLAttributes, ReactNode } from "react";
import type { StatusTone } from "@/domain/status";
import { cx } from "@/components/ui/cx";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	tone?: StatusTone;
	children: ReactNode;
}

export function Badge({
	className,
	tone = "neutral",
	children,
	...props
}: BadgeProps) {
	return (
		<span className={cx("badge", `badge--${tone}`, className)} {...props}>
			{children}
		</span>
	);
}
