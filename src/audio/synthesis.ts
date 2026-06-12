import {
  RESIDUE_BLOOM_SERIES,
  getAnalyticSpectrum,
} from "../math/fourier";

export interface AudioPartial {
  harmonic: number;
  frequencyHz: number;
  gain: number;
  phase: number;
}

interface RenderOptions {
  durationSeconds: number;
  sampleRate: number;
  fundamentalHz: number;
}

export interface AudioRhythmPreset {
  bpm: number;
  stepsPerBeat: number;
  stepSeconds: number;
  frequenciesHz: number[];
  attackSeconds: number;
  decaySeconds: number;
  releaseSeconds: number;
  timbreDamping: number;
  outputGain: number;
}

export function createAudioPartials(
  fundamentalHz: number,
): AudioPartial[] {
  return getAnalyticSpectrum(RESIDUE_BLOOM_SERIES, fundamentalHz).map(
    (bin, index) => ({
      harmonic: bin.harmonic,
      frequencyHz: bin.frequencyHz,
      gain: 1 / (index + 1),
      phase: bin.phase,
    }),
  );
}

export function createRhythmPreset(
  fundamentalHz: number,
): AudioRhythmPreset {
  const bpm = 80;
  const stepsPerBeat = 4;
  const pitchMultipliers = [9, 8, 8, 9];

  return {
    bpm,
    stepsPerBeat,
    stepSeconds: 60 / bpm / stepsPerBeat,
    frequenciesHz: pitchMultipliers.map(
      (multiplier) => fundamentalHz * multiplier,
    ),
    attackSeconds: 0.006,
    decaySeconds: 0.075,
    releaseSeconds: 0.024,
    timbreDamping: 1.4,
    outputGain: 0.5,
  };
}

function smoothstep(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function getPluckEnvelope(
  localTime: number,
  rhythm: AudioRhythmPreset,
): number {
  const attack =
    localTime < rhythm.attackSeconds
      ? smoothstep(localTime / rhythm.attackSeconds)
      : Math.exp(
          -(localTime - rhythm.attackSeconds) /
            rhythm.decaySeconds,
        );
  const release = smoothstep(
    (rhythm.stepSeconds - localTime) / rhythm.releaseSeconds,
  );
  return attack * release;
}

export function renderRhythmicSeries({
  durationSeconds,
  sampleRate,
  fundamentalHz,
}: RenderOptions): number[] {
  const partials = createAudioPartials(fundamentalHz);
  const rhythm = createRhythmPreset(fundamentalHz);
  const dampedGains = partials.map(
    (partial, index) =>
      partial.gain / Math.pow(index + 1, rhythm.timbreDamping),
  );
  const normalization = dampedGains.reduce(
    (sum, gain) => sum + gain,
    0,
  );
  const sampleCount = Math.floor(durationSeconds * sampleRate);

  return Array.from({ length: sampleCount }, (_, sample) => {
    const time = sample / sampleRate;
    const stepIndex = Math.floor(time / rhythm.stepSeconds);
    const localTime = time - stepIndex * rhythm.stepSeconds;
    const carrier =
      rhythm.frequenciesHz[
        stepIndex % rhythm.frequenciesHz.length
      ]!;
    const envelope = getPluckEnvelope(localTime, rhythm);
    let value = 0;

    for (let index = 0; index < partials.length; index += 1) {
      const partial = partials[index]!;
      const frequency = carrier * partial.harmonic;
      if (frequency >= sampleRate * 0.45) continue;
      value +=
        Math.cos(
          Math.PI * 2 * frequency * localTime + partial.phase,
        ) * dampedGains[index]!;
    }

    return (
      (value / normalization) * envelope * rhythm.outputGain
    );
  });
}

export function renderRawSeries({
  durationSeconds,
  sampleRate,
  fundamentalHz,
}: RenderOptions): number[] {
  const partials = createAudioPartials(fundamentalHz);
  const normalization = partials.reduce(
    (sum, partial) => sum + partial.gain,
    0,
  );
  const sampleCount = Math.floor(durationSeconds * sampleRate);

  return Array.from({ length: sampleCount }, (_, sample) => {
    const time = sample / sampleRate;
    const value = partials.reduce(
      (sum, partial) =>
        sum +
        partial.gain *
          Math.cos(
            Math.PI * 2 * partial.frequencyHz * time + partial.phase,
          ),
      0,
    );
    return value / normalization;
  });
}
