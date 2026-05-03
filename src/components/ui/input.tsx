import type { InputHTMLAttributes } from "react";
import { cx } from "@/components/ui/cx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
	return <input className={cx("input", className)} {...props} />;
}
