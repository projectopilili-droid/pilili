export const MODEL_TIMEOUT_MS = 90_000;

export class ExecutionTimeoutError extends Error {
  readonly name = "ExecutionTimeoutError";
  constructor() {
    super("EXECUTION_TIMEOUT");
  }
}

export function startDeadline(ms: number) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort(new ExecutionTimeoutError());
  }, ms);
  return {
    signal: ctrl.signal,
    timedOut: () => timedOut,
    cancel: () => clearTimeout(timer),
  };
}

export function errorFromAbort(signal: AbortSignal | undefined, fallback: unknown): Error {
  if (signal?.reason instanceof ExecutionTimeoutError) return signal.reason;
  if (fallback instanceof ExecutionTimeoutError) return fallback;
  if (fallback instanceof Error) return fallback;
  return new Error("CANCELLED");
}
