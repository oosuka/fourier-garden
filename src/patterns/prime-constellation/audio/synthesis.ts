import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import { getChapterOutputGain } from "../../../audio/chapterLoudness";
import {
  PIKO_AUDIO_GRAPH,
  type PikoWorkletProgram,
  validatePikoProgram,
} from "../../../audio/pikoProgram";
import { PRIME_CONSTELLATION_SCORE } from "./score";

export const PRIME_CONSTELLATION_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryLowPassHz: 1_750,
  wetGain: 0.03,
  roomSeconds: 0.62,
};

export function createPrimeConstellationWorkletProgram(): PikoWorkletProgram {
  const program = {
    kind: "prime-constellation",
    score: PRIME_CONSTELLATION_SCORE,
    detuneRatio: 0.001,
    outputGain: getChapterOutputGain("prime-constellation"),
    maximumVoices: 18,
    timbre: { partialRatio: 1.5, partialGain: 0.055, chirpRatio: 0.012 },
  };
  validatePikoProgram(program);
  return program;
}

export function createPrimeConstellationAudioProgram(): AudioEngineProgram {
  return {
    worklet: createPrimeConstellationWorkletProgram(),
    graph: PRIME_CONSTELLATION_AUDIO_GRAPH,
  };
}
