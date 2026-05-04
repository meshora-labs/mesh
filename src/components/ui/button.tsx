import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function Button({
  className,
  variant = "secondary",
  size = "md",
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx("button", `button--${variant}`, `button--${size}`, className)}
      type="button"
      {...props}
    >
      {icon ? <span className="button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({ className, label, children, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cx("icon-button", className)}
      title={label}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
