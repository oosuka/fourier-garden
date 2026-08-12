import type { AudioGraphPreset } from "../../../audio/audioProgram";
import { definePikoChapterAudio, PIKO_AUDIO_GRAPH } from "../../../audio/pikoProgram";
import { RIEMANN_VEIL_SCORE } from "./score";
export const RIEMANN_VEIL_AUDIO_GRAPH: AudioGraphPreset = {
  ...PIKO_AUDIO_GRAPH,
  dryHighShelfHz: 900,
  dryHighShelfGainDb: -28,
  dryLowPassHz: 1_050,
  dryGain: 0.84,
  wetLowPassHz: 760,
  wetGain: 0.065,
  roomSeconds: 1.05,
};
const riemannVeilAudio = definePikoChapterAudio({
  kind: "riemann-veil",
  score: RIEMANN_VEIL_SCORE,
  detuneRatio: 0.0013,
  maximumVoices: 20,
  timbre: { partialRatio: Math.SQRT2, partialGain: 0.025, chirpRatio: -0.012 },
  graph: RIEMANN_VEIL_AUDIO_GRAPH,
});

export const createRiemannVeilWorkletProgram = riemannVeilAudio.createWorkletProgram;
export const createRiemannVeilAudioProgram = riemannVeilAudio.createAudioProgram;
