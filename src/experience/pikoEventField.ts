import {
  getPikoEnvelope,
  getPikoPan,
  getPikoContactGain,
  type PikoScoreEvent,
  type PikoScoreProgram,
  type PikoTimbreProfile,
} from "../audio/pikoProgram";

export interface PikoVisualVoice {
  event: PikoScoreEvent;
  absoluteTimeSeconds: number;
  ageSeconds: number;
  envelope: number;
  amplitude: number;
  pan: number;
  /** Finite secondary excitation; drives material sharpness, not mathematical displacement. */
  contact: number;
  /** Artistic persistence, explicitly separate from the finite sound envelope. */
  afterglow: number;
}

export interface PikoEventFrame {
  count: number;
  voices: PikoVisualVoice[];
  focus: PikoScoreEvent | null;
}

function endOfLight(event: PikoScoreEvent): number {
  return event.endSeconds + 0.32 + event.wet * 0.8;
}

/** One immutable score supplies both the DSP and local visual excitation.
 * Sampling is seekable, uses absolute event times, and allocates no frame buffers.
 */
export function createPikoEventField(score: PikoScoreProgram, timbre?: PikoTimbreProfile) {
  const { events, cycleSeconds } = score;
  const horizon = events.reduce((maximum, event) => Math.max(maximum, endOfLight(event)), 0);
  const cycles = Math.ceil(horizon / cycleSeconds);
  // Allocate for the densest cyclic window, including simultaneous notes. This
  // is an initialization cost; the frame loop visits only live local voices.
  let capacity = 0;
  for (const event of events) {
    let overlapping = 0;
    for (let cycle = -cycles; cycle <= 0; cycle += 1) {
      for (const earlier of events) {
        const age = event.timeSeconds - (cycle * cycleSeconds + earlier.timeSeconds);
        if (age >= 0 && age <= horizon) overlapping += 1;
      }
    }
    capacity = Math.max(capacity, overlapping);
  }
  const frame: PikoEventFrame = {
    count: 0,
    focus: null,
    voices: Array.from({ length: capacity }, () => ({
      event: events[0]!,
      absoluteTimeSeconds: 0,
      ageSeconds: 0,
      envelope: 0,
      amplitude: 0,
      pan: 0,
      contact: 0,
      afterglow: 0,
    })),
  };

  return {
    capacity,
    sample(timeSeconds: number): PikoEventFrame {
      if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
        throw new Error("Event field time must be finite and nonnegative");
      }
      frame.count = 0;
      frame.focus = null;
      if (events.length === 0) return frame;
      let cycle = Math.floor(timeSeconds / cycleSeconds);
      const localTime = timeSeconds - cycle * cycleSeconds;
      let low = 0;
      let high = events.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (events[middle]!.timeSeconds <= localTime) low = middle + 1;
        else high = middle;
      }
      let index = low - 1;
      if (index < 0) {
        index = events.length - 1;
        cycle -= 1;
      }
      if (cycle < 0) return frame;
      frame.focus = events[index]!;
      while (cycle >= 0) {
        const event = events[index]!;
        const absoluteTime = cycle * cycleSeconds + event.timeSeconds;
        const age = timeSeconds - absoluteTime;
        if (age > horizon) break;
        const end = endOfLight(event);
        if (age < end) {
          const voice = frame.voices[frame.count++]!;
          voice.event = event;
          voice.absoluteTimeSeconds = absoluteTime;
          voice.ageSeconds = age;
          voice.envelope = getPikoEnvelope(event, age);
          voice.amplitude = voice.envelope * event.gain;
          voice.pan = getPikoPan(event, timeSeconds);
          voice.contact =
            timbre && timbre.partialGain > 0
              ? (voice.envelope * getPikoContactGain(event, timbre, age)) / timbre.partialGain
              : 0;
          voice.afterglow =
            (1 - Math.exp(-age / event.attackSeconds)) *
            Math.exp(-age / (event.decaySeconds + 0.11 + event.wet * 0.6)) *
            0.5 *
            (1 + Math.cos((Math.PI * age) / end));
        }
        index -= 1;
        if (index < 0) {
          index = events.length - 1;
          cycle -= 1;
        }
      }
      return frame;
    },
  };
}
