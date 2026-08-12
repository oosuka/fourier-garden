import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import { getChapterOutputGain } from "../../../audio/chapterLoudness";
import {
  PIKO_AUDIO_GRAPH,
  type PikoWorkletProgram,
  validatePikoProgram,
} from "../../../audio/pikoProgram";
import { BESSEL_TIDE_SCORE } from "./score";

export const BESSEL_TIDE_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryLowPassHz: 1_420,
  wetLowPassHz: 980,
  wetGain: 0.07,
  roomSeconds: 1.05,
};
export function createBesselTideWorkletProgram(): PikoWorkletProgram {
  const program = {
    kind: "bessel-tide",
    score: BESSEL_TIDE_SCORE,
    detuneRatio: 0.0014,
    outputGain: getChapterOutputGain("bessel-tide"),
    maximumVoices: 24,
    timbre: { partialRatio: 2, partialGain: 0.1, chirpRatio: -0.032 },
  };
  validatePikoProgram(program);
  return program;
}
export function createBesselTideAudioProgram(): AudioEngineProgram {
  return { worklet: createBesselTideWorkletProgram(), graph: BESSEL_TIDE_AUDIO_GRAPH };
}
