class FourierGardenProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.partials = [];
    this.active = false;
    this.sampleCursor = 0;
    this.fade = 0;
    this.rhythm = null;

    this.port.onmessage = ({ data }) => {
      if (data.type === "configure") {
        this.partials = data.partials;
        this.rhythm = data.rhythm;
      }
      if (data.type === "active") {
        this.active = data.value;
      }
      if (data.type === "seek") {
        this.sampleCursor = Math.max(0, Math.round(data.seconds * sampleRate));
      }
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    const left = output[0];
    const right = output[1] ?? output[0];
    const target = this.active ? 1 : 0;

    for (let frame = 0; frame < left.length; frame += 1) {
      this.fade += (target - this.fade) * 0.0018;
      const time = this.sampleCursor / sampleRate;
      const rhythm = this.rhythm;
      if (!rhythm || this.partials.length === 0) {
        left[frame] = 0;
        right[frame] = 0;
        continue;
      }

      const stepIndex = Math.floor(time / rhythm.stepSeconds);
      const localTime = time - stepIndex * rhythm.stepSeconds;
      const carrier =
        rhythm.frequenciesHz[
          stepIndex % rhythm.frequenciesHz.length
        ];
      const attackProgress = Math.min(
        1,
        Math.max(0, localTime / rhythm.attackSeconds),
      );
      const attackShape =
        attackProgress *
        attackProgress *
        (3 - 2 * attackProgress);
      const decay =
        localTime < rhythm.attackSeconds
          ? attackShape
          : Math.exp(
              -(localTime - rhythm.attackSeconds) /
                rhythm.decaySeconds,
            );
      const releaseProgress = Math.min(
        1,
        Math.max(
          0,
          (rhythm.stepSeconds - localTime) /
            rhythm.releaseSeconds,
        ),
      );
      const releaseShape =
        releaseProgress *
        releaseProgress *
        (3 - 2 * releaseProgress);
      const envelope = decay * releaseShape;
      let leftSample = 0;
      let rightSample = 0;
      let normalization = 0;

      for (let index = 0; index < this.partials.length; index += 1) {
        const partial = this.partials[index];
        const frequency = carrier * partial.harmonic;
        if (
          frequency >=
          sampleRate * 0.5 * rhythm.antiAliasRatio
        ) {
          continue;
        }
        const gain =
          partial.sourceAmplitude /
          Math.pow(index + 1, rhythm.timbreDamping);
        const detune = 0.00125;
        const leftPhase =
          Math.PI *
            2 *
            frequency *
            (1 - detune) *
            localTime +
          partial.sinePhase;
        const rightPhase =
          Math.PI *
            2 *
            frequency *
            (1 + detune) *
            localTime +
          partial.sinePhase;
        const pan = Math.sin(index * 2.399963229728653) * 0.24;
        leftSample +=
          Math.sin(leftPhase) *
          gain *
          Math.sqrt((1 - pan) * 0.5);
        rightSample +=
          Math.sin(rightPhase) *
          gain *
          Math.sqrt((1 + pan) * 0.5);
        normalization += gain;
      }

      const scale =
        normalization > 0
          ? rhythm.outputGain / normalization
          : 0;
      left[frame] =
        leftSample * scale * envelope * this.fade;
      right[frame] =
        rightSample * scale * envelope * this.fade;

      if (this.active || this.fade > 0.0001) {
        this.sampleCursor += 1;
      }
    }

    return true;
  }
}

registerProcessor("fourier-garden-processor", FourierGardenProcessor);
