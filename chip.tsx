import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Chip({
  selected,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-11 rounded-full px-4 text-sm transition-[box-shadow,background-color,color] duration-150",
        selected
          ? "bg-gold-soft text-gold-bright shadow-[var(--shadow-gold)]"
          : "bg-surface text-muted shadow-[var(--shadow-border)] hover:bg-elevated hover:text-fg hover:shadow-[var(--shadow-border-hover)]",
        className,
      )}
      aria-pressed={selected}
      {...props}
    />
  );
}
