import type { AudioGraphPreset } from "../../../audio/audioProgram";
import { definePikoChapterAudio, PIKO_AUDIO_GRAPH } from "../../../audio/pikoProgram";
import { PRIME_CONSTELLATION_SCORE } from "./score";

export const PRIME_CONSTELLATION_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryLowPassHz: 1_750,
  wetGain: 0.03,
  roomSeconds: 0.62,
};

const primeConstellationAudio = definePikoChapterAudio({
  kind: "prime-constellation",
  score: PRIME_CONSTELLATION_SCORE,
  detuneRatio: 0.001,
  maximumVoices: 18,
  timbre: { partialRatio: 1.5, partialGain: 0.055, chirpRatio: 0.012 },
  graph: PRIME_CONSTELLATION_AUDIO_GRAPH,
});

export const createPrimeConstellationWorkletProgram = primeConstellationAudio.createWorkletProgram;
export const createPrimeConstellationAudioProgram = primeConstellationAudio.createAudioProgram;
