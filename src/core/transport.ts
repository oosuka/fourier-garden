type Clock = () => number;

export class Transport {
  private clock: Clock;
  private anchorTime = 0;
  private elapsed = 0;
  private playing = false;

  constructor(clock: Clock = () => performance.now() / 1_000) {
    this.clock = clock;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get currentTime(): number {
    return this.playing ? this.elapsed + Math.max(0, this.clock() - this.anchorTime) : this.elapsed;
  }

  /** Audio and presentation reserve the same epoch; rendering may begin before it. */
  startAt(positionSeconds: number, clockTimeSeconds: number): void {
    if (
      !Number.isFinite(positionSeconds) ||
      positionSeconds < 0 ||
      !Number.isFinite(clockTimeSeconds)
    ) {
      throw new Error("Transport position and epoch must be finite; position must be nonnegative");
    }
    this.elapsed = positionSeconds;
    this.anchorTime = clockTimeSeconds;
    this.playing = true;
  }

  play(): void {
    if (this.playing) return;
    this.anchorTime = this.clock();
    this.playing = true;
  }

  pause(): void {
    if (!this.playing) return;
    this.elapsed = this.currentTime;
    this.playing = false;
  }

  setClock(clock: Clock): void {
    const position = this.currentTime;
    this.clock = clock;
    this.elapsed = position;
    this.anchorTime = clock();
  }

  reset(position = 0): void {
    this.elapsed = position;
    this.anchorTime = this.clock();
  }
}
