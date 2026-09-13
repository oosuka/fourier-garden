export interface PositionObservation {
  type: string;
  requestId: number;
  contextFrame: number;
  positionFrame: number;
  minimumPositionFrame: number;
  sampleRate: number;
  active: boolean;
}

export function parsePositionObservation(
  data: unknown,
  requestId: number,
): PositionObservation | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (
    record.type !== "position" ||
    record.requestId !== requestId ||
    typeof record.active !== "boolean"
  )
    return null;
  for (const key of [
    "contextFrame",
    "positionFrame",
    "minimumPositionFrame",
    "sampleRate",
  ] as const) {
    const value = record[key];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return null;
  }
  if (Number(record.sampleRate) <= 0) return null;
  return {
    type: "position",
    requestId,
    active: record.active,
    contextFrame: Number(record.contextFrame),
    positionFrame: Number(record.positionFrame),
    minimumPositionFrame: Number(record.minimumPositionFrame),
    sampleRate: Number(record.sampleRate),
  };
}

export function measureSynchronization(
  position: PositionObservation,
  audibleContextSeconds: number,
  displayedTimeSeconds: number,
): { audibleScoreSeconds: number; visualLeadMs: number } | null {
  if (
    !position.active ||
    !Number.isFinite(audibleContextSeconds) ||
    !Number.isFinite(displayedTimeSeconds)
  )
    return null;
  const audibleScoreSeconds = Math.max(
    position.minimumPositionFrame / position.sampleRate,
    (position.positionFrame - position.contextFrame) / position.sampleRate + audibleContextSeconds,
  );
  return { audibleScoreSeconds, visualLeadMs: (displayedTimeSeconds - audibleScoreSeconds) * 1000 };
}
