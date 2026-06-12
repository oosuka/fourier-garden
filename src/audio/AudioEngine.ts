import { createSeededRandom } from "../core/seed";
import {
  createAudioPartials,
  createRhythmPreset,
} from "./synthesis";

const VOLUME_KEY = "fourier-garden:volume";

export class AudioEngine {
  private context: AudioContext | null = null;
  private source: AudioWorkletNode | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private volume: number;

  constructor(
    private readonly fundamentalHz = 55,
    initialVolume = 0.35,
  ) {
    const saved = Number.parseFloat(localStorage.getItem(VOLUME_KEY) ?? "");
    this.volume = Number.isFinite(saved)
      ? Math.min(1, Math.max(0, saved))
      : initialVolume;
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

  async initialize(): Promise<void> {
    if (this.context) return;

    const context = new AudioContext({ latencyHint: "interactive" });
    await context.audioWorklet.addModule(
      "/audio/fourier-worklet.js?v=3",
    );

    const source = new AudioWorkletNode(
      context,
      "fourier-garden-processor",
      {
        numberOfOutputs: 1,
        outputChannelCount: [2],
      },
    );
    source.port.postMessage({
      type: "configure",
      partials: createAudioPartials(this.fundamentalHz),
      rhythm: createRhythmPreset(this.fundamentalHz),
    });

    const highPass = new BiquadFilterNode(context, {
      type: "highpass",
      frequency: 125,
      Q: 0.45,
    });
    const highShelf = new BiquadFilterNode(context, {
      type: "highshelf",
      frequency: 3_200,
      gain: -2.2,
    });
    const softLowPass = new BiquadFilterNode(context, {
      type: "lowpass",
      frequency: 4_600,
      Q: 0.3,
    });
    const dry = new GainNode(context, { gain: 0.88 });
    const wet = new GainNode(context, { gain: 0.16 });
    const convolver = new ConvolverNode(context, {
      buffer: this.createImpulse(context, 1.9, 3.4),
    });
    const compressor = new DynamicsCompressorNode(context, {
      threshold: -12,
      knee: 12,
      ratio: 3,
      attack: 0.006,
      release: 0.2,
    });
    const analyser = new AnalyserNode(context, {
      fftSize: 2_048,
      smoothingTimeConstant: 0.86,
    });
    const master = new GainNode(context, {
      gain: this.volumeToGain(this.volume),
    });

    source.connect(highPass).connect(highShelf).connect(softLowPass);
    softLowPass.connect(dry).connect(compressor);
    softLowPass.connect(convolver).connect(wet).connect(compressor);
    compressor.connect(analyser).connect(master).connect(context.destination);

    this.context = context;
    this.source = source;
    this.master = master;
    this.analyser = analyser;
  }

  async play(positionSeconds: number): Promise<void> {
    await this.initialize();
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
    this.source?.disconnect();
    this.master?.disconnect();
    await this.context?.close();
    this.source = null;
    this.master = null;
    this.analyser = null;
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

  private createImpulse(
    context: AudioContext,
    seconds: number,
    decay: number,
  ): AudioBuffer {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    const random = createSeededRandom(41_041);

    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const envelope = Math.pow(1 - index / length, decay);
        const diffusion =
          Math.sin(index * (0.0113 + channel * 0.0007)) * 0.18;
        data[index] = ((random() * 2 - 1) * 0.82 + diffusion) * envelope;
      }
    }

    return buffer;
  }
}
