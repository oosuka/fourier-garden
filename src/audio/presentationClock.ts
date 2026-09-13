interface OutputClock {
  currentTime: number;
  baseLatency?: number;
  outputLatency?: number;
  getOutputTimestamp?(): { contextTime?: number; performanceTime?: number };
}

/** Maps the device's audible sample to the clock used by the mathematical scene. */
export function getAudibleContextTime(
  clock: OutputClock,
  performanceTimeMs: number,
  graphLatencySeconds: number,
): number {
  const timestamp = clock.getOutputTimestamp?.();
  const contextTime = timestamp?.contextTime;
  const performanceTime = timestamp?.performanceTime;
  const usableTimestamp =
    contextTime !== undefined &&
    performanceTime !== undefined &&
    Number.isFinite(contextTime) &&
    Number.isFinite(performanceTime) &&
    contextTime > 0 &&
    performanceTime > 0 &&
    Math.abs(performanceTimeMs - performanceTime) < 500;
  const audibleTime = usableTimestamp
    ? contextTime + (performanceTimeMs - performanceTime) / 1_000
    : clock.currentTime - (clock.baseLatency ?? 0) - (clock.outputLatency ?? 0);
  return Math.max(0, Math.min(clock.currentTime, audibleTime) - graphLatencySeconds);
}
