import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import {
  PIKO_AUDIO_GRAPH,
  type PikoWorkletProgram,
  validatePikoProgram,
} from "../../../audio/pikoProgram";
import { DIRICHLET_LANTERNS_SCORE } from "./score";
export const DIRICHLET_LANTERNS_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryHighShelfGainDb: -19,
  dryLowPassHz: 1_520,
  wetGain: 0.04,
  roomSeconds: 0.74,
};
export function createDirichletLanternsWorkletProgram(): PikoWorkletProgram {
  const program = {
    kind: "dirichlet-lanterns",
    score: DIRICHLET_LANTERNS_SCORE,
    detuneRatio: 0.001,
    outputGain: 0.61,
    maximumVoices: 18,
  };
  validatePikoProgram(program);
  return program;
}
export function createDirichletLanternsAudioProgram(): AudioEngineProgram {
  return {
    worklet: createDirichletLanternsWorkletProgram(),
    graph: DIRICHLET_LANTERNS_AUDIO_GRAPH,
  };
}
