import { clamp, isFiniteNumber, isPositiveFinite } from "./shared.js?v=30";

const RESIDUE_TAU = Math.PI * 2;

function evaluateSerializedPhasor(mapping, absoluteTimeSeconds, target) {
  const angle = absoluteTimeSeconds * mapping.visualAngularRate;
  let x = 0;
  let y = 0;

  for (const term of mapping.terms) {
    const phase = term.harmonic * angle + term.sinePhase;
    x += term.amplitude * Math.cos(phase);
    y += term.amplitude * Math.sin(phase);
  }

  target.normalizedX = clamp(x / mapping.amplitudeBound, -1, 1);
  target.normalizedY = clamp(y / mapping.amplitudeBound, -1, 1);
  target.normalizedRadius = clamp(Math.hypot(x, y) / mapping.amplitudeBound, 0, 1);
}

function evaluateEvent(score, event, cycleIndex, phasor, target) {
  const absoluteTimeSeconds =
    cycleIndex * score.cycleSeconds + event.globalStep * score.stepSeconds;
  evaluateSerializedPhasor(score.phasorMapping, absoluteTimeSeconds, phasor);
  const phasorBrightness = (phasor.normalizedY + 1) * 0.5;

  target.active = event.active;
  target.carrierHz = event.carrierHz;
  target.baseGain = event.baseGain;
  target.baseAccent = event.baseAccent;
  target.wetSend = event.wetSend;
  target.stereoSpread = event.stereoSpread;
  target.absoluteTimeSeconds = absoluteTimeSeconds;
  target.brightness = clamp(event.baseBrightness * 0.72 + phasorBrightness * 0.28, 0, 1);
  target.accent = event.active ? event.baseAccent * (0.9 + phasor.normalizedRadius * 0.2) : 0;
  target.normalizedPhasorX = phasor.normalizedX;
  target.normalizedPhasorY = phasor.normalizedY;
  target.normalizedPhasorRadius = phasor.normalizedRadius;
}

function createResidueBloomVoice(partialCount) {
  return {
    ordinal: -1,
    startSeconds: 0,
    endSeconds: 0,
    attackSeconds: 0,
    decaySeconds: 0,
    eventScale: 0,
    wetScale: 0,
    contactPeak: 0,
    activePartialCount: 0,
    lastTime: NaN,
    rotationCount: 0,
    event: {},
    leftGains: new Float64Array(partialCount),
    rightGains: new Float64Array(partialCount),
    leftFrequencies: new Float64Array(partialCount),
    rightFrequencies: new Float64Array(partialCount),
    leftPhases: new Float64Array(partialCount),
    rightPhases: new Float64Array(partialCount),
    leftSines: new Float64Array(partialCount),
    leftCosines: new Float64Array(partialCount),
    rightSines: new Float64Array(partialCount),
    rightCosines: new Float64Array(partialCount),
    leftDeltaSines: new Float64Array(partialCount),
    leftDeltaCosines: new Float64Array(partialCount),
    rightDeltaSines: new Float64Array(partialCount),
    rightDeltaCosines: new Float64Array(partialCount),
    contacts: new Uint8Array(partialCount),
  };
}

function createResidueBloomState(program) {
  const partialCount = program.partials.length;
  const partialWeights = new Float64Array(partialCount);
  const partialPanBases = new Float64Array(partialCount);
  for (let index = 0; index < partialCount; index++) {
    partialWeights[index] =
      program.partials[index].sourceAmplitude /
      Math.pow(index + 1, program.score.definition.timbreDamping);
    partialPanBases[index] = Math.sin(index * 2.399963229728653) * 0.24;
  }
  return {
    partialWeights,
    partialPanBases,
    lastTime: NaN,
    voices: Array.from(
      {
        length: Math.ceil(program.score.definition.maximumNoteSeconds / program.score.stepSeconds),
      },
      () => createResidueBloomVoice(partialCount),
    ),
    phasor: { normalizedX: 0, normalizedY: 0, normalizedRadius: 0 },
    sample: { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 },
  };
}

