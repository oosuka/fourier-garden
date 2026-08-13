import type { AudioGraphPreset } from "../../../audio/audioProgram";
import { definePikoChapterAudio, PIKO_AUDIO_GRAPH } from "../../../audio/pikoProgram";
import { WAVELET_RAIN_SCORE } from "./score";
export const WAVELET_RAIN_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryHighShelfHz: 940,
  dryHighShelfGainDb: -24,
  dryLowPassHz: 1_080,
  wetLowPassHz: 780,
  wetGain: 0.065,
  roomSeconds: 0.92,
};
const waveletRainAudio = definePikoChapterAudio({
  kind: "wavelet-rain",
  score: WAVELET_RAIN_SCORE,
  detuneRatio: 0.0007,
  maximumVoices: 18,
  timbre: { partialRatio: 2.5, partialGain: 0.03, chirpRatio: -0.038 },
  graph: WAVELET_RAIN_AUDIO_GRAPH,
});

export const createWaveletRainWorkletProgram = waveletRainAudio.createWorkletProgram;
export const createWaveletRainAudioProgram = waveletRainAudio.createAudioProgram;
