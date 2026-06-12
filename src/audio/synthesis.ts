import { RESIDUE_BLOOM_SERIES, getAnalyticSpectrum } from "../math/fourier";

export interface AudioPartial {
  harmonic: number;
  sourceFrequencyHz: number;
  sourceAmplitude: number;
  sinePhase: number;
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
  antiAliasRatio: number;
  outputGain: number;
}

export interface SonificationComponent extends AudioPartial {
  audibleFrequencyHz: number;
  weightedAmplitude: number;
  included: boolean;
}

export function createAudioPartials(fundamentalHz: number): AudioPartial[] {
  return getAnalyticSpectrum(RESIDUE_BLOOM_SERIES, fundamentalHz).map((bin) => ({
    harmonic: bin.harmonic,
    sourceFrequencyHz: bin.frequencyHz,
    sourceAmplitude: bin.amplitude,
    sinePhase: bin.sinePhase,
  }));
}

export function createRhythmPreset(fundamentalHz: number): AudioRhythmPreset {
  const bpm = 80;
  const stepsPerBeat = 4;
  const pitchMultipliers = [9, 8, 8, 9];

  return {
    bpm,
    stepsPerBeat,
    stepSeconds: 60 / bpm / stepsPerBeat,
    frequenciesHz: pitchMultipliers.map((multiplier) => fundamentalHz * multiplier),
    attackSeconds: 0.006,
    decaySeconds: 0.075,
    releaseSeconds: 0.024,
    timbreDamping: 1.4,
    antiAliasRatio: 0.9,
    outputGain: 0.5,
  };
}

export function getSonificationComponents(
  fundamentalHz: number,
  carrierHz: number,
  sampleRate: number,
): SonificationComponent[] {
  const rhythm = createRhythmPreset(fundamentalHz);
  const frequencyLimit = sampleRate * 0.5 * rhythm.antiAliasRatio;

  return createAudioPartials(fundamentalHz).map((partial, index) => {
    const audibleFrequencyHz = carrierHz * partial.harmonic;

    return {
      harmonic: partial.harmonic,
      sourceFrequencyHz: partial.sourceFrequencyHz,
      sourceAmplitude: partial.sourceAmplitude,
      sinePhase: partial.sinePhase,
      audibleFrequencyHz,
      weightedAmplitude: partial.sourceAmplitude / Math.pow(index + 1, rhythm.timbreDamping),
      included: audibleFrequencyHz < frequencyLimit,
    };
  });
}

function smoothstep(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function getPluckEnvelope(localTime: number, rhythm: AudioRhythmPreset): number {
  const attack =
    localTime < rhythm.attackSeconds
      ? smoothstep(localTime / rhythm.attackSeconds)
      : Math.exp(-(localTime - rhythm.attackSeconds) / rhythm.decaySeconds);
  const release = smoothstep((rhythm.stepSeconds - localTime) / rhythm.releaseSeconds);
  return attack * release;
}

export function renderRhythmicSeries({
  durationSeconds,
  sampleRate,
  fundamentalHz,
}: RenderOptions): number[] {
  const rhythm = createRhythmPreset(fundamentalHz);
  const componentsByCarrier = new Map(
    rhythm.frequenciesHz.map((carrier) => [
      carrier,
      getSonificationComponents(fundamentalHz, carrier, sampleRate).filter(
        (component) => component.included,
      ),
    ]),
  );
  const sampleCount = Math.floor(durationSeconds * sampleRate);

  return Array.from({ length: sampleCount }, (_, sample) => {
    const time = sample / sampleRate;
    const stepIndex = Math.floor(time / rhythm.stepSeconds);
    const localTime = time - stepIndex * rhythm.stepSeconds;
    const carrier = rhythm.frequenciesHz[stepIndex % rhythm.frequenciesHz.length]!;
    const components = componentsByCarrier.get(carrier) ?? [];
    const normalization = components.reduce(
      (sum, component) => sum + component.weightedAmplitude,
      0,
    );
    const envelope = getPluckEnvelope(localTime, rhythm);
    let value = 0;

    for (const component of components) {
      value +=
        Math.sin(Math.PI * 2 * component.audibleFrequencyHz * localTime + component.sinePhase) *
        component.weightedAmplitude;
    }

    return (normalization > 0 ? value / normalization : 0) * envelope * rhythm.outputGain;
  });
}

export function renderRawSeries({
  durationSeconds,
  sampleRate,
  fundamentalHz,
}: RenderOptions): number[] {
  const partials = createAudioPartials(fundamentalHz);
  const normalization = partials.reduce((sum, partial) => sum + partial.sourceAmplitude, 0);
  const sampleCount = Math.floor(durationSeconds * sampleRate);

  return Array.from({ length: sampleCount }, (_, sample) => {
    const time = sample / sampleRate;
    const value = partials.reduce(
      (sum, partial) =>
        sum +
        partial.sourceAmplitude *
          Math.sin(Math.PI * 2 * partial.sourceFrequencyHz * time + partial.sinePhase),
      0,
    );
    return value / normalization;
  });
}
