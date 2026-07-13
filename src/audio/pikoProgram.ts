import type { AudioGraphPreset } from "./audioProgram";

export interface PikoScoreEvent {
  timeSeconds: number;
  frequencyHz: number;
  gain: number;
  pan: number;
  wet: number;
  attackSeconds: number;
  decaySeconds: number;
  endSeconds: number;
  phaseOffset: number;
  phaseDrift: number;
}

export interface PikoScoreProgram {
  cycleSeconds: number;
  events: readonly PikoScoreEvent[];
}

export interface PikoWorkletProgram {
  kind: string;
  score: PikoScoreProgram;
  detuneRatio: number;
  outputGain: number;
  maximumVoices: number;
}

export interface PikoStereoSample {
  dryLeft: number;
  dryRight: number;
  wetLeft: number;
  wetRight: number;
}

export const PIKO_AUDIO_GRAPH: AudioGraphPreset = {
  dryHighPassHz: 190,
  dryHighPassQ: 0.45,
  dryHighShelfHz: 1_180,
  dryHighShelfGainDb: -17,
  dryLowPassHz: 1_650,
  dryLowPassQ: 0.25,
  dryGain: 0.9,
  wetHighPassHz: 220,
  wetHighPassQ: 0.45,
  wetLowPassHz: 1_180,
  wetLowPassQ: 0.25,
  wetGain: 0.045,
  roomSeconds: 0.82,
  roomDecay: 1.45,
  compressor: {
    thresholdDb: -16,
    kneeDb: 12,
    ratio: 3,
    attackSeconds: 0.006,
    releaseSeconds: 0.2,
  },
  limiterCeilingDbfs: -1,
};

export function validatePikoProgram(program: PikoWorkletProgram): void {
  if (
    !program.kind ||
    !Number.isFinite(program.score.cycleSeconds) ||
    program.score.cycleSeconds <= 0
  ) {
    throw new Error("Piko program identity and cycle must be valid");
  }
  if (!Number.isInteger(program.maximumVoices) || program.maximumVoices < 4) {
    throw new Error("Piko program maximum voices must be an integer of at least four");
  }
  let previousTime = -1;
  for (const event of program.score.events) {
    if (
      !Object.values(event).every(Number.isFinite) ||
      event.timeSeconds < 0 ||
      event.timeSeconds >= program.score.cycleSeconds ||
      event.timeSeconds < previousTime ||
      event.frequencyHz < 360 ||
      event.frequencyHz > 1_200 ||
      event.gain < 0 ||
      event.pan < -1 ||
      event.pan > 1 ||
      event.wet < 0 ||
      event.wet > 1 ||
      event.attackSeconds <= 0 ||
      event.decaySeconds <= 0 ||
      event.endSeconds <= event.attackSeconds
    ) {
      throw new Error("Invalid piko score event");
    }
    previousTime = event.timeSeconds;
  }
}

export function getPikoEnvelope(event: PikoScoreEvent, ageSeconds: number): number {
  if (ageSeconds < 0 || ageSeconds >= event.endSeconds) return 0;
  const body =
    (1 - Math.exp(-ageSeconds / event.attackSeconds)) * Math.exp(-ageSeconds / event.decaySeconds);
  const fadeStart = event.endSeconds * 0.76;
  if (ageSeconds <= fadeStart) return body;
  const progress = (ageSeconds - fadeStart) / (event.endSeconds - fadeStart);
  return body * 0.5 * (1 + Math.cos(Math.PI * progress));
}

export function renderPikoSample(
  program: PikoWorkletProgram,
  absoluteTimeSeconds: number,
  sampleRate: number,
): PikoStereoSample {
  const output: PikoStereoSample = { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 };
  const cycle = Math.floor(absoluteTimeSeconds / program.score.cycleSeconds);
  for (const cycleOffset of [-1, 0]) {
    const cycleIndex = cycle + cycleOffset;
    if (cycleIndex < 0) continue;
    for (const event of program.score.events) {
      const eventTime = cycleIndex * program.score.cycleSeconds + event.timeSeconds;
      const age = absoluteTimeSeconds - eventTime;
      const envelope = getPikoEnvelope(event, age);
      if (envelope === 0) continue;
      const leftFrequency = event.frequencyHz * (1 - program.detuneRatio);
      const rightFrequency = event.frequencyHz * (1 + program.detuneRatio);
      if (Math.max(leftFrequency, rightFrequency) >= sampleRate * 0.45) continue;
      const leftPan = Math.sqrt((1 - event.pan) / 2);
      const rightPan = Math.sqrt((1 + event.pan) / 2);
      const phaseBase = event.phaseOffset + event.phaseDrift * absoluteTimeSeconds;
      const gain = event.gain * envelope * program.outputGain;
      const left = Math.sin(Math.PI * 2 * leftFrequency * age + phaseBase) * gain * leftPan;
      const right = Math.sin(Math.PI * 2 * rightFrequency * age + phaseBase) * gain * rightPan;
      output.dryLeft += left * (1 - event.wet);
      output.dryRight += right * (1 - event.wet);
      output.wetLeft += left * event.wet;
      output.wetRight += right * event.wet;
    }
  }
  return output;
}

