import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import { getChapterOutputGain } from "../../../audio/chapterLoudness";
import {
  PIKO_AUDIO_GRAPH,
  type PikoWorkletProgram,
  validatePikoProgram,
} from "../../../audio/pikoProgram";
import { RIEMANN_VEIL_SCORE } from "./score";
export const RIEMANN_VEIL_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryHighShelfGainDb: -20,
  dryLowPassHz: 1_600,
  wetGain: 0.055,
  roomSeconds: 0.94,
};
export function createRiemannVeilWorkletProgram(): PikoWorkletProgram {
  const program = {
    kind: "riemann-veil",
    score: RIEMANN_VEIL_SCORE,
    detuneRatio: 0.0013,
    outputGain: getChapterOutputGain("riemann-veil"),
    maximumVoices: 20,
  };
  validatePikoProgram(program);
  return program;
}
export function createRiemannVeilAudioProgram(): AudioEngineProgram {
  return { worklet: createRiemannVeilWorkletProgram(), graph: RIEMANN_VEIL_AUDIO_GRAPH };
}
