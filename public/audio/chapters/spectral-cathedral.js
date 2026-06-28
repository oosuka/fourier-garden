import {
  getEqualPowerPanGains,
  hashUint32,
  isFiniteNumber,
  isNonnegativeFinite,
  isPositiveFinite,
} from "./shared.js?v=11";

function evaluateSpectralCathedralEvents(score, absoluteTimeSeconds, maximumAgeSeconds) {
  if (
    !Number.isFinite(absoluteTimeSeconds) ||
    !Number.isFinite(maximumAgeSeconds) ||
    absoluteTimeSeconds < 0 ||
    maximumAgeSeconds <= 0
  ) {
    return [];
  }

  const currentCycleIndex = Math.floor(absoluteTimeSeconds / score.cycleSeconds);
  const evaluated = [];

  for (const cycleIndex of [currentCycleIndex - 1, currentCycleIndex]) {
    if (cycleIndex < 0) continue;

    for (const event of score.events) {
      const eventTimeSeconds = cycleIndex * score.cycleSeconds + event.localTimeSeconds;
      const ageSeconds = absoluteTimeSeconds - eventTimeSeconds;
      if (ageSeconds < 0 || ageSeconds >= maximumAgeSeconds) continue;

      evaluated.push({
        ...event,
        cycleIndex,
        absoluteEventIndex: cycleIndex * score.events.length + event.index,
        absoluteTimeSeconds: eventTimeSeconds,
        ageSeconds,
      });
    }
  }

  return evaluated.toSorted((left, right) => left.absoluteTimeSeconds - right.absoluteTimeSeconds);
}

function getSpectralCathedralBellEnvelope(ageSeconds, gesture, preset, decayScale) {
  const articulation = preset.articulations[gesture];
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds >= articulation.endSeconds) {
    return 0;
  }

  const body =
    (1 - Math.exp(-ageSeconds / articulation.attackSeconds)) *
    Math.exp(-ageSeconds / (articulation.decaySeconds * decayScale));
  if (ageSeconds < articulation.fadeStartSeconds) return body;

  const fadeProgress =
    (ageSeconds - articulation.fadeStartSeconds) /
    (articulation.endSeconds - articulation.fadeStartSeconds);
  return body * 0.5 * (1 + Math.cos(Math.PI * fadeProgress));
}

function getSpectralCathedralModeExpression(mode, absoluteEventTimeSeconds) {
  const phase = mode.modalAngularFrequency * absoluteEventTimeSeconds;
  return {
    displacement: Math.abs(Math.cos(phase)),
    velocity: Math.abs(Math.sin(phase)),
  };
}

function evaluateSpectralCathedralEventExpression(event, modes) {
  const selected = modes.filter((mode) => event.modeIds.includes(mode.id));
  if (selected.length === 0) return null;
  const displacement =
    selected.reduce(
      (sum, mode) =>
        sum + getSpectralCathedralModeExpression(mode, event.absoluteTimeSeconds).displacement,
      0,
    ) / selected.length;
  const velocity =
    selected.reduce(
      (sum, mode) =>
        sum + getSpectralCathedralModeExpression(mode, event.absoluteTimeSeconds).velocity,
      0,
    ) / selected.length;
  return {
    brightness: Math.min(1, event.baseBrightness * (0.78 + velocity * 0.38)),
    wetSend: Math.min(1, event.wetSend * (0.8 + displacement * 0.32)),
    woodScale: 0.72 + velocity * 0.56,
    decayScale: 0.82 + displacement * 0.38,
  };
}

function hashUnit(absoluteEventIndex, modeId, component, salt) {
  const seed =
    Math.imul(absoluteEventIndex + 1, 0x9e3779b1) ^
    Math.imul(modeId + 1, 0x85ebca6b) ^
    Math.imul(component + 1, 0xc2b2ae35) ^
    salt;
  return hashUint32(seed) / 0x1_0000_0000;
}

function getSpectralCathedralWoodAttack(absoluteEventIndex, modeId, ageSeconds, preset) {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds >= preset.woodAttackSeconds) {
    return 0;
  }

  let value = 0;
  let normalization = 0;

  for (let component = 0; component < preset.woodComponentCount; component += 1) {
    const weight = 1 / Math.sqrt(component + 1);
    const frequencyUnit = hashUnit(absoluteEventIndex, modeId, component, 0x68bc21eb);
    const phaseUnit = hashUnit(absoluteEventIndex, modeId, component, 0x02e5be93);
    const frequencyHz =
      preset.woodMinimumHz + (preset.woodMaximumHz - preset.woodMinimumHz) * frequencyUnit;
    value += weight * Math.sin(Math.PI * 2 * frequencyHz * ageSeconds + Math.PI * 2 * phaseUnit);
    normalization += weight;
  }

  const envelope = Math.sin((Math.PI * ageSeconds) / preset.woodAttackSeconds) ** 2;
  return normalization > 0 ? (value / normalization) * envelope : 0;
}