function resetResidueBloomState(state) {
  state.lastTime = NaN;
  for (const voice of state.voices) {
    voice.ordinal = -1;
    voice.activePartialCount = 0;
    voice.lastTime = NaN;
  }
  state.sample.dryLeft = 0;
  state.sample.dryRight = 0;
  state.sample.wetLeft = 0;
  state.sample.wetRight = 0;
}

function prepareResidueBloomEvent(program, state, voice, ordinal) {
  const score = program.score;
  const definition = score.definition;
  const baseEvent = score.events[ordinal % score.totalSteps];
  const event = voice.event;
  evaluateEvent(score, baseEvent, Math.floor(ordinal / score.totalSteps), state.phasor, event);
  voice.ordinal = ordinal;
  voice.startSeconds = event.absoluteTimeSeconds;
  voice.lastTime = NaN;
  voice.rotationCount = 0;
  voice.activePartialCount = 0;
  voice.eventScale = 0;
  if (!event.active) return;

  const accentRatio = clamp((event.baseAccent - 0.18) / 1.28, 0, 1);
  const durationRatio = accentRatio * 0.7 + event.normalizedPhasorRadius * 0.3;
  voice.attackSeconds = definition.attackSeconds * (1.1 - event.brightness * 0.25);
  voice.decaySeconds =
    definition.decaySeconds *
    (0.88 + event.normalizedPhasorRadius * 0.24) *
    (0.7 + 0.55 * accentRatio);
  voice.endSeconds =
    definition.minimumNoteSeconds +
    (definition.maximumNoteSeconds - definition.minimumNoteSeconds) * durationRatio;
  voice.contactPeak = 0.7 + event.brightness * 0.6;
  voice.wetScale = event.wetSend * 0.5;
  const frequencyLimit = sampleRate * 0.5 * definition.antiAliasRatio;
  const detune = definition.stereoDetuneRatio;
  const cutoff = 520 + (Math.min(2_050, sampleRate * 0.2) - 520) * event.brightness;
  const pole = Math.exp((-RESIDUE_TAU * cutoff) / sampleRate);
  const numerator = 1 - pole;
  let normalization = 0;
  let activePartialCount = 0;
  for (let index = 0; index < program.partials.length; index++) {
    const partial = program.partials[index];
    const nominal = event.carrierHz * partial.harmonic;
    const leftFrequency = nominal * (1 - detune);
    const rightFrequency = nominal * (1 + detune);
    if (Math.max(leftFrequency, rightFrequency) >= frequencyLimit) continue;
    const weight = state.partialWeights[index];
    const pan = clamp(
      event.normalizedPhasorX * 0.28 + state.partialPanBases[index] * event.stereoSpread,
      -0.92,
      0.92,
    );
    const leftDelta = (RESIDUE_TAU * leftFrequency) / sampleRate;
    const rightDelta = (RESIDUE_TAU * rightFrequency) / sampleRate;
    const leftReal = 1 - pole * Math.cos(leftDelta);
    const leftImaginary = pole * Math.sin(leftDelta);
    const rightReal = 1 - pole * Math.cos(rightDelta);
    const rightImaginary = pole * Math.sin(rightDelta);
    voice.leftGains[activePartialCount] =
      (weight * Math.sqrt((1 - pan) / 2) * numerator) / Math.hypot(leftReal, leftImaginary);
    voice.rightGains[activePartialCount] =
      (weight * Math.sqrt((1 + pan) / 2) * numerator) / Math.hypot(rightReal, rightImaginary);
    voice.leftFrequencies[activePartialCount] = leftFrequency;
    voice.rightFrequencies[activePartialCount] = rightFrequency;
    voice.leftPhases[activePartialCount] = partial.sinePhase - Math.atan2(leftImaginary, leftReal);
    voice.rightPhases[activePartialCount] =
      partial.sinePhase - Math.atan2(rightImaginary, rightReal);
    voice.leftDeltaSines[activePartialCount] = Math.sin(leftDelta);
    voice.leftDeltaCosines[activePartialCount] = Math.cos(leftDelta);
    voice.rightDeltaSines[activePartialCount] = Math.sin(rightDelta);
    voice.rightDeltaCosines[activePartialCount] = Math.cos(rightDelta);
    voice.contacts[activePartialCount] = partial.harmonic === 1 ? 0 : 1;
    normalization += weight;
    activePartialCount++;
  }
  voice.activePartialCount = activePartialCount;
  voice.eventScale =
    normalization > 0
      ? (definition.outputGain * event.baseGain * event.accent ** 0.75) / normalization
      : 0;
}

