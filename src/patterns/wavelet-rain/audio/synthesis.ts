import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import { getChapterOutputGain } from "../../../audio/chapterLoudness";
import {
  PIKO_AUDIO_GRAPH,
  type PikoWorkletProgram,
  validatePikoProgram,
} from "../../../audio/pikoProgram";
import { WAVELET_RAIN_SCORE } from "./score";
export const WAVELET_RAIN_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryHighShelfHz: 940,
  dryHighShelfGainDb: -24,
  dryLowPassHz: 1_080,
  wetLowPassHz: 780,
  wetGain: 0.065,
  roomSeconds: 0.92,
};
export function createWaveletRainWorkletProgram(): PikoWorkletProgram {
  const program = {
    kind: "wavelet-rain",
    score: WAVELET_RAIN_SCORE,
    detuneRatio: 0.0007,
    outputGain: getChapterOutputGain("wavelet-rain"),
    maximumVoices: 18,
    timbre: { partialRatio: 2.5, partialGain: 0.03, chirpRatio: -0.038 },
  };
  validatePikoProgram(program);
  return program;
}
export function createWaveletRainAudioProgram(): AudioEngineProgram {
  return { worklet: createWaveletRainWorkletProgram(), graph: WAVELET_RAIN_AUDIO_GRAPH };
}
