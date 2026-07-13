import type { QualityLevel } from "../patterns/contracts";

const LEVELS: readonly QualityLevel[] = ["low", "medium", "high", "ultra"];

export class AdaptiveQuality {
  private samples: number[] = [];

  constructor(
    public level: QualityLevel = "high",
    private readonly windowSize = 120,
  ) {}

  sample(deltaSeconds: number): QualityLevel | null {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || deltaSeconds > 0.25) {
      return null;
    }

    this.samples.push(1 / deltaSeconds);
    if (this.samples.length < this.windowSize) return null;

    const sorted = this.samples.toSorted((a, b) => a - b);
    const percentileIndex = Math.floor(sorted.length * 0.2);
    const lowPercentile = sorted[percentileIndex] ?? 60;
    this.samples = [];

    const currentIndex = LEVELS.indexOf(this.level);
    let nextIndex = currentIndex;

    if (lowPercentile < 53) {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (lowPercentile > 82) {
      nextIndex = Math.min(LEVELS.length - 1, currentIndex + 1);
    }

    if (nextIndex === currentIndex) return null;
    this.level = LEVELS[nextIndex]!;
    return this.level;
  }
}