export function renderPikoStereo(options: {
  program: PikoWorkletProgram;
  startTimeSeconds: number;
  durationSeconds: number;
  sampleRate: number;
}): Readonly<{ left: Float32Array; right: Float32Array }> {
  const { program, startTimeSeconds, durationSeconds, sampleRate } = options;
  const sampleCount = Math.floor(durationSeconds * sampleRate);
  const left = new Float32Array(sampleCount);
  const right = new Float32Array(sampleCount);
  const maximumEndSeconds = Math.max(...program.score.events.map((event) => event.endSeconds));
  const firstCycle = Math.max(
    0,
    Math.floor((startTimeSeconds - maximumEndSeconds) / program.score.cycleSeconds),
  );
  const lastCycle = Math.floor((startTimeSeconds + durationSeconds) / program.score.cycleSeconds);

  for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
    const cycleStartSeconds = cycle * program.score.cycleSeconds;
    for (const event of program.score.events) {
      const eventTimeSeconds = cycleStartSeconds + event.timeSeconds;
      const firstSample = Math.max(
        0,
        Math.ceil((eventTimeSeconds - startTimeSeconds) * sampleRate),
      );
      const lastSample = Math.min(
        sampleCount,
        Math.ceil((eventTimeSeconds + event.endSeconds - startTimeSeconds) * sampleRate),
      );
      if (firstSample >= lastSample) continue;
      const leftFrequency = event.frequencyHz * (1 - program.detuneRatio);
      const rightFrequency = event.frequencyHz * (1 + program.detuneRatio);
      if (Math.max(leftFrequency, rightFrequency) >= sampleRate * 0.45) continue;
      const leftPan = Math.sqrt((1 - event.pan) / 2);
      const rightPan = Math.sqrt((1 + event.pan) / 2);

      for (let sample = firstSample; sample < lastSample; sample += 1) {
        const absoluteTimeSeconds = startTimeSeconds + sample / sampleRate;
        const ageSeconds = absoluteTimeSeconds - eventTimeSeconds;
        const envelope = getPikoEnvelope(event, ageSeconds);
        const phaseBase = event.phaseOffset + event.phaseDrift * absoluteTimeSeconds;
        const gain = event.gain * envelope * program.outputGain * (1 - event.wet);
        left[sample] +=
          Math.sin(Math.PI * 2 * leftFrequency * ageSeconds + phaseBase) * gain * leftPan;
        right[sample] +=
          Math.sin(Math.PI * 2 * rightFrequency * ageSeconds + phaseBase) * gain * rightPan;
      }
    }
  }

  return { left, right };
}

export function createPikoEvents(options: {
  cycleSeconds: number;
  count: number;
  frequency(index: number): number;
  time(index: number): number;
  gain(index: number): number;
  pan(index: number): number;
  wet(index: number): number;
  articulation(index: number): Readonly<{
    attackSeconds: number;
    decaySeconds: number;
    endSeconds: number;
  }>;
  phase?(index: number): number;
  phaseDrift?(index: number): number;
}): PikoScoreEvent[] {
  return Array.from({ length: options.count }, (_, index) => ({
    timeSeconds: options.time(index),
    frequencyHz: options.frequency(index),
    gain: options.gain(index),
    pan: options.pan(index),
    wet: options.wet(index),
    ...options.articulation(index),
    phaseOffset: options.phase?.(index) ?? 0,
    phaseDrift: options.phaseDrift?.(index) ?? 0,
  })).toSorted((left, right) => left.timeSeconds - right.timeSeconds);
}
