import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/mark";
import { executionStatus, formatElapsed, siteProgress, timedGeneration } from "@/lib/pilili/execution-status";
import type { ExecutionPhase } from "@/lib/pilili/types";

export function ExecutionIndicator({
  phase,
  power,
  detail,
}: {
  phase: ExecutionPhase | null;
  power?: string | null;
  detail?: string | null;
}) {
  const [seconds, setSeconds] = useState(0);
  const message = executionStatus({ phase, power, detail, elapsed: seconds });
  const active = Boolean(message);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    setSeconds(0);
    const id = window.setInterval(() => {
      setSeconds(Math.max(0, Math.round((Date.now() - start) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [active]);
  if (!message) return null;
  const timed = timedGeneration(detail);
  const progress = siteProgress(detail);
  return (
    <div className="py-1" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <BrandLogo size="sm" className="pilili-mark h-6" />
        <p className="text-xs leading-snug text-muted">
          {message} {formatElapsed(seconds)}
          <span className="pilili-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </p>
      </div>
      {progress ? (
        <div className="mt-2">
          <div className="pilili-progress" aria-hidden="true">
            {progress.steps.map((label, index) => (
              <i key={label} className={index < progress.index ? "on" : index === progress.index ? "now" : ""} />
            ))}
          </div>
          <p className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-subtle">
            {progress.steps.map((label, index) => (
              <span key={label} className={index === progress.index ? "text-gold" : ""}>
                {label}
              </span>
            ))}
          </p>
        </div>
      ) : timed ? (
        <div className="pilili-progress mt-2" aria-hidden="true">
          <i className="now" style={{ gridColumn: "1 / -1" }} />
        </div>
      ) : null}
    </div>
  );
}