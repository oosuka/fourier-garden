import { createWorkletConfigureMessage, type AudioEngineProgram } from "./audioProgram";
import {
  AUDIO_DEFAULT_FADE_IN_SECONDS,
  AUDIO_MASTER_FADE_OUT_SECONDS,
  AUDIO_START_LEAD_SECONDS,
  connectAudioOutputGraph,
  volumeToMasterGain,
} from "./outputGraph";
import { getAudibleContextTime } from "./presentationClock";
import {
  measureSynchronization,
  parsePositionObservation,
  type PositionObservation,
} from "./positionObservation";

const VOLUME_KEY = "fourier-garden:volume";
const DEFAULT_VOLUME = 0.35;
// Chromium's compressor look-ahead. Device latency is obtained separately from its timestamp.
const GRAPH_LATENCY_SECONDS = 0.006;
export { createLimiterCurve } from "./outputGraph";

export class AudioEngine {
  private context: AudioContext | null = null;
  private source: AudioWorkletNode | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private audioNodes: AudioNode[] = [];
  private initialization: Promise<void> | null = null;
  private fadeOutDisposal: Promise<void> | null = null;
  private volume: number;
  private active = false;
  private muted = false;
  private disposed = false;
  private lastPresentationTime = 0;
  private playbackRequest = 0;
  private latestPosition: PositionObservation | null = null;
  private positionReceivedMs = 0;
  private departure: { start: number; duration: number } | null = null;
  private disposalTimer: ReturnType<typeof setTimeout> | null = null;
  private finishFade: (() => void) | null = null;
  private disposal: Promise<void> | null = null;
  private failure: Error | null = null;
  private readonly errorListeners = new Set<(error: Error) => void>();

  constructor(
    private readonly program: AudioEngineProgram,
    initialVolume = DEFAULT_VOLUME,
  ) {
    const saved = Number.parseFloat(localStorage.getItem(VOLUME_KEY) ?? "");
    this.volume = Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : initialVolume;
  }

  get currentTime(): number {
    return this.context?.currentTime ?? 0;
  }

  get presentationTime(): number {
    if (!this.context) return 0;
    const audibleTime = getAudibleContextTime(
      this.context,
      performance.now(),
      GRAPH_LATENCY_SECONDS,
    );
    this.lastPresentationTime = Math.max(this.lastPresentationTime, audibleTime);
    return this.lastPresentationTime;
  }

  get currentVolume(): number {
    return this.volume;
  }

  get sampleRateHz(): number | null {
    return this.context?.sampleRate ?? null;
  }

  get initialized(): boolean {
    return this.context !== null;
  }

  get departureGain(): number {
    if (this.disposed) return 0;
    if (!this.departure) return 1;
    // The master follows the graph, so its envelope needs device latency only.
    const now = this.context
      ? getAudibleContextTime(this.context, performance.now(), 0)
      : performance.now() / 1_000;
    return Math.min(1, Math.max(0, 1 - (now - this.departure.start) / this.departure.duration));
  }

  get departureSecondsRemaining(): number {
    return (this.departure?.duration ?? 0) * this.departureGain;
  }

  private readonly handleWorkletMessage = ({ data }: MessageEvent<unknown>) => {
    if (typeof data === "object" && data !== null && "type" in data && data.type === "error") {
      this.fail(
        new Error(
          "message" in data && typeof data.message === "string"
            ? data.message
            : "音声処理が停止しました",
        ),
      );
      return;
    }
    const observation = parsePositionObservation(data, this.playbackRequest);
    if (!observation || !this.active) return;
    this.latestPosition = observation;
    this.positionReceivedMs = performance.now();
  };

  private readonly handleProcessorError = () => {
    this.fail(new Error("音声処理が停止しました"));
  };

  subscribeToErrors(listener: (error: Error) => void): () => void {
    this.errorListeners.add(listener);
    if (this.failure && !this.disposed) listener(this.failure);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  private fail(error: Error): void {
    if (this.disposed || this.fadeOutDisposal || this.failure) return;
    this.failure = error;
    this.pause();
    for (const listener of this.errorListeners) listener(error);
  }

  get observedPosition(): PositionObservation | null {
    return this.active && performance.now() - this.positionReceivedMs < 1_500
      ? this.latestPosition
      : null;
  }

  requestPositionObservation(): void {
    if (this.active)
      this.source?.port.postMessage({ type: "observe-position", requestId: this.playbackRequest });
  }

  readSynchronization(displayedTimeSeconds: number): ReturnType<typeof measureSynchronization> {
    const observation = this.observedPosition;
    return observation
      ? measureSynchronization(observation, this.presentationTime, displayedTimeSeconds)
      : null;
  }

  initialize(): Promise<void> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.disposed || this.fadeOutDisposal) {
      return Promise.reject(new Error("AudioEngine has been disposed"));
    }
    if (this.context) return Promise.resolve();
    if (this.initialization) return this.initialization;

