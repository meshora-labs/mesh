import { cx } from "@/components/ui/cx";
import type { StatusTone } from "@/domain/status";

interface StatusDotProps {
  tone?: StatusTone;
  label?: string;
}

export function StatusDot({ tone = "neutral", label }: StatusDotProps) {
  return (
    <span className="status-dot-wrap">
      <span className={cx("status-dot", `status-dot--${tone}`)} />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
