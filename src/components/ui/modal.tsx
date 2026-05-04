import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { IconButton } from "@/components/ui/button";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
}

export function Modal({ open, title, description, children, onOpenChange }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <button
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
      tabIndex={-1}
      type="button"
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <IconButton label="Close modal" onClick={() => onOpenChange(false)}>
            <X size={17} />
          </IconButton>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </button>
  );
}
