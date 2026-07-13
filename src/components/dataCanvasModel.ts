export function getAudioWaveformMode(initialized: boolean): "waiting" | "analyser" {
  return initialized ? "analyser" : "waiting";
}
