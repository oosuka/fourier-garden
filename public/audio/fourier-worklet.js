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

    this.port.onmessage = ({ data }) => {
      if (data.type === "configure") {
        this.partials = data.partials;
        this.score = data.score;
      }
      if (data.type === "active") {
        this.active = data.value;
      }
      if (data.type === "seek") {
        this.sampleCursor = Math.max(0, Math.round(data.seconds * sampleRate));
        this.filterLeft = 0;
        this.filterRight = 0;
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
      const globalStep = Math.min(score.totalSteps - 1, Math.floor(cycleTime / score.stepSeconds));
      const localTime = cycleTime - globalStep * score.stepSeconds;
      const event = score.events[globalStep];
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

      if (event.active) {
        for (let index = 0; index < this.partials.length; index += 1) {
          const partial = this.partials[index];
          const frequency = event.carrierHz * partial.harmonic;
          if (frequency >= sampleRate * 0.5 * score.definition.antiAliasRatio) {
            continue;
          }
          const gain =
            partial.sourceAmplitude / Math.pow(index + 1, score.definition.timbreDamping);
          const detune = 0.00125;
          const leftPhase = Math.PI * 2 * frequency * (1 - detune) * localTime + partial.sinePhase;
          const rightPhase = Math.PI * 2 * frequency * (1 + detune) * localTime + partial.sinePhase;
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
          ? (score.definition.outputGain * envelope * event.gain * event.accent) / normalization
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
