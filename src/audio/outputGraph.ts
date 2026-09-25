import { createSeededRandom } from "../core/seed";
import type { AudioGraphPreset } from "./audioProgram";

export const ROOM_IMPULSE_SEED = 41_041;
export const AUDIO_START_LEAD_SECONDS = 0.05;
export const AUDIO_DEFAULT_FADE_IN_SECONDS = 0.065;
export const AUDIO_MASTER_FADE_OUT_SECONDS = 0.16;

export function volumeToMasterGain(volume: number): number {
  return volume * volume * 0.72;
}

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

export function createRoomImpulseBuffer(
  context: BaseAudioContext,
  seconds: number,
  decay: number,
  seed = ROOM_IMPULSE_SEED,
): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  const random = createSeededRandom(seed);

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

export interface AudioOutputGraph {
  analyser: AnalyserNode;
  master: GainNode;
  nodes: AudioNode[];
}

export interface AudioOutputInput {
  connectDry(destination: AudioNode): void;
  connectWet(destination: AudioNode): void;
}

/** Builds the shared post-worklet chain used by live playback and offline QA. */
export function connectAudioOutputGraph(
  context: BaseAudioContext,
  source: AudioOutputInput,
  preset: AudioGraphPreset,
): AudioOutputGraph {
  const highPass = new BiquadFilterNode(context, {
    type: "highpass",
    frequency: preset.dryHighPassHz,
    Q: preset.dryHighPassQ,
  });
  const highShelf = new BiquadFilterNode(context, {
    type: "highshelf",
    frequency: preset.dryHighShelfHz,
    gain: preset.dryHighShelfGainDb,
  });
  const softLowPass = new BiquadFilterNode(context, {
    type: "lowpass",
    frequency: preset.dryLowPassHz,
    Q: preset.dryLowPassQ,
  });
  const dry = new GainNode(context, { gain: preset.dryGain });
  const wetHighPass = new BiquadFilterNode(context, {
    type: "highpass",
    frequency: preset.wetHighPassHz,
    Q: preset.wetHighPassQ,
  });
  const wetLowPass = new BiquadFilterNode(context, {
    type: "lowpass",
    frequency: preset.wetLowPassHz,
    Q: preset.wetLowPassQ,
  });
  const wet = new GainNode(context, { gain: preset.wetGain });
  const convolver = new ConvolverNode(context, {
    buffer: createRoomImpulseBuffer(context, preset.roomSeconds, preset.roomDecay),
  });
  const compressor = new DynamicsCompressorNode(context, {
    threshold: preset.compressor.thresholdDb,
    knee: preset.compressor.kneeDb,
    ratio: preset.compressor.ratio,
    attack: preset.compressor.attackSeconds,
    release: preset.compressor.releaseSeconds,
  });
  const limiter =
    preset.limiterCeilingDbfs === null
      ? null
      : new WaveShaperNode(context, {
          curve: createLimiterCurve(preset.limiterCeilingDbfs),
          oversample: "4x",
        });
  const analyser = new AnalyserNode(context, {
    fftSize: 2_048,
    smoothingTimeConstant: 0.86,
  });
  const master = new GainNode(context, { gain: 0 });

  source.connectDry(highPass);
  highPass.connect(highShelf).connect(softLowPass);
  softLowPass.connect(dry).connect(compressor);
  source.connectWet(wetHighPass);
  wetHighPass.connect(convolver).connect(wetLowPass).connect(wet).connect(compressor);
  if (limiter) {
    compressor.connect(limiter).connect(analyser);
  } else {
    compressor.connect(analyser);
  }
  analyser.connect(master).connect(context.destination);

  return {
    analyser,
    master,
    nodes: [
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
    ],
  };
}
