import { createSeededRandom } from "../core/seed";
import { createWorkletConfigureMessage, type AudioEngineProgram } from "./audioProgram";

const VOLUME_KEY = "fourier-garden:volume";
const DEFAULT_VOLUME = 0.35;

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
  private volume: number;
  private disposed = false;

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

  get currentVolume(): number {
    return this.volume;
  }

  get initialized(): boolean {
    return this.context !== null;
  }

  initialize(): Promise<void> {
    if (this.disposed) {
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
      await context.audioWorklet.addModule("/audio/fourier-worklet.js?v=16");
      if (this.disposed) {
        await context.close();
        return;
      }

      const source = new AudioWorkletNode(context, "fourier-garden-processor", {
        numberOfOutputs: 2,
        outputChannelCount: [2, 2],
      });
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
        gain: this.volumeToGain(this.volume),
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

  async play(positionSeconds: number): Promise<void> {
    await this.initialize();
    if (this.disposed) {
      throw new Error("AudioEngine has been disposed");
    }
    await this.context?.resume();
    this.source?.port.postMessage({
      type: "seek",
      seconds: positionSeconds,
    });
    this.source?.port.postMessage({ type: "active", value: true });
    this.rampMaster(this.volumeToGain(this.volume), 0.22);
  }

  pause(): void {
    this.source?.port.postMessage({ type: "active", value: false });
    this.rampMaster(0, 0.16);
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    localStorage.setItem(VOLUME_KEY, String(this.volume));
    this.rampMaster(this.volumeToGain(this.volume), 0.08);
  }

  getFrequencyData(target: Uint8Array<ArrayBuffer>): void {
    this.analyser?.getByteFrequencyData(target);
  }

  getWaveformData(target: Uint8Array<ArrayBuffer>): void {
    this.analyser?.getByteTimeDomainData(target);
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      await this.initialization?.catch(() => {});
      return;
    }
    this.disposed = true;
    await this.initialization?.catch(() => {});
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
  }

  private rampMaster(value: number, duration: number): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(value, now + duration);
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
