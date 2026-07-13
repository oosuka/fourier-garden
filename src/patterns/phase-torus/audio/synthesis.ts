import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import { getChapterOutputGain } from "../../../audio/chapterLoudness";
import {
  PIKO_AUDIO_GRAPH,
  type PikoWorkletProgram,
  validatePikoProgram,
} from "../../../audio/pikoProgram";
import { PHASE_TORUS_SCORE } from "./score";
export const PHASE_TORUS_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryLowPassHz: 1_560,
  wetGain: 0.068,
  roomSeconds: 1.08,
};
export function createPhaseTorusWorkletProgram(): PikoWorkletProgram {
  const program = {
    kind: "phase-torus",
    score: PHASE_TORUS_SCORE,
    detuneRatio: 0.0015,
    outputGain: getChapterOutputGain("phase-torus"),
    maximumVoices: 22,
  };
  validatePikoProgram(program);
  return program;
}
export function createPhaseTorusAudioProgram(): AudioEngineProgram {
  return { worklet: createPhaseTorusWorkletProgram(), graph: PHASE_TORUS_AUDIO_GRAPH };
}