function renderResidueBloomSample(program, state, absoluteTime) {
  const time = Math.max(0, absoluteTime);
  if (state.lastTime === time) return state.sample;
  state.lastTime = time;
  const score = program.score;
  const definition = score.definition;
  const ordinal = Math.floor(time / score.stepSeconds);
  const sample = state.sample;
  sample.dryLeft = 0;
  sample.dryRight = 0;
  sample.wetLeft = 0;
  sample.wetRight = 0;
  for (let offset = 0; offset < state.voices.length && offset <= ordinal; offset++) {
    const eventOrdinal = ordinal - offset;
    const voice = state.voices[eventOrdinal % state.voices.length];
    if (voice.ordinal !== eventOrdinal)
      prepareResidueBloomEvent(program, state, voice, eventOrdinal);
    if (voice.eventScale <= 0) continue;
    const age = time - voice.startSeconds;
    if (age <= 0 || age >= voice.endSeconds) continue;
    const attackProgress = clamp(age / voice.attackSeconds, 0, 1);
    const attackShape = attackProgress * attackProgress * (3 - 2 * attackProgress);
    const decay =
      age < voice.attackSeconds
        ? attackShape
        : Math.exp(-(age - voice.attackSeconds) / voice.decaySeconds);
    const releaseProgress = clamp((voice.endSeconds - age) / definition.releaseSeconds, 0, 1);
    const envelope = decay * releaseProgress * releaseProgress * (3 - 2 * releaseProgress);
    const contact =
      definition.contactSustain +
      (1 - definition.contactSustain) *
        voice.contactPeak *
        Math.exp(-Math.max(0, age - voice.attackSeconds) / definition.contactDecaySeconds);
    const reanchor =
      !Number.isFinite(voice.lastTime) ||
      Math.abs((time - voice.lastTime) * sampleRate - 1) > 1e-5 ||
      voice.rotationCount >= 1_024;
    let left = 0;
    let right = 0;
    for (let index = 0; index < voice.activePartialCount; index++) {
      let leftSine;
      let leftCosine;
      let rightSine;
      let rightCosine;
      if (reanchor) {
        const leftPhase =
          RESIDUE_TAU * voice.leftFrequencies[index] * age + voice.leftPhases[index];
        const rightPhase =
          RESIDUE_TAU * voice.rightFrequencies[index] * age + voice.rightPhases[index];
        leftSine = Math.sin(leftPhase);
        leftCosine = Math.cos(leftPhase);
        rightSine = Math.sin(rightPhase);
        rightCosine = Math.cos(rightPhase);
      } else {
        leftSine =
          voice.leftSines[index] * voice.leftDeltaCosines[index] +
          voice.leftCosines[index] * voice.leftDeltaSines[index];
        leftCosine =
          voice.leftCosines[index] * voice.leftDeltaCosines[index] -
          voice.leftSines[index] * voice.leftDeltaSines[index];
        rightSine =
          voice.rightSines[index] * voice.rightDeltaCosines[index] +
          voice.rightCosines[index] * voice.rightDeltaSines[index];
        rightCosine =
          voice.rightCosines[index] * voice.rightDeltaCosines[index] -
          voice.rightSines[index] * voice.rightDeltaSines[index];
      }
      voice.leftSines[index] = leftSine;
      voice.leftCosines[index] = leftCosine;
      voice.rightSines[index] = rightSine;
      voice.rightCosines[index] = rightCosine;
      const color = voice.contacts[index] ? contact : 1;
      left += leftSine * voice.leftGains[index] * color;
      right += rightSine * voice.rightGains[index] * color;
    }
    voice.lastTime = time;
    voice.rotationCount = reanchor ? 1 : voice.rotationCount + 1;
    const scale = voice.eventScale * envelope;
    sample.dryLeft += left * scale;
    sample.dryRight += right * scale;
    sample.wetLeft += left * scale * voice.wetScale;
    sample.wetRight += right * scale * voice.wetScale;
  }
  return sample;
}

