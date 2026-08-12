import type { AudioGraphPreset } from "../../../audio/audioProgram";
import { definePikoChapterAudio, PIKO_AUDIO_GRAPH } from "../../../audio/pikoProgram";
import { BESSEL_TIDE_SCORE } from "./score";

export const BESSEL_TIDE_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryLowPassHz: 1_420,
  wetLowPassHz: 980,
  wetGain: 0.07,
  roomSeconds: 1.05,
};
const besselTideAudio = definePikoChapterAudio({
  kind: "bessel-tide",
  score: BESSEL_TIDE_SCORE,
  detuneRatio: 0.0014,
  maximumVoices: 24,
  timbre: { partialRatio: 2, partialGain: 0.1, chirpRatio: -0.032 },
  graph: BESSEL_TIDE_AUDIO_GRAPH,
});

export const createBesselTideWorkletProgram = besselTideAudio.createWorkletProgram;
export const createBesselTideAudioProgram = besselTideAudio.createAudioProgram;
