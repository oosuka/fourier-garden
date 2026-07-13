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
  dryLowPassHz: 1_480,
  wetLowPassHz: 920,
  wetGain: 0.03,
  roomSeconds: 0.58,
};
export function createWaveletRainWorkletProgram(): PikoWorkletProgram {
  const program = {
    kind: "wavelet-rain",
    score: WAVELET_RAIN_SCORE,
    detuneRatio: 0.0007,
    outputGain: getChapterOutputGain("wavelet-rain"),
    maximumVoices: 14,
  };
  validatePikoProgram(program);
  return program;
}
export function createWaveletRainAudioProgram(): AudioEngineProgram {
  return { worklet: createWaveletRainWorkletProgram(), graph: WAVELET_RAIN_AUDIO_GRAPH };
}
