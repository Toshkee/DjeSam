/**
 * Wraps an async function so concurrent calls share one in-flight promise.
 * Used to make "save parking" idempotent against double taps.
 */
export function singleFlight<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) {
  let inFlight: Promise<R> | null = null;
  const wrapped = (...args: Args): Promise<R> => {
    if (inFlight) return inFlight;
    inFlight = fn(...args).finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
  wrapped.isRunning = () => inFlight !== null;
  return wrapped;
}

export function createId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}
