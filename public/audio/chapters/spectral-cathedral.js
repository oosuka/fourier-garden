import {
  getEqualPowerPanGains,
  hashUint32,
  isFiniteNumber,
  isNonnegativeFinite,
  isPositiveFinite,
} from "./shared.js?v=24";

function hashUnit(eventIndex, modeId, component, salt) {
  const seed =
    Math.imul(eventIndex + 1, 0x9e3779b1) ^
    Math.imul(modeId + 1, 0x85ebca6b) ^
    Math.imul(component + 1, 0xc2b2ae35) ^
    salt;
  return hashUint32(seed) / 0x1_0000_0000;
}

function getSpectralCathedralLowCutWeight(frequencyHz) {
  const ratio = Math.max(0, frequencyHz) / 260;
  const squared = ratio * ratio;
  return squared / Math.sqrt(1 + squared * squared);
}

function createSpectralCathedralRuntimeVoice(event, mode, modeIndex, preset, frequencyLimitHz) {
  const centeredPan =
    event.modeIds.length === 1 ? 0 : (modeIndex / (event.modeIds.length - 1)) * 2 - 1;
  const basePan = centeredPan * event.stereoSpread;
  const panGains = getEqualPowerPanGains(basePan);
  const partials = [];
  for (let partial = 1; partial <= preset.maximumPartials; partial += 1) {
    const leftFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 - preset.stereoDetuneRatio);
    const rightFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 + preset.stereoDetuneRatio);
    if (Math.max(leftFrequencyHz, rightFrequencyHz) >= frequencyLimitHz) continue;
    partials.push({
      partial,
      leftFrequencyHz,
      rightFrequencyHz,
      baseWeight:
        partial ** -preset.partialDamping *
        getSpectralCathedralLowCutWeight((leftFrequencyHz + rightFrequencyHz) * 0.5),
    });
  }

  const wood = [];
  let woodNormalization = 0;
  for (let component = 0; component < preset.woodComponentCount; component += 1) {
    const frequencyUnit = hashUnit(event.index, mode.id, component, 0x68bc21eb);
    const phaseUnit = hashUnit(event.index, mode.id, component, 0x02e5be93);
    const frequencyHz =
      preset.woodMinimumHz + (preset.woodMaximumHz - preset.woodMinimumHz) * frequencyUnit;
    if (frequencyHz >= frequencyLimitHz) continue;
    const weight = 1 / Math.sqrt(component + 1);
    wood.push({
      frequencyHz,
      phaseRadians: Math.PI * 2 * phaseUnit,
      weight,
    });
    woodNormalization += weight;
  }

  return {
    modeId: mode.id,
    normalizedGain: mode.normalizedGain,
    modalAngularFrequency: mode.modalAngularFrequency,
    coefficientPhaseOffset: mode.coefficientPhaseOffset,
    basePan,
    panLeft: panGains[0],
    panRight: panGains[1],
    partials,
    wood,
    woodNormalization,
  };
}

function createSpectralCathedralRuntime(program) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return null;
  const preset = program.synthesis;
  const frequencyLimitHz = sampleRate * 0.5 * preset.antiAliasRatio;
  const events = [];
  for (let eventIndex = 0; eventIndex < program.score.events.length; eventIndex += 1) {
    const event = program.score.events[eventIndex];
    const articulation = preset.articulations[event.gesture];
    const voices = [];
    for (let modeIndex = 0; modeIndex < event.modeIds.length; modeIndex += 1) {
      const modeId = event.modeIds[modeIndex];
      const mode = program.modes.find((candidate) => candidate.id === modeId);
      if (!mode) return null;
      voices.push(
        createSpectralCathedralRuntimeVoice(event, mode, modeIndex, preset, frequencyLimitHz),
      );
    }
    events.push({
      index: event.index,
      localTimeSeconds: event.localTimeSeconds,
      gesture: event.gesture,
      baseGain: event.baseGain,
      baseBrightness: event.baseBrightness,
      wetSend: event.wetSend,
      fadeStartSeconds: articulation.fadeStartSeconds,
      endSeconds: articulation.endSeconds,
      attackSeconds: articulation.attackSeconds,
      decaySeconds: articulation.decaySeconds,
      woodAttackGain: articulation.woodAttackGain,
      subgrains: articulation.subgrainOffsetsSeconds.map((offsetSeconds, index) => ({
        offsetSeconds,
        gain: articulation.subgrainGains[index],
      })),
      voices,
    });
  }
  return {
    sampleRate,
    cycleSeconds: program.score.cycleSeconds,
    maximumEventSeconds: preset.maximumEventSeconds,
    woodAttackSeconds: preset.woodAttackSeconds,
    outputGain: preset.outputGain,
    normalization: program.normalization,
    events,
  };
}

