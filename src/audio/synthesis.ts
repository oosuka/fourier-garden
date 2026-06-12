import { RESIDUE_BLOOM_SERIES, getAnalyticSpectrum } from "../math/fourier";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  evaluateMusicalScore,
  type MusicalScoreDefinition,
  type MusicalScoreProgram,
} from "./musicalScore";

export interface AudioPartial {
  harmonic: number;
  sourceFrequencyHz: number;
  sourceAmplitude: number;
  sinePhase: number;
}

interface RawRenderOptions {
  durationSeconds: number;
  sampleRate: number;
  fundamentalHz: number;
}

interface RhythmicRenderOptions {
  durationSeconds: number;
  sampleRate: number;
  score: MusicalScoreProgram;
  startTimeSeconds?: number;
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
  stereoDetuneRatio: number;
  outputGain: number;
}

export interface SonificationComponent extends AudioPartial {
  nominalFrequencyHz: number;
  leftFrequencyHz: number;
  rightFrequencyHz: number;
  weightedAmplitude: number;
  included: boolean;
}

export interface WorkletConfigurationMessage {
  type: "configure";
  partials: AudioPartial[];
  score: MusicalScoreProgram;
}

export function createAudioPartials(fundamentalHz: number): AudioPartial[] {
  return getAnalyticSpectrum(RESIDUE_BLOOM_SERIES, fundamentalHz).map((bin) => ({
    harmonic: bin.harmonic,
    sourceFrequencyHz: bin.frequencyHz,
    sourceAmplitude: bin.amplitude,
    sinePhase: bin.sinePhase,
  }));
}

export function createWorkletConfiguration(
  score: MusicalScoreProgram,
): WorkletConfigurationMessage {
  return {
    type: "configure",
    partials: createAudioPartials(score.fundamentalHz),
    score,
  };
}

export function createRhythmPreset(fundamentalHz: number): AudioRhythmPreset {
  const definition = RESIDUE_BLOOM_SCORE_DEFINITION;

  return {
    bpm: definition.bpm,
    stepsPerBeat: definition.stepsPerBeat,
    stepSeconds: 60 / definition.bpm / definition.stepsPerBeat,
    frequenciesHz: definition.carrierMultipliers.map((multiplier) => fundamentalHz * multiplier),
    attackSeconds: definition.attackSeconds,
    decaySeconds: definition.decaySeconds,
    releaseSeconds: definition.releaseSeconds,
    timbreDamping: definition.timbreDamping,
    antiAliasRatio: definition.antiAliasRatio,
    stereoDetuneRatio: definition.stereoDetuneRatio,
    outputGain: definition.outputGain,
  };
}

export function getSonificationComponents(
  fundamentalHz: number,
  carrierHz: number,
  sampleRate: number,
  scoreDefinition: MusicalScoreDefinition,
): SonificationComponent[] {
  const frequencyLimit = sampleRate * 0.5 * scoreDefinition.antiAliasRatio;

  return createAudioPartials(fundamentalHz).map((partial, index) => {
    const nominalFrequencyHz = carrierHz * partial.harmonic;
    const leftFrequencyHz = nominalFrequencyHz * (1 - scoreDefinition.stereoDetuneRatio);
    const rightFrequencyHz = nominalFrequencyHz * (1 + scoreDefinition.stereoDetuneRatio);
    const maximumGeneratedFrequencyHz = Math.max(leftFrequencyHz, rightFrequencyHz);

    return {
      ...partial,
      nominalFrequencyHz,
      leftFrequencyHz,
      rightFrequencyHz,
      weightedAmplitude:
        partial.sourceAmplitude / Math.pow(index + 1, scoreDefinition.timbreDamping),
      included: maximumGeneratedFrequencyHz < frequencyLimit,
    };
  });
}

export function renderRhythmicSeries({
  durationSeconds,
  sampleRate,
  score,
  startTimeSeconds = 0,
}: RhythmicRenderOptions): number[] {
  const absoluteStartSeconds = Math.max(0, startTimeSeconds);
  const carriers = Array.from(
    new Set(score.events.filter((event) => event.active).map((event) => event.carrierHz)),
  );
  const componentsByCarrier = new Map(
    carriers.map((carrier) => [
      carrier,
      getSonificationComponents(score.fundamentalHz, carrier, sampleRate, score.definition).filter(
        (component) => component.included,
      ),
    ]),
  );
  const sampleCount = Math.floor(durationSeconds * sampleRate);
  const samples = Array.from({ length: sampleCount }, () => 0);
  let filterState = 0;

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const frame = evaluateMusicalScore(score, absoluteStartSeconds + sample / sampleRate);
    const components = frame.event.active
      ? (componentsByCarrier.get(frame.event.carrierHz) ?? [])
      : [];
    const normalization = components.reduce(
      (sum, component) => sum + component.weightedAmplitude,
      0,
    );
    let value = 0;

    for (const component of components) {
      value +=
        Math.sin(
          Math.PI * 2 * component.nominalFrequencyHz * frame.localStepTimeSeconds +
            component.sinePhase,
        ) * component.weightedAmplitude;
    }

    const dryValue =
      (normalization > 0 ? value / normalization : 0) *
      frame.noteEnvelope *
      frame.event.baseGain *
      frame.event.accent *
      score.definition.outputGain;
    const minimumCutoffHz = 1_800;
    const maximumCutoffHz = Math.min(6_200, sampleRate * 0.18);
    const cutoffHz = minimumCutoffHz + (maximumCutoffHz - minimumCutoffHz) * frame.event.brightness;
    const filterCoefficient = 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
    filterState += (dryValue - filterState) * filterCoefficient;
    samples[sample] = filterState;
  }

  return samples;
}

export function renderRawSeries({
  durationSeconds,
  sampleRate,
  fundamentalHz,
}: RawRenderOptions): number[] {
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
