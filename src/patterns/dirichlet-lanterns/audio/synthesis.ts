import type { AudioGraphPreset } from "../../../audio/audioProgram";
import { definePikoChapterAudio, PIKO_AUDIO_GRAPH } from "../../../audio/pikoProgram";
import { DIRICHLET_LANTERNS_SCORE } from "./score";
export const DIRICHLET_LANTERNS_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryHighShelfGainDb: -19,
  dryLowPassHz: 1_520,
  wetGain: 0.04,
  roomSeconds: 0.74,
};
const dirichletLanternsAudio = definePikoChapterAudio({
  kind: "dirichlet-lanterns",
  score: DIRICHLET_LANTERNS_SCORE,
  detuneRatio: 0.001,
  maximumVoices: 18,
  timbre: { partialRatio: 3, partialGain: 0.045, chirpRatio: 0 },
  graph: DIRICHLET_LANTERNS_AUDIO_GRAPH,
});

export const createDirichletLanternsWorkletProgram = dirichletLanternsAudio.createWorkletProgram;
export const createDirichletLanternsAudioProgram = dirichletLanternsAudio.createAudioProgram;