function getRuntimeBellEnvelope(ageSeconds, event, decayScale) {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds >= event.endSeconds) return 0;
  const body =
    (1 - Math.exp(-ageSeconds / event.attackSeconds)) *
    Math.exp(-ageSeconds / (event.decaySeconds * decayScale));
  if (ageSeconds < event.fadeStartSeconds) return body;
  const fadeProgress =
    (ageSeconds - event.fadeStartSeconds) / (event.endSeconds - event.fadeStartSeconds);
  return body * 0.5 * (1 + Math.cos(Math.PI * fadeProgress));
}

function renderRuntimeWood(voice, ageSeconds, woodAttackSeconds) {
  if (ageSeconds < 0 || ageSeconds >= woodAttackSeconds || voice.woodNormalization <= 0) return 0;
  let value = 0;
  for (let componentIndex = 0; componentIndex < voice.wood.length; componentIndex += 1) {
    const component = voice.wood[componentIndex];
    value +=
      component.weight *
      Math.sin(Math.PI * 2 * component.frequencyHz * ageSeconds + component.phaseRadians);
  }
  const envelope = Math.sin((Math.PI * ageSeconds) / woodAttackSeconds) ** 2;
  return (value / voice.woodNormalization) * envelope;
}

function findLatestSpectralCathedralEventIndex(events, localTimeSeconds) {
  let low = 0;
  let high = events.length - 1;
  let latest = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (events[middle].localTimeSeconds <= localTimeSeconds) {
      latest = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return latest;
}

function accumulateSpectralCathedralRuntimeEvent(
  runtime,
  event,
  absoluteEventTimeSeconds,
  absoluteTimeSeconds,
  target,
) {
  const baseAgeSeconds = absoluteTimeSeconds - absoluteEventTimeSeconds;
  if (baseAgeSeconds < 0 || baseAgeSeconds >= runtime.maximumEventSeconds) return;
  if (event.voices.length === 0) return;

  let expressionDisplacement = 0;
  let expressionVelocity = 0;
  for (let voiceIndex = 0; voiceIndex < event.voices.length; voiceIndex += 1) {
    const voice = event.voices[voiceIndex];
    const phase = voice.modalAngularFrequency * absoluteEventTimeSeconds;
    expressionDisplacement += Math.abs(Math.cos(phase));
    expressionVelocity += Math.abs(Math.sin(phase));
  }
  expressionDisplacement /= event.voices.length;
  expressionVelocity /= event.voices.length;

  const brightness = Math.min(1, event.baseBrightness * (0.78 + expressionVelocity * 0.38));
  const wetSend = Math.min(1, event.wetSend * (0.8 + expressionDisplacement * 0.32));
  const woodScale = 0.72 + expressionVelocity * 0.56;
  const decayScale = 0.82 + expressionDisplacement * 0.38;
  let eventLeft = 0;
  let eventRight = 0;

  for (let subgrainIndex = 0; subgrainIndex < event.subgrains.length; subgrainIndex += 1) {
    const subgrain = event.subgrains[subgrainIndex];
    const subgrainAgeSeconds = baseAgeSeconds - subgrain.offsetSeconds;
    const envelope = getRuntimeBellEnvelope(subgrainAgeSeconds, event, decayScale) * subgrain.gain;
    if (envelope <= 0) continue;

    for (let voiceIndex = 0; voiceIndex < event.voices.length; voiceIndex += 1) {
      const voice = event.voices[voiceIndex];
      const startPhase =
        voice.modalAngularFrequency * absoluteEventTimeSeconds + voice.coefficientPhaseOffset;
      let bellLeft = 0;
      let bellRight = 0;
      for (let partialIndex = 0; partialIndex < voice.partials.length; partialIndex += 1) {
        const partial = voice.partials[partialIndex];
        const partialPosition = (partial.partial - 1) / Math.max(1, voice.partials.length - 1);
        const dampingBrightness = 1 + (brightness - 0.5) * 0.24 * partialPosition;
        const weight = partial.baseWeight * dampingBrightness;
        const partialStartPhase = partial.partial * startPhase;
        bellLeft +=
          weight *
          Math.sin(Math.PI * 2 * partial.leftFrequencyHz * absoluteTimeSeconds + partialStartPhase);
        bellRight +=
          weight *
          Math.sin(
            Math.PI * 2 * partial.rightFrequencyHz * absoluteTimeSeconds + partialStartPhase,
          );
      }
      const wood =
        event.woodAttackGain *
        woodScale *
        renderRuntimeWood(voice, subgrainAgeSeconds, runtime.woodAttackSeconds);
      eventLeft += voice.normalizedGain * voice.panLeft * (bellLeft * envelope + wood);
      eventRight += voice.normalizedGain * voice.panRight * (bellRight * envelope + wood);
    }
  }

  const scale = (runtime.outputGain * event.baseGain) / runtime.normalization;
  target.dryLeft += eventLeft * scale;
  target.dryRight += eventRight * scale;
  target.wetLeft += eventLeft * scale * wetSend;
  target.wetRight += eventRight * scale * wetSend;
}

function renderSpectralCathedralSample(_program, runtime, absoluteTimeSeconds, target) {
  target.dryLeft = 0;
  target.dryRight = 0;
  target.wetLeft = 0;
  target.wetRight = 0;
  if (!Number.isFinite(absoluteTimeSeconds) || absoluteTimeSeconds < 0) return;

  const currentCycleIndex = Math.floor(absoluteTimeSeconds / runtime.cycleSeconds);
  const currentCycleStart = currentCycleIndex * runtime.cycleSeconds;
  const localTimeSeconds = absoluteTimeSeconds - currentCycleStart;
  const latestIndex = findLatestSpectralCathedralEventIndex(runtime.events, localTimeSeconds);
  for (let index = latestIndex; index >= 0; index -= 1) {
    const event = runtime.events[index];
    const absoluteEventTimeSeconds = currentCycleStart + event.localTimeSeconds;
    if (absoluteTimeSeconds - absoluteEventTimeSeconds >= runtime.maximumEventSeconds) break;
    accumulateSpectralCathedralRuntimeEvent(
      runtime,
      event,
      absoluteEventTimeSeconds,
      absoluteTimeSeconds,
      target,
    );
  }

  if (currentCycleIndex > 0 && localTimeSeconds < runtime.maximumEventSeconds) {
    const previousCycleStart = currentCycleStart - runtime.cycleSeconds;
    for (let index = runtime.events.length - 1; index >= 0; index -= 1) {
      const event = runtime.events[index];
      const absoluteEventTimeSeconds = previousCycleStart + event.localTimeSeconds;
      if (absoluteTimeSeconds - absoluteEventTimeSeconds >= runtime.maximumEventSeconds) break;
      accumulateSpectralCathedralRuntimeEvent(
        runtime,
        event,
        absoluteEventTimeSeconds,
        absoluteTimeSeconds,
        target,
      );
    }
  }
}

function validateSpectralCathedralProgram(program) {
  const preset = program.synthesis;
  const score = program.score;
  const modes = program.modes;
  const modeIds = Array.isArray(modes) ? new Set(modes.map((mode) => mode.id)) : new Set();
  const gestureIds = ["toll", "answer", "cascade", "pulse", "choir"];
  return (
    score &&
    isPositiveFinite(score.cycleSeconds) &&
    isPositiveFinite(score.beatSeconds) &&
    isPositiveFinite(score.barSeconds) &&
    Array.isArray(score.events) &&
    score.events.length === 360 &&
    score.events.every(
      (event) =>
        event &&
        Number.isInteger(event.index) &&
        Number.isInteger(event.barIndex) &&
        Number.isInteger(event.slotInBar) &&
        event.slotInBar >= 0 &&
        event.slotInBar < 20 &&
        typeof event.section === "string" &&
        gestureIds.includes(event.gesture) &&
        Array.isArray(event.modeIds) &&
        event.modeIds.length > 0 &&
        event.modeIds.length <= 4 &&
        event.modeIds.every((modeId) => Number.isInteger(modeId) && modeIds.has(modeId)) &&
        isNonnegativeFinite(event.localTimeSeconds) &&
        event.localTimeSeconds < score.cycleSeconds &&
        isNonnegativeFinite(event.baseGain) &&
        isNonnegativeFinite(event.baseBrightness) &&
        event.baseBrightness <= 1 &&
        isNonnegativeFinite(event.wetSend) &&
        event.wetSend <= 1 &&
        isNonnegativeFinite(event.stereoSpread) &&
        event.stereoSpread <= 1 &&
        event.registerMultiplier === 1,
    ) &&
    Array.isArray(modes) &&
    modes.length === 12 &&
    modeIds.size === modes.length &&
    modes.every(
      (mode) =>
        Number.isInteger(mode.id) &&
        isPositiveFinite(mode.eigenvalue) &&
        isFiniteNumber(mode.coefficient) &&
        isPositiveFinite(mode.baseFrequencyHz) &&
        isNonnegativeFinite(mode.normalizedGain) &&
        isPositiveFinite(mode.modalAngularFrequency) &&
        (mode.coefficientPhaseOffset === 0 || mode.coefficientPhaseOffset === Math.PI),
    ) &&
    preset &&
    Number.isInteger(preset.maximumPartials) &&
    preset.maximumPartials > 0 &&
    Number.isInteger(preset.woodComponentCount) &&
    preset.woodComponentCount > 0 &&
    [
      preset.partialDamping,
      preset.maximumEventSeconds,
      preset.woodAttackSeconds,
      preset.woodMinimumHz,
      preset.woodMaximumHz,
      preset.outputGain,
      program.normalization,
    ].every(isPositiveFinite) &&
    preset.articulations &&
    gestureIds.every((gesture) => {
      const articulation = preset.articulations[gesture];
      return (
        articulation &&
        isPositiveFinite(articulation.attackSeconds) &&
        isPositiveFinite(articulation.decaySeconds) &&
        isNonnegativeFinite(articulation.fadeStartSeconds) &&
        isPositiveFinite(articulation.endSeconds) &&
        articulation.fadeStartSeconds < articulation.endSeconds &&
        isNonnegativeFinite(articulation.woodAttackGain) &&
        Array.isArray(articulation.subgrainOffsetsSeconds) &&
        Array.isArray(articulation.subgrainGains) &&
        articulation.subgrainOffsetsSeconds.length > 0 &&
        articulation.subgrainOffsetsSeconds.length === articulation.subgrainGains.length &&
        articulation.subgrainOffsetsSeconds[0] === 0 &&
        articulation.subgrainOffsetsSeconds.every(
          (offsetSeconds) =>
            isNonnegativeFinite(offsetSeconds) && offsetSeconds < articulation.endSeconds,
        ) &&
        articulation.subgrainGains.every((gain) => isPositiveFinite(gain) && gain <= 1)
      );
    }) &&
    preset.woodMinimumHz <= preset.woodMaximumHz &&
    isNonnegativeFinite(preset.stereoDetuneRatio) &&
    preset.stereoDetuneRatio < 1 &&
    isPositiveFinite(preset.antiAliasRatio) &&
    preset.antiAliasRatio <= 1
  );
}

export const spectralCathedralProcessor = {
  kind: "spectral-cathedral",
  validate: validateSpectralCathedralProgram,
  stateError: "Unable to create Spectral Cathedral runtime",
  createState(program) {
    const runtime = createSpectralCathedralRuntime(program);
    if (!runtime) return null;
    return {
      runtime,
      sample: { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 },
    };
  },
  resetState() {},
  render(program, state, absoluteTimeSeconds) {
    renderSpectralCathedralSample(program, state.runtime, absoluteTimeSeconds, state.sample);
    return state.sample;
  },
};
