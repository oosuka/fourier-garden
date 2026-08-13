import type { AudioGraphPreset } from "../../../audio/audioProgram";
import { definePikoChapterAudio, PIKO_AUDIO_GRAPH } from "../../../audio/pikoProgram";
import { LISSAJOUS_ORCHARD_SCORE } from "./score";
export const LISSAJOUS_ORCHARD_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryHighShelfGainDb: -20,
  dryLowPassHz: 1_550,
  wetLowPassHz: 1_020,
  wetGain: 0.052,
  roomSeconds: 0.82,
};
const lissajousOrchardAudio = definePikoChapterAudio({
  kind: "lissajous-orchard",
  score: LISSAJOUS_ORCHARD_SCORE,
  detuneRatio: 0.0008,
  maximumVoices: 16,
  timbre: { partialRatio: 4 / 3, partialGain: 0.045, chirpRatio: -0.014 },
  graph: LISSAJOUS_ORCHARD_AUDIO_GRAPH,
});

export const createLissajousOrchardWorkletProgram = lissajousOrchardAudio.createWorkletProgram;
export const createLissajousOrchardAudioProgram = lissajousOrchardAudio.createAudioProgram;
