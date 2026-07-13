import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import {
  PIKO_AUDIO_GRAPH,
  type PikoWorkletProgram,
  validatePikoProgram,
} from "../../../audio/pikoProgram";
import { LISSAJOUS_ORCHARD_SCORE } from "./score";
export const LISSAJOUS_ORCHARD_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryLowPassHz: 1_820,
  wetGain: 0.038,
  roomSeconds: 0.68,
};
export function createLissajousOrchardWorkletProgram(): PikoWorkletProgram {
  const program = {
    kind: "lissajous-orchard",
    score: LISSAJOUS_ORCHARD_SCORE,
    detuneRatio: 0.0008,
    outputGain: 0.34,
    maximumVoices: 16,
  };
  validatePikoProgram(program);
  return program;
}
export function createLissajousOrchardAudioProgram(): AudioEngineProgram {
  return { worklet: createLissajousOrchardWorkletProgram(), graph: LISSAJOUS_ORCHARD_AUDIO_GRAPH };
}
