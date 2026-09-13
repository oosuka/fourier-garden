import { createSeededRandom } from "../core/seed";
import { createWorkletConfigureMessage, type AudioEngineProgram } from "./audioProgram";
import { getAudibleContextTime } from "./presentationClock";
import {
  measureSynchronization,
  parsePositionObservation,
  type PositionObservation,
} from "./positionObservation";

const VOLUME_KEY = "fourier-garden:volume";
const DEFAULT_VOLUME = 0.35;
const MASTER_FADE_OUT_SECONDS = 0.16;
const START_LEAD_SECONDS = 0.05;
// Chromium's compressor look-ahead. Device latency is obtained separately from its timestamp.
const GRAPH_LATENCY_SECONDS = 0.006;

export function createLimiterCurve(ceilingDbfs: number, length = 2_049): Float32Array<ArrayBuffer> {
  if (!Number.isFinite(ceilingDbfs)) {
    throw new Error("Limiter ceiling must be finite");
  }
  if (!Number.isInteger(length) || length < 2) {
    throw new Error("Limiter curve length must be an integer of at least two");
  }

  const ceiling = 10 ** (ceilingDbfs / 20);
  return Float32Array.from({ length }, (_, index) => {
    const input = (index / (length - 1)) * 2 - 1;
    return Math.max(-ceiling, Math.min(ceiling, input));
  });
}

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

      const highPass = new BiquadFilterNode(context, {
        type: "highpass",
        frequency: this.program.graph.dryHighPassHz,
        Q: this.program.graph.dryHighPassQ,
      });
      const highShelf = new BiquadFilterNode(context, {
        type: "highshelf",
        frequency: this.program.graph.dryHighShelfHz,
        gain: this.program.graph.dryHighShelfGainDb,
      });
      const softLowPass = new BiquadFilterNode(context, {
        type: "lowpass",
        frequency: this.program.graph.dryLowPassHz,
        Q: this.program.graph.dryLowPassQ,
      });
      const dry = new GainNode(context, { gain: this.program.graph.dryGain });
      const wetHighPass = new BiquadFilterNode(context, {
        type: "highpass",
        frequency: this.program.graph.wetHighPassHz,
        Q: this.program.graph.wetHighPassQ,
      });
      const wetLowPass = new BiquadFilterNode(context, {
        type: "lowpass",
        frequency: this.program.graph.wetLowPassHz,
        Q: this.program.graph.wetLowPassQ,
      });
      const wet = new GainNode(context, { gain: this.program.graph.wetGain });
      const convolver = new ConvolverNode(context, {
        buffer: this.createImpulse(
          context,
          this.program.graph.roomSeconds,
          this.program.graph.roomDecay,
        ),
      });
      const compressor = new DynamicsCompressorNode(context, {
        threshold: this.program.graph.compressor.thresholdDb,
        knee: this.program.graph.compressor.kneeDb,
        ratio: this.program.graph.compressor.ratio,
        attack: this.program.graph.compressor.attackSeconds,
        release: this.program.graph.compressor.releaseSeconds,
      });
      const limiter =
        this.program.graph.limiterCeilingDbfs === null
          ? null
          : new WaveShaperNode(context, {
              curve: createLimiterCurve(this.program.graph.limiterCeilingDbfs),
              oversample: "4x",
            });
      const analyser = new AnalyserNode(context, {
        fftSize: 2_048,
        smoothingTimeConstant: 0.86,
      });
      const master = new GainNode(context, {
        gain: 0,
      });

      source.connect(highPass, 0, 0).connect(highShelf).connect(softLowPass);
      softLowPass.connect(dry).connect(compressor);
      source
        .connect(wetHighPass, 1, 0)
        .connect(convolver)
        .connect(wetLowPass)
        .connect(wet)
        .connect(compressor);
      if (limiter) {
        compressor.connect(limiter).connect(analyser);
      } else {
        compressor.connect(analyser);
      }
      analyser.connect(master).connect(context.destination);

      this.context = context;
      this.source = source;
      this.master = master;
      this.analyser = analyser;
      this.audioNodes = [
        highPass,
        highShelf,
        softLowPass,
        dry,
        wetHighPass,
        wetLowPass,
        wet,
        convolver,
        compressor,
        ...(limiter ? [limiter] : []),
        analyser,
        master,
      ];
    } catch (error) {
      await context.close();
      throw error;
    } finally {
      this.initialization = null;
    }
  }

  async play(positionSeconds: number, fadeInSeconds = 0.065): Promise<number> {
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
      Math.ceil((context.currentTime + START_LEAD_SECONDS) * context.sampleRate) /
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
    this.rampMaster(0, MASTER_FADE_OUT_SECONDS);
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
      : MASTER_FADE_OUT_SECONDS;
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
    return volume * volume * 0.72;
  }

  private createImpulse(context: AudioContext, seconds: number, decay: number): AudioBuffer {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    const random = createSeededRandom(41_041);

    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const envelope = Math.pow(1 - index / length, decay);
        const diffusion = Math.sin(index * (0.0113 + channel * 0.0007)) * 0.18;
        data[index] = ((random() * 2 - 1) * 0.82 + diffusion) * envelope;
      }
    }

    return buffer;
  }
}
