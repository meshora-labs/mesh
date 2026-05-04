import type { LucideIcon } from "lucide-react";
import { cx } from "@/components/ui/cx";

interface SidebarItemProps {
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function SidebarItem({
  icon: Icon,
  active = false,
  disabled = false,
  onSelect,
}: Readonly<SidebarItemProps>) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={cx("sidebar-item", active && "is-active")}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <Icon aria-hidden="true" className="sidebar-item__icon" />
    </button>
  );
}
