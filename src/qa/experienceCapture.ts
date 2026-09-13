export interface CaptureMetadata {
  chapter: string;
  renderer: string;
  width: number;
  height: number;
  pixelRatio: number;
  rasterWidth?: number;
  rasterHeight?: number;
  quality: string;
  seed: string;
  postProcessing?: string;
  audioSampleRateHz?: number | null;
  clock?: "performance" | "audio-presentation-estimate";
  mutedAtStart?: boolean;
  volumeAtStart?: number;
  playingAtStart?: boolean;
  motionAtStart?: string;
  physicalLatencyMeasured?: boolean;
}

export interface ExperienceReport extends CaptureMetadata {
  status: "complete" | "interrupted";
  reason: string | null;
  durationSeconds: number;
  frames: number;
  averageFps: number;
  cpuSubmissionP95Ms: number;
  frameIntervalP95Ms: number;
  maxFrameIntervalMs: number;
  intervalsOver50Ms: number;
  slowFrames: readonly SlowFrameDetail[];
  slowFramesOmitted: number;
  synchronizationSamples: number;
  visualLeadP95Ms: number | null;
  visualLeadMinMs: number | null;
  visualLeadMaxMs: number | null;
  firstScoreSeconds: number;
  lastScoreSeconds: number;
}

export interface SlowFrameDetail {
  elapsedSeconds: number;
  frameIntervalMs: number;
  cpuSubmissionMs: number;
}

const MAXIMUM_SLOW_FRAME_DETAILS = 32;

export class ExperienceCapture {
  report: ExperienceReport | null = null;
  private metadata: CaptureMetadata | null = null;
  private durationMs = 0;
  private startedMs: number | null = null;
  private lastMs = 0;
  private firstScore = 0;
  private lastScore = 0;
  private count = 0;
  private syncCount = 0;
  private intervals = new Float64Array(0);
  private cpu = new Float64Array(0);
  private leads = new Float64Array(0);

  get active(): boolean {
    return this.metadata !== null;
  }
  get elapsedSeconds(): number {
    return this.startedMs === null ? 0 : (this.lastMs - this.startedMs) / 1000;
  }

  start(seconds: number, metadata: CaptureMetadata): void {
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600)
      throw new Error("Capture duration must be within 0–600 seconds");
    this.metadata = { ...metadata };
    this.durationMs = seconds * 1000;
    this.startedMs = null;
    this.count = this.syncCount = 0;
    this.report = null;
    const capacity = Math.ceil(seconds * 240) + 2;
    this.intervals = new Float64Array(capacity);
    this.cpu = new Float64Array(capacity);
    this.leads = new Float64Array(capacity);
  }

  record(nowMs: number, cpuMs: number, timeSeconds: number, visualLeadMs: number | null): void {
    if (!this.metadata) return;
    this.lastScore = timeSeconds;
    if (this.startedMs === null) {
      this.startedMs = this.lastMs = nowMs;
      this.firstScore = timeSeconds;
      return;
    }
    if (nowMs <= this.lastMs) return;
    this.intervals[this.count] = nowMs - this.lastMs;
    this.cpu[this.count] = cpuMs;
    this.lastMs = nowMs;
    this.count++;
    if (visualLeadMs !== null && Number.isFinite(visualLeadMs))
      this.leads[this.syncCount++] = visualLeadMs;
    if (nowMs - this.startedMs >= this.durationMs) this.finish("complete", null);
    else if (this.count === this.intervals.length) this.interrupt("sample-capacity");
  }

  interrupt(reason: string): void {
    if (this.metadata) this.finish("interrupted", reason);
  }

  private finish(status: ExperienceReport["status"], reason: string | null): void {
    if (!this.metadata) return;
    const intervals = Array.from(this.intervals.subarray(0, this.count));
    const leads = Array.from(this.leads.subarray(0, this.syncCount));
    const durationSeconds = this.elapsedSeconds;
    const slowFrames: SlowFrameDetail[] = [];
    let elapsedMs = 0;
    let intervalsOver50Ms = 0;
    // Preserve chronological locations before percentile95 sorts the interval copy.
    for (const [index, frameIntervalMs] of intervals.entries()) {
      elapsedMs += frameIntervalMs;
      if (frameIntervalMs <= 50) continue;
      intervalsOver50Ms++;
      if (slowFrames.length >= MAXIMUM_SLOW_FRAME_DETAILS) continue;
      slowFrames.push({
        elapsedSeconds: elapsedMs / 1000,
        frameIntervalMs,
        cpuSubmissionMs: this.cpu[index]!,
      });
    }
    this.report = {
      ...this.metadata,
      status,
      reason,
      durationSeconds,
      frames: this.count,
      averageFps: durationSeconds > 0 ? this.count / durationSeconds : 0,
      cpuSubmissionP95Ms: percentile95(Array.from(this.cpu.subarray(0, this.count))),
      frameIntervalP95Ms: percentile95(intervals),
      maxFrameIntervalMs: intervals.reduce((max, value) => Math.max(max, value), 0),
      intervalsOver50Ms,
      slowFrames,
      slowFramesOmitted: intervalsOver50Ms - slowFrames.length,
      synchronizationSamples: this.syncCount,
      visualLeadP95Ms: leads.length ? percentile95(leads.map(Math.abs)) : null,
      visualLeadMinMs: leads.length
        ? leads.reduce((min, value) => Math.min(min, value), Infinity)
        : null,
      visualLeadMaxMs: leads.length
        ? leads.reduce((max, value) => Math.max(max, value), -Infinity)
        : null,
      firstScoreSeconds: this.firstScore,
      lastScoreSeconds: this.lastScore,
    };
    this.metadata = null;
  }
}

function percentile95(values: number[]): number {
  values.sort((a, b) => a - b);
  return values[Math.max(0, Math.ceil(values.length * 0.95) - 1)] ?? 0;
}
