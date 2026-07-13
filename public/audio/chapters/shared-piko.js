import { clamp, isFiniteNumber } from "./shared.js?v=20";

const TAU = Math.PI * 2;

function validEvent(event, cycleSeconds) {
  return (
    event &&
    typeof event === "object" &&
    Object.values(event).every(isFiniteNumber) &&
    event.timeSeconds >= 0 &&
    event.timeSeconds < cycleSeconds &&
    event.frequencyHz >= 360 &&
    event.frequencyHz <= 1200 &&
    event.gain >= 0 &&
    event.pan >= -1 &&
    event.pan <= 1 &&
    event.wet >= 0 &&
    event.wet <= 1 &&
    event.attackSeconds > 0 &&
    event.decaySeconds > 0 &&
    event.endSeconds > event.attackSeconds
  );
}

function resetVoice(voice) {
  voice.active = false;
  voice.eventTime = 0;
  voice.frequency = 0;
  voice.gain = 0;
  voice.pan = 0;
  voice.wet = 0;
  voice.attack = 0;
  voice.decay = 0;
  voice.end = 0;
  voice.phase = 0;
  voice.phaseDrift = 0;
}

function activateVoice(state, event, eventTime) {
  let voice = null;
  for (let index = 0; index < state.voices.length; index += 1) {
    if (!state.voices[index].active) {
      voice = state.voices[index];
      break;
    }
  }
  voice ??= state.voices[state.replacementCursor++ % state.voices.length];
  voice.active = true;
  voice.eventTime = eventTime;
  voice.frequency = event.frequencyHz;
  voice.gain = event.gain;
  voice.pan = event.pan;
  voice.wet = event.wet;
  voice.attack = event.attackSeconds;
  voice.decay = event.decaySeconds;
  voice.end = event.endSeconds;
  voice.phase = event.phaseOffset;
  voice.phaseDrift = event.phaseDrift;
}

function initializeState(program, state, timeSeconds) {
  for (const voice of state.voices) resetVoice(voice);
  const cycleSeconds = program.score.cycleSeconds;
  const cycle = Math.floor(timeSeconds / cycleSeconds);
  const maximumEnd = state.maximumEnd;
  for (let cycleOffset = -1; cycleOffset <= 0; cycleOffset += 1) {
    const cycleIndex = cycle + cycleOffset;
    if (cycleIndex < 0) continue;
    for (const event of program.score.events) {
      const eventTime = cycleIndex * cycleSeconds + event.timeSeconds;
      const age = timeSeconds - eventTime;
      if (age >= 0 && age < Math.min(maximumEnd, event.endSeconds)) {
        activateVoice(state, event, eventTime);
      }
    }
  }
  const localTime = timeSeconds - cycle * cycleSeconds;
  let nextEventIndex = 0;
  while (
    nextEventIndex < program.score.events.length &&
    program.score.events[nextEventIndex].timeSeconds <= localTime
  ) {
    nextEventIndex += 1;
  }
  state.nextEventIndex = nextEventIndex;
  state.nextCycle = cycle;
  if (nextEventIndex >= program.score.events.length) {
    state.nextEventIndex = 0;
    state.nextCycle = cycle + 1;
  }
  state.initialized = true;
}

function schedule(program, state, timeSeconds) {
  const events = program.score.events;
  let guard = events.length + 1;
  while (guard > 0) {
    const event = events[state.nextEventIndex];
    const eventTime = state.nextCycle * program.score.cycleSeconds + event.timeSeconds;
    if (eventTime > timeSeconds) break;
    activateVoice(state, event, eventTime);
    state.nextEventIndex += 1;
    if (state.nextEventIndex >= events.length) {
      state.nextEventIndex = 0;
      state.nextCycle += 1;
    }
    guard -= 1;
  }
}

export function createPikoProcessor(kind) {
  return {
    kind,
    stateError: null,
    validate(program) {
      if (
        !program ||
        program.kind !== kind ||
        !program.score ||
        !isFiniteNumber(program.score.cycleSeconds) ||
        program.score.cycleSeconds <= 0 ||
        !Array.isArray(program.score.events) ||
        program.score.events.length === 0 ||
        !Number.isInteger(program.maximumVoices) ||
        program.maximumVoices < 4 ||
        !isFiniteNumber(program.detuneRatio) ||
        program.detuneRatio < 0 ||
        !isFiniteNumber(program.outputGain) ||
        program.outputGain <= 0
      ) {
        return false;
      }
      let previous = -1;
      for (const event of program.score.events) {
        if (
          !validEvent(event, program.score.cycleSeconds) ||
          event.timeSeconds < previous ||
          event.frequencyHz * (1 + program.detuneRatio) >= sampleRate * 0.45
        ) {
          return false;
        }
        previous = event.timeSeconds;
      }
      return true;
    },
    createState(program) {
      const voices = Array.from({ length: program.maximumVoices }, () => ({}));
      for (const voice of voices) resetVoice(voice);
      return {
        voices,
        initialized: false,
        nextEventIndex: 0,
        nextCycle: 0,
        replacementCursor: 0,
        maximumEnd: Math.max(...program.score.events.map((event) => event.endSeconds)),
        output: { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 },
      };
    },
    resetState(state) {
      if (!state) return;
      state.initialized = false;
      state.nextEventIndex = 0;
      state.nextCycle = 0;
      state.replacementCursor = 0;
      for (const voice of state.voices) resetVoice(voice);
    },
    render(program, state, absoluteTimeSeconds) {
      if (!state.initialized) initializeState(program, state, absoluteTimeSeconds);
      schedule(program, state, absoluteTimeSeconds);
      let dryLeft = 0;
      let dryRight = 0;
      let wetLeft = 0;
      let wetRight = 0;
      for (let index = 0; index < state.voices.length; index += 1) {
        const voice = state.voices[index];
        if (!voice.active) continue;
        const age = absoluteTimeSeconds - voice.eventTime;
        if (age < 0 || age >= voice.end) {
          voice.active = false;
          continue;
        }
        const body = (1 - Math.exp(-age / voice.attack)) * Math.exp(-age / voice.decay);
        const fadeStart = voice.end * 0.76;
        const fade =
          age <= fadeStart
            ? 1
            : 0.5 * (1 + Math.cos((Math.PI * (age - fadeStart)) / (voice.end - fadeStart)));
        const gain = voice.gain * body * fade * program.outputGain;
        const pan = clamp(voice.pan, -1, 1);
        const leftPan = Math.sqrt((1 - pan) / 2);
        const rightPan = Math.sqrt((1 + pan) / 2);
        const phase = voice.phase + voice.phaseDrift * absoluteTimeSeconds;
        const leftFrequency = voice.frequency * (1 - program.detuneRatio);
        const rightFrequency = voice.frequency * (1 + program.detuneRatio);
        const left = Math.sin(TAU * leftFrequency * age + phase) * gain * leftPan;
        const right = Math.sin(TAU * rightFrequency * age + phase) * gain * rightPan;
        dryLeft += left * (1 - voice.wet);
        dryRight += right * (1 - voice.wet);
        wetLeft += left * voice.wet;
        wetRight += right * voice.wet;
      }
      state.output.dryLeft = dryLeft;
      state.output.dryRight = dryRight;
      state.output.wetLeft = wetLeft;
      state.output.wetRight = wetRight;
      return state.output;
    },
  };
}
