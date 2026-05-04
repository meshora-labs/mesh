import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Panel({ className, title, description, action, children, ...props }: PanelProps) {
  return (
    <section className={cx("panel", className)} {...props}>
      {title || description || action ? (
        <header className="panel__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div className="panel__action">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
