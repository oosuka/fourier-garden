function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function evaluateSerializedPhasor(mapping, absoluteTimeSeconds) {
  const angle = absoluteTimeSeconds * mapping.visualAngularRate;
  let x = 0;
  let y = 0;

  for (const term of mapping.terms) {
    const phase = term.harmonic * angle + term.sinePhase;
    x += term.amplitude * Math.cos(phase);
    y += term.amplitude * Math.sin(phase);
  }

  return {
    normalizedX: clamp(x / mapping.amplitudeBound, -1, 1),
    normalizedY: clamp(y / mapping.amplitudeBound, -1, 1),
    normalizedRadius: clamp(Math.hypot(x, y) / mapping.amplitudeBound, 0, 1),
  };
}

function evaluateEvent(score, event, cycleIndex) {
  const absoluteTimeSeconds =
    cycleIndex * score.cycleSeconds + event.globalStep * score.stepSeconds;
  const phasor = evaluateSerializedPhasor(score.phasorMapping, absoluteTimeSeconds);
  const phasorBrightness = (phasor.normalizedY + 1) * 0.5;

  return {
    ...event,
    absoluteTimeSeconds,
    brightness: clamp(event.baseBrightness * 0.72 + phasorBrightness * 0.28, 0, 1),
    accent: event.active ? event.baseAccent * (0.9 + phasor.normalizedRadius * 0.2) : 0,
    normalizedPhasorX: phasor.normalizedX,
    normalizedPhasorY: phasor.normalizedY,
    normalizedPhasorRadius: phasor.normalizedRadius,
  };
}

class FourierGardenProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.partials = [];
    this.score = null;
    this.active = false;
    this.sampleCursor = 0;
    this.fade = 0;
    this.filterLeft = 0;
    this.filterRight = 0;
    this.cachedEventKey = "";
    this.cachedEvent = null;

    this.port.onmessage = ({ data }) => {
      if (data.type === "configure") {
        this.partials = data.partials;
        this.score = data.score;
        this.cachedEventKey = "";
        this.cachedEvent = null;
      }
      if (data.type === "active") {
        this.active = data.value;
      }
      if (data.type === "seek") {
        this.sampleCursor = Math.max(0, Math.round(data.seconds * sampleRate));
        this.filterLeft = 0;
        this.filterRight = 0;
        this.cachedEventKey = "";
        this.cachedEvent = null;
      }
    };
  }

  process(_inputs, outputs) {
    const dryOutput = outputs[0];
    const wetOutput = outputs[1];
    const dryLeft = dryOutput[0];
    const dryRight = dryOutput[1] ?? dryOutput[0];
    const wetLeft = wetOutput[0];
    const wetRight = wetOutput[1] ?? wetOutput[0];
    const target = this.active ? 1 : 0;

    for (let frame = 0; frame < dryLeft.length; frame += 1) {
      this.fade += (target - this.fade) * 0.0018;
      const score = this.score;
      if (!score || this.partials.length === 0) {
        dryLeft[frame] = 0;
        dryRight[frame] = 0;
        wetLeft[frame] = 0;
        wetRight[frame] = 0;
        continue;
      }

      const absoluteTime = this.sampleCursor / sampleRate;
      const cycleTime =
        ((absoluteTime % score.cycleSeconds) + score.cycleSeconds) % score.cycleSeconds;
      const cycleIndex = Math.floor(Math.max(0, absoluteTime) / score.cycleSeconds);
      const globalStep = Math.min(score.totalSteps - 1, Math.floor(cycleTime / score.stepSeconds));
      const localTime = cycleTime - globalStep * score.stepSeconds;
      const eventKey = `${cycleIndex}:${globalStep}`;
      if (this.cachedEventKey !== eventKey) {
        this.cachedEventKey = eventKey;
        const baseEvent = score.events[globalStep];
        this.cachedEvent = evaluateEvent(score, baseEvent, cycleIndex);
      }
      const event = this.cachedEvent;
      const decayScale = 0.88 + event.normalizedPhasorRadius * 0.24;
      const attackProgress = Math.min(1, Math.max(0, localTime / score.definition.attackSeconds));
      const attackShape = attackProgress * attackProgress * (3 - 2 * attackProgress);
      const decay =
        localTime < score.definition.attackSeconds
          ? attackShape
          : Math.exp(
              -(localTime - score.definition.attackSeconds) /
                (score.definition.decaySeconds * decayScale),
            );
      const releaseProgress = Math.min(
        1,
        Math.max(0, (score.stepSeconds - localTime) / score.definition.releaseSeconds),
      );
      const releaseShape = releaseProgress * releaseProgress * (3 - 2 * releaseProgress);
      const envelope = event.active ? decay * releaseShape : 0;
      let leftSample = 0;
      let rightSample = 0;
      let normalization = 0;
      const frequencyLimit = sampleRate * 0.5 * score.definition.antiAliasRatio;
      const detune = score.definition.stereoDetuneRatio;

      if (event.active) {
        for (let index = 0; index < this.partials.length; index += 1) {
          const partial = this.partials[index];
          const nominalFrequency = event.carrierHz * partial.harmonic;
          const leftFrequency = nominalFrequency * (1 - detune);
          const rightFrequency = nominalFrequency * (1 + detune);
          if (Math.max(leftFrequency, rightFrequency) >= frequencyLimit) {
            continue;
          }
          const gain =
            partial.sourceAmplitude / Math.pow(index + 1, score.definition.timbreDamping);
          const leftPhase = Math.PI * 2 * leftFrequency * localTime + partial.sinePhase;
          const rightPhase = Math.PI * 2 * rightFrequency * localTime + partial.sinePhase;
          const eventPan = event.normalizedPhasorX * 0.28;
          const partialPan = Math.sin(index * 2.399963229728653) * 0.24 * event.stereoSpread;
          const pan = Math.min(0.92, Math.max(-0.92, eventPan + partialPan));
          const leftPanGain = Math.sqrt((1 - pan) * 0.5);
          const rightPanGain = Math.sqrt((1 + pan) * 0.5);
          leftSample += Math.sin(leftPhase) * gain * leftPanGain;
          rightSample += Math.sin(rightPhase) * gain * rightPanGain;
          normalization += gain;
        }
      }

      const scale =
        normalization > 0
          ? (score.definition.outputGain * envelope * event.baseGain * event.accent) / normalization
          : 0;
      const unfilteredLeft = leftSample * scale;
      const unfilteredRight = rightSample * scale;
      const minimumCutoffHz = 1_800;
      const maximumCutoffHz = Math.min(6_200, sampleRate * 0.18);
      const cutoffHz = minimumCutoffHz + (maximumCutoffHz - minimumCutoffHz) * event.brightness;
      const filterCoefficient = 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
      this.filterLeft += (unfilteredLeft - this.filterLeft) * filterCoefficient;
      this.filterRight += (unfilteredRight - this.filterRight) * filterCoefficient;

      if (event.active) {
        const dryScale = 1;
        const wetScale = 0.5;
        dryLeft[frame] = this.filterLeft * dryScale * this.fade;
        dryRight[frame] = this.filterRight * dryScale * this.fade;
        wetLeft[frame] = this.filterLeft * event.wetSend * wetScale * this.fade;
        wetRight[frame] = this.filterRight * event.wetSend * wetScale * this.fade;
      } else {
        dryLeft[frame] = 0;
        dryRight[frame] = 0;
        wetLeft[frame] = 0;
        wetRight[frame] = 0;
      }

      if (this.active || this.fade > 0.0001) {
        this.sampleCursor += 1;
      }
    }

    return true;
  }
}

registerProcessor("fourier-garden-processor", FourierGardenProcessor);
