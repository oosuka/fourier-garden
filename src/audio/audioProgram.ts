import type { MusicalScoreProgram } from "../patterns/residue-bloom/audio/score";
import type {
  MobiusChoirGesture,
  MobiusChoirScoreProgram,
  MobiusChoirVowel,
} from "../patterns/mobius-choir/audio/score";
import type {
  SpectralCathedralGesture,
  SpectralCathedralScoreProgram,
} from "../patterns/spectral-cathedral/audio/score";

export interface ResidueBloomAudioPartial {
  harmonic: number;
  sourceFrequencyHz: number;
  sourceAmplitude: number;
  sinePhase: number;
}

export interface ResidueBloomWorkletProgram {
  kind: "residue-bloom";
  partials: readonly ResidueBloomAudioPartial[];
  score: MusicalScoreProgram;
}

export interface SpectralCathedralAudioMode {
  id: number;
  eigenvalue: number;
  coefficient: number;
  baseFrequencyHz: number;
  normalizedGain: number;
  modalAngularFrequency: number;
  coefficientPhaseOffset: number;
}

export interface SpectralCathedralArticulationPreset {
  attackSeconds: number;
  decaySeconds: number;
  fadeStartSeconds: number;
  endSeconds: number;
  woodAttackGain: number;
}

export interface SpectralCathedralSynthesisPreset {
  maximumPartials: number;
  partialDamping: number;
  articulations: Readonly<Record<SpectralCathedralGesture, SpectralCathedralArticulationPreset>>;
  maximumEventSeconds: number;
  woodAttackSeconds: number;
  woodMinimumHz: number;
  woodMaximumHz: number;
  woodComponentCount: number;
  stereoDetuneRatio: number;
  antiAliasRatio: number;
  outputGain: number;
}

export interface SpectralCathedralWorkletProgram {
  kind: "spectral-cathedral";
  score: SpectralCathedralScoreProgram;
  modes: readonly SpectralCathedralAudioMode[];
  synthesis: SpectralCathedralSynthesisPreset;
  normalization: number;
}

export interface MobiusChoirAudioMode {
  id: number;
  m: number;
  n: number;
  eigenvalue: number;
  coefficient: number;
  baseFrequencyHz: number;
  normalizedGain: number;
  modalAngularFrequency: number;
  voiceKind: "single" | "quadrature-pair";
}

export interface MobiusChoirArticulationPreset {
  attackSeconds: number;
  decaySeconds: number;
  fadeStartSeconds: number;
  endSeconds: number;
  breathGain: number;
}

export interface MobiusChoirFormantBand {
  frequencyHz: number;
  bandwidthHz: number;
  amplitude: number;
}

export interface MobiusChoirSynthesisPreset {
  maximumPartials: number;
  partialDamping: number;
  articulations: Readonly<Record<MobiusChoirGesture, MobiusChoirArticulationPreset>>;
  formants: Readonly<Record<MobiusChoirVowel, readonly MobiusChoirFormantBand[]>>;
  formantFloor: number;
  maximumEventSeconds: number;
  breathSeconds: number;
  breathMinimumHz: number;
  breathMaximumHz: number;
  breathComponentCount: number;
  stereoDetuneRatio: number;
  antiAliasRatio: number;
  outputGain: number;
}

export interface MobiusChoirWorkletProgram {
  kind: "mobius-choir";
  score: MobiusChoirScoreProgram;
  modes: readonly MobiusChoirAudioMode[];
  synthesis: MobiusChoirSynthesisPreset;
  normalization: number;
}

export type AudioWorkletProgram =
  | ResidueBloomWorkletProgram
  | SpectralCathedralWorkletProgram
  | MobiusChoirWorkletProgram;

export interface AudioGraphPreset {
  dryHighPassHz: number;
  dryHighPassQ: number;
  dryHighShelfHz: number;
  dryHighShelfGainDb: number;
  dryLowPassHz: number;
  dryLowPassQ: number;
  dryGain: number;
  wetHighPassHz: number;
  wetHighPassQ: number;
  wetGain: number;
  roomSeconds: number;
  roomDecay: number;
  compressor: {
    thresholdDb: number;
    kneeDb: number;
    ratio: number;
    attackSeconds: number;
    releaseSeconds: number;
  };
  limiterCeilingDbfs: number | null;
}

export interface AudioEngineProgram {
  worklet: AudioWorkletProgram;
  graph: AudioGraphPreset;
}

export interface WorkletConfigureMessage {
  type: "configure";
  program: AudioWorkletProgram;
}

export function createWorkletConfigureMessage(
  program: AudioWorkletProgram,
): WorkletConfigureMessage {
  return { type: "configure", program };
}
