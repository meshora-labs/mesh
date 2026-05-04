import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Toolbar({ className, children, ...props }: ToolbarProps) {
  return (
    <div className={cx("toolbar", className)} {...props}>
      {children}
    </div>
  );
}
