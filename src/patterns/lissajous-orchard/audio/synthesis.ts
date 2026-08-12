import type { AudioEngineProgram, AudioGraphPreset } from "../../../audio/audioProgram";
import { getChapterOutputGain } from "../../../audio/chapterLoudness";
import {
  PIKO_AUDIO_GRAPH,
  type PikoWorkletProgram,
  validatePikoProgram,
} from "../../../audio/pikoProgram";
import { LISSAJOUS_ORCHARD_SCORE } from "./score";
export const LISSAJOUS_ORCHARD_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryHighShelfGainDb: -20,
  dryLowPassHz: 1_550,
  wetLowPassHz: 1_020,
  wetGain: 0.052,
  roomSeconds: 0.82,
};
export function createLissajousOrchardWorkletProgram(): PikoWorkletProgram {
  const program = {
    kind: "lissajous-orchard",
    score: LISSAJOUS_ORCHARD_SCORE,
    detuneRatio: 0.0008,
    outputGain: getChapterOutputGain("lissajous-orchard"),
    maximumVoices: 16,
    timbre: { partialRatio: 4 / 3, partialGain: 0.045, chirpRatio: -0.014 },
  };
  validatePikoProgram(program);
  return program;
}
export function createLissajousOrchardAudioProgram(): AudioEngineProgram {
  return { worklet: createLissajousOrchardWorkletProgram(), graph: LISSAJOUS_ORCHARD_AUDIO_GRAPH };
}
