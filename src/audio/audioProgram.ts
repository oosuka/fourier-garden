export interface AudioWorkletProgram {
  kind: string;
}

export interface AudioGraphPreset {
  dryHighPassHz: number;
  dryHighPassQ: number;
  dryHighShelfHz: number;
  dryHighShelfGainDb: number;
  dryLowPassHz: number;
  dryLowPassQ: number;
  dryGain: number;
  wetHighPassHz: number;
  wetHighPassQ: number;
  wetGain: number;
  roomSeconds: number;
  roomDecay: number;
  compressor: {
    thresholdDb: number;
    kneeDb: number;
    ratio: number;
    attackSeconds: number;
    releaseSeconds: number;
  };
  limiterCeilingDbfs: number | null;
}

export interface AudioEngineProgram<Program extends AudioWorkletProgram = AudioWorkletProgram> {
  worklet: Program;
  graph: AudioGraphPreset;
}

export interface WorkletConfigureMessage<Program extends AudioWorkletProgram> {
  type: "configure";
  program: Program;
}

export function createWorkletConfigureMessage<Program extends AudioWorkletProgram>(
  program: Program,
): WorkletConfigureMessage<Program> {
  return { type: "configure", program };
}