    this.initialization = this.initializeContext();
    return this.initialization;
  }

  private async initializeContext(): Promise<void> {
    const context = new AudioContext({ latencyHint: "interactive" });
    try {
      await context.audioWorklet.addModule("/audio/fourier-worklet.js?v=30");
      if (this.disposed) {
        await context.close();
        return;
      }

      const source = new AudioWorkletNode(context, "fourier-garden-processor", {
        numberOfOutputs: 2,
        outputChannelCount: [2, 2],
      });
      source.port.addEventListener("message", this.handleWorkletMessage);
      source.addEventListener("processorerror", this.handleProcessorError);
      source.port.start();
      source.port.postMessage(createWorkletConfigureMessage(this.program.worklet));

      const output = connectAudioOutputGraph(
        context,
        {
          connectDry: (destination) => {
            source.connect(destination, 0, 0);
          },
          connectWet: (destination) => {
            source.connect(destination, 1, 0);
          },
        },
        this.program.graph,
      );

      this.context = context;
      this.source = source;
      this.master = output.master;
      this.analyser = output.analyser;
      this.audioNodes = output.nodes;
    } catch (error) {
      await context.close();
      throw error;
    } finally {
      this.initialization = null;
    }
  }

  async play(
    positionSeconds: number,
    fadeInSeconds = AUDIO_DEFAULT_FADE_IN_SECONDS,
  ): Promise<number> {
    if (!Number.isFinite(positionSeconds) || positionSeconds < 0) {
      throw new Error("Audio position must be finite and nonnegative");
    }
    if (!Number.isFinite(fadeInSeconds) || fadeInSeconds < 0.065 || fadeInSeconds > 1) {
      throw new Error("Audio entrance must last between 0.065 and 1 second");
    }
    const request = ++this.playbackRequest;
    this.latestPosition = null;
    await this.initialize();
    this.assertPlaybackRequest(request);
    await this.context?.resume();
    this.assertPlaybackRequest(request);
    const context = this.context;
    if (!context || this.disposed) throw new Error("AudioEngine has been disposed");
    const epoch =
      Math.ceil((context.currentTime + AUDIO_START_LEAD_SECONDS) * context.sampleRate) /
      context.sampleRate;
    this.source?.port.postMessage({
      type: "start",
      seconds: positionSeconds,
      contextTime: epoch,
    });
    this.rampMaster(this.muted ? 0 : this.volumeToGain(this.volume), fadeInSeconds, epoch);
    this.active = true;
    return epoch;
  }

  pause(): void {
    ++this.playbackRequest;
    this.latestPosition = null;
    this.source?.port.postMessage({ type: "active", value: false });
    this.rampMaster(0, AUDIO_MASTER_FADE_OUT_SECONDS);
    this.active = false;
  }

  fadeOutAndDispose(options: { preserveTail?: boolean } = {}): Promise<void> {
    this.fadeOutDisposal ??= this.performFadeOutAndDispose(options.preserveTail ?? false);
    return this.fadeOutDisposal;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.rampMaster(this.active && !muted ? this.volumeToGain(this.volume) : 0, 0.08);
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    localStorage.setItem(VOLUME_KEY, String(this.volume));
    this.rampMaster(this.active && !this.muted ? this.volumeToGain(this.volume) : 0, 0.08);
  }

  getFrequencyData(target: Uint8Array<ArrayBuffer>): void {
    this.analyser?.getByteFrequencyData(target);
  }

  getWaveformData(target: Uint8Array<ArrayBuffer>): void {
    this.analyser?.getByteTimeDomainData(target);
  }

  dispose(): Promise<void> {
    this.disposal ??= this.performDispose();
    return this.disposal;
  }

  private async performDispose(): Promise<void> {
    this.disposed = true;
    this.errorListeners.clear();
    if (this.disposalTimer !== null) clearTimeout(this.disposalTimer);
    this.disposalTimer = null;
    this.finishFade?.();
    this.finishFade = null;
    ++this.playbackRequest;
    await this.initialization?.catch(() => {});
    this.active = false;
    this.latestPosition = null;
    this.source?.port.removeEventListener("message", this.handleWorkletMessage);
    this.source?.removeEventListener("processorerror", this.handleProcessorError);
    this.source?.disconnect();
    for (const node of this.audioNodes) {
      node.disconnect();
    }
    await this.context?.close();
    this.source = null;
    this.master = null;
    this.analyser = null;
    this.audioNodes = [];
    this.context = null;
    this.lastPresentationTime = 0;
  }

  private rampMaster(value: number, duration: number, startTime?: number): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    if (startTime !== undefined) this.master.gain.setValueAtTime(this.master.gain.value, startTime);
    this.master.gain.linearRampToValueAtTime(value, (startTime ?? now) + duration);
  }

  private assertPlaybackRequest(request: number): void {
    if (this.failure) throw this.failure;
    if (this.disposed || this.fadeOutDisposal) throw new Error("AudioEngine has been disposed");
    if (request !== this.playbackRequest)
      throw new DOMException("Playback request was superseded", "AbortError");
  }

  private async performFadeOutAndDispose(preserveTail: boolean): Promise<void> {
    const shouldWaitForFade =
      preserveTail || (this.active && this.context !== null && this.master !== null);
    const duration = preserveTail
      ? Math.min(0.85, Math.max(0.5, this.program.graph.roomSeconds))
      : AUDIO_MASTER_FADE_OUT_SECONDS;
    this.departure = { start: this.context?.currentTime ?? performance.now() / 1_000, duration };
    ++this.playbackRequest;
    this.latestPosition = null;
    this.source?.port.postMessage({ type: "active", value: false });
    this.rampMaster(0, duration);
    this.active = false;
    if (shouldWaitForFade) {
      await new Promise<void>((resolve) => {
        this.finishFade = resolve;
        this.disposalTimer = setTimeout(() => {
          this.disposalTimer = null;
          this.finishFade = null;
          resolve();
        }, duration * 1_000);
      });
    }
    await this.dispose();
  }

  private volumeToGain(volume: number): number {
    return volumeToMasterGain(volume);
  }
}