function validateResidueBloomProgram(program) {
  const score = program.score;
  const definition = score?.definition;
  const phasorMapping = score?.phasorMapping;
  return (
    Array.isArray(program.partials) &&
    program.partials.length > 0 &&
    program.partials.every(
      (partial) =>
        isPositiveFinite(partial.harmonic) &&
        isFiniteNumber(partial.sourceFrequencyHz) &&
        isFiniteNumber(partial.sourceAmplitude) &&
        isFiniteNumber(partial.sinePhase),
    ) &&
    score &&
    isPositiveFinite(score.cycleSeconds) &&
    isPositiveFinite(score.stepSeconds) &&
    Number.isInteger(score.totalSteps) &&
    score.totalSteps > 0 &&
    Array.isArray(score.events) &&
    score.events.length === score.totalSteps &&
    score.events.every(
      (event, index) =>
        event &&
        event.globalStep === index &&
        typeof event.active === "boolean" &&
        isFiniteNumber(event.carrierHz) &&
        isFiniteNumber(event.baseGain) &&
        isFiniteNumber(event.baseAccent) &&
        isFiniteNumber(event.baseBrightness) &&
        isFiniteNumber(event.wetSend) &&
        isFiniteNumber(event.stereoSpread),
    ) &&
    definition &&
    [
      definition.attackSeconds,
      definition.decaySeconds,
      definition.releaseSeconds,
      definition.minimumNoteSeconds,
      definition.maximumNoteSeconds,
      definition.contactDecaySeconds,
      definition.antiAliasRatio,
      definition.stereoDetuneRatio,
      definition.timbreDamping,
      definition.outputGain,
    ].every(isPositiveFinite) &&
    definition.minimumNoteSeconds <= definition.maximumNoteSeconds &&
    definition.maximumNoteSeconds <= 2 * score.stepSeconds &&
    definition.releaseSeconds < definition.minimumNoteSeconds &&
    definition.attackSeconds * 1.1 < definition.minimumNoteSeconds &&
    isFiniteNumber(definition.contactSustain) &&
    definition.contactSustain >= 0 &&
    definition.contactSustain <= 1 &&
    definition.antiAliasRatio <= 0.9 &&
    definition.stereoDetuneRatio < 1 &&
    phasorMapping &&
    isPositiveFinite(phasorMapping.amplitudeBound) &&
    isFiniteNumber(phasorMapping.visualAngularRate) &&
    Array.isArray(phasorMapping.terms) &&
    phasorMapping.terms.length > 0 &&
    phasorMapping.terms.every(
      (term) =>
        isFiniteNumber(term.harmonic) &&
        isFiniteNumber(term.amplitude) &&
        isFiniteNumber(term.sinePhase),
    )
  );
}

export const residueBloomProcessor = {
  kind: "residue-bloom",
  validate: validateResidueBloomProgram,
  createState: createResidueBloomState,
  resetState: resetResidueBloomState,
  render(program, state, absoluteTimeSeconds) {
    return renderResidueBloomSample(program, state, absoluteTimeSeconds);
  },
};
