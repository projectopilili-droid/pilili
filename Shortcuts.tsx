import { SHORTCUTS } from "@/lib/pilili/powers";
import type { PowerId } from "@/lib/pilili/types";

export function ShortcutChips({
  onPick,
}: {
  onPick: (text: string, power: PowerId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SHORTCUTS.map((chip) => (
        <button
          key={chip.label}
          type="button"
          className="min-h-11 rounded-full bg-surface px-3.5 py-2 text-xs text-muted shadow-[var(--shadow-border)] transition-[box-shadow,color,background-color] duration-150 hover:bg-elevated hover:text-fg hover:shadow-[var(--shadow-border-hover)]"
          onClick={() => onPick(chip.text, chip.power)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