function renderSpectralCathedralModeVoice(mode, pan, event, expression, preset) {
  const [panLeft, panRight] = getEqualPowerPanGains(pan);
  const maximumFrequencyHz = sampleRate * 0.5 * preset.antiAliasRatio;
  const startPhase =
    mode.modalAngularFrequency * event.absoluteTimeSeconds + mode.coefficientPhaseOffset;
  let bellLeft = 0;
  let bellRight = 0;

  for (let partial = 1; partial <= preset.maximumPartials; partial += 1) {
    const leftFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 - preset.stereoDetuneRatio);
    const rightFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 + preset.stereoDetuneRatio);
    if (Math.max(leftFrequencyHz, rightFrequencyHz) >= maximumFrequencyHz) continue;

    const damping = preset.partialDamping + (1 - expression.brightness) * 0.45;
    const weight = partial ** -damping;
    const partialStartPhase = partial * startPhase;
    bellLeft +=
      weight * Math.sin(Math.PI * 2 * leftFrequencyHz * event.ageSeconds + partialStartPhase);
    bellRight +=
      weight * Math.sin(Math.PI * 2 * rightFrequencyHz * event.ageSeconds + partialStartPhase);
  }

  const bellEnvelope = getSpectralCathedralBellEnvelope(
    event.ageSeconds,
    event.gesture,
    preset,
    expression.decayScale,
  );
  const articulation = preset.articulations[event.gesture];
  const wood =
    articulation.woodAttackGain *
    expression.woodScale *
    getSpectralCathedralWoodAttack(event.absoluteEventIndex, mode.id, event.ageSeconds, preset);
  return [
    mode.normalizedGain * panLeft * (bellLeft * bellEnvelope + wood),
    mode.normalizedGain * panRight * (bellRight * bellEnvelope + wood),
  ];
}

function renderSpectralCathedralSample(program, absoluteTimeSeconds) {
  const events = evaluateSpectralCathedralEvents(
    program.score,
    absoluteTimeSeconds,
    program.synthesis.maximumEventSeconds,
  );
  if (events.length === 0) {
    return { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 };
  }

  let left = 0;
  let right = 0;
  let wetLeft = 0;
  let wetRight = 0;

  for (const event of events) {
    let eventLeft = 0;
    let eventRight = 0;
    const expression = evaluateSpectralCathedralEventExpression(event, program.modes);
    if (!expression) {
      return {
        dryLeft: Number.NaN,
        dryRight: Number.NaN,
        wetLeft: Number.NaN,
        wetRight: Number.NaN,
      };
    }
    for (const [voiceIndex, modeId] of event.modeIds.entries()) {
      const mode = program.modes.find((candidate) => candidate.id === modeId);
      if (!mode) {
        return {
          dryLeft: Number.NaN,
          dryRight: Number.NaN,
          wetLeft: Number.NaN,
          wetRight: Number.NaN,
        };
      }
      const centeredPan =
        event.modeIds.length === 1 ? 0 : (voiceIndex / (event.modeIds.length - 1)) * 2 - 1;
      const pan = centeredPan * event.stereoSpread;
      const [voiceLeft, voiceRight] = renderSpectralCathedralModeVoice(
        mode,
        pan,
        event,
        expression,
        program.synthesis,
      );
      eventLeft += voiceLeft;
      eventRight += voiceRight;
    }

    const scale = (program.synthesis.outputGain * event.baseGain) / program.normalization;
    left += eventLeft * scale;
    right += eventRight * scale;
    wetLeft += eventLeft * scale * expression.wetSend;
    wetRight += eventRight * scale * expression.wetSend;
  }

  return {
    dryLeft: left,
    dryRight: right,
    wetLeft,
    wetRight,
  };
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
    score.events.length === 95 &&
    score.events.every(
      (event) =>
        event &&
        Number.isInteger(event.index) &&
        Number.isInteger(event.barIndex) &&
        Number.isInteger(event.slotInBar) &&
        event.slotInBar >= 0 &&
        event.slotInBar < 10 &&
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
        [1, 1.5, 2].includes(event.registerMultiplier),
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
        isNonnegativeFinite(articulation.woodAttackGain)
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
  createState() {
    return {};
  },
  resetState() {},
  render(program, _state, absoluteTimeSeconds) {
    return renderSpectralCathedralSample(program, absoluteTimeSeconds);
  },
};
