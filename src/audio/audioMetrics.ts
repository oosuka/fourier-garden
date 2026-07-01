export interface StereoMetrics {
  rms: number;
  peak: number;
  mean: number;
}

export interface BandEnergyRatios {
  below150Hz: number;
  below250Hz: number;
  below400Hz: number;
  between400HzAnd3000Hz: number;
  between900HzAnd3000Hz: number;
  between1200HzAnd10000Hz: number;
  between1800HzAnd10000Hz: number;
  between2400HzAnd10000Hz: number;
  between3000HzAnd10000Hz: number;
}

export interface LowRmsContinuity {
  windowSeconds: number;
  threshold: number;
  maximumLowRmsSeconds: number;
}

export interface OnsetSpacing {
  onsetCount: number;
  medianSeconds: number;
  p10Seconds: number;
  p90Seconds: number;
  pulseScore: number;
}

function assertMatchingStereo(left: Float32Array, right: Float32Array): void {
  if (left.length !== right.length) {
    throw new Error("Stereo channels must have the same length");
  }
  if (left.length === 0) {
    throw new Error("Stereo metrics require at least one sample");
  }
}

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be positive and finite`);
  }
}

export function getStereoMetrics(left: Float32Array, right: Float32Array): StereoMetrics {
  assertMatchingStereo(left, right);
  let sumSquares = 0;
  let sum = 0;
  let peak = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index]!;
    const rightValue = right[index]!;
    sumSquares += leftValue * leftValue + rightValue * rightValue;
    sum += leftValue + rightValue;
    peak = Math.max(peak, Math.abs(leftValue), Math.abs(rightValue));
  }

  const sampleCount = left.length + right.length;
  return {
    rms: Math.sqrt(sumSquares / sampleCount),
    peak,
    mean: sum / sampleCount,
  };
}

function toMono(left: Float32Array, right: Float32Array): Float64Array {
  assertMatchingStereo(left, right);
  return Float64Array.from(
    { length: left.length },
    (_, index) => (left[index]! + right[index]!) / 2,
  );
}

function previousPowerOfTwo(value: number): number {
  let size = 1;
  while (size * 2 <= value) size *= 2;
  return size;
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)));
  return sorted[index]!;
}

function dftPower(frame: Float64Array, sampleRate: number, frequencyHz: number): number {
  let real = 0;
  let imaginary = 0;
  const angularStep = (2 * Math.PI * frequencyHz) / sampleRate;

  for (let index = 0; index < frame.length; index += 1) {
    const phase = angularStep * index;
    const value = frame[index]!;
    real += value * Math.cos(phase);
    imaginary -= value * Math.sin(phase);
  }

  return real * real + imaginary * imaginary;
}

function createWindowedFrame(mono: Float64Array, start: number, frameSize: number): Float64Array {
  return Float64Array.from({ length: frameSize }, (_, index) => {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, frameSize - 1));
    return mono[start + index]! * window;
  });
}

function getFrameStarts(sampleCount: number, frameSize: number, maximumFrames: number): number[] {
  if (sampleCount <= frameSize) return [0];
  const available = sampleCount - frameSize;
  const frameCount = Math.min(maximumFrames, Math.floor(available / frameSize) + 1);
  if (frameCount <= 1) return [0];
  return Array.from({ length: frameCount }, (_, index) =>
    Math.round((available * index) / (frameCount - 1)),
  );
}

export function getBandEnergyRatios(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): BandEnergyRatios {
  assertPositiveFinite("sample rate", sampleRate);
  const mono = toMono(left, right);
  const frameSize = previousPowerOfTwo(Math.min(2_048, mono.length));
  const starts = getFrameStarts(mono.length, frameSize, 48);
  const nyquist = sampleRate / 2;
  const binCount = Math.floor(frameSize / 2);
  let total = 0;
  let below150Hz = 0;
  let below250Hz = 0;
  let below400Hz = 0;
  let between400HzAnd3000Hz = 0;
  let between900HzAnd3000Hz = 0;
  let between1200HzAnd10000Hz = 0;
  let between1800HzAnd10000Hz = 0;
  let between2400HzAnd10000Hz = 0;
  let between3000HzAnd10000Hz = 0;

  for (const start of starts) {
    const frame = createWindowedFrame(mono, start, frameSize);
    for (let bin = 1; bin <= binCount; bin += 1) {
      const frequencyHz = (bin * sampleRate) / frameSize;
      if (frequencyHz >= nyquist) break;

      const power = dftPower(frame, sampleRate, frequencyHz);
      total += power;
      if (frequencyHz < 150) below150Hz += power;
      if (frequencyHz < 250) below250Hz += power;
      if (frequencyHz < 400) below400Hz += power;
      if (frequencyHz >= 400 && frequencyHz < 3_000) between400HzAnd3000Hz += power;
      if (frequencyHz >= 900 && frequencyHz < 3_000) between900HzAnd3000Hz += power;
      if (frequencyHz >= 1_200 && frequencyHz < 10_000) between1200HzAnd10000Hz += power;
      if (frequencyHz >= 1_800 && frequencyHz < 10_000) between1800HzAnd10000Hz += power;
      if (frequencyHz >= 2_400 && frequencyHz < 10_000) between2400HzAnd10000Hz += power;
      if (frequencyHz >= 3_000 && frequencyHz < 10_000) between3000HzAnd10000Hz += power;
    }
  }

  const denominator = total > 0 ? total : 1;
  return {
    below150Hz: below150Hz / denominator,
    below250Hz: below250Hz / denominator,
    below400Hz: below400Hz / denominator,
    between400HzAnd3000Hz: between400HzAnd3000Hz / denominator,
    between900HzAnd3000Hz: between900HzAnd3000Hz / denominator,
    between1200HzAnd10000Hz: between1200HzAnd10000Hz / denominator,
    between1800HzAnd10000Hz: between1800HzAnd10000Hz / denominator,
    between2400HzAnd10000Hz: between2400HzAnd10000Hz / denominator,
    between3000HzAnd10000Hz: between3000HzAnd10000Hz / denominator,
  };
}

export function getFrameRmsContinuity(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  windowSeconds: number,
  threshold: number,
): LowRmsContinuity {
  assertMatchingStereo(left, right);
  assertPositiveFinite("sample rate", sampleRate);
  assertPositiveFinite("window seconds", windowSeconds);
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new Error("threshold must be nonnegative and finite");
  }

  const windowSamples = Math.max(1, Math.round(sampleRate * windowSeconds));
  let currentRun = 0;
  let maximumRun = 0;

  for (let start = 0; start < left.length; start += windowSamples) {
    const end = Math.min(left.length, start + windowSamples);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) {
      sumSquares += left[index]! ** 2 + right[index]! ** 2;
    }
    const rms = Math.sqrt(sumSquares / ((end - start) * 2));
    currentRun = rms < threshold ? currentRun + 1 : 0;
    maximumRun = Math.max(maximumRun, currentRun);
  }

  return {
    windowSeconds,
    threshold,
    maximumLowRmsSeconds: maximumRun * windowSeconds,
  };
}

function getFrameRmsEnvelope(mono: Float64Array, sampleRate: number): Float32Array {
  const frameSamples = Math.max(1, Math.round(sampleRate * 0.02));
  const envelope: number[] = [];

  for (let start = 0; start < mono.length; start += frameSamples) {
    const end = Math.min(mono.length, start + frameSamples);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) {
      sumSquares += mono[index]! ** 2;
    }
    envelope.push(Math.sqrt(sumSquares / (end - start)));
  }

  return Float32Array.from(envelope);
}

export function getReferenceLikePulseScore(
  envelope: Float32Array,
  envelopeSampleRate: number,
): number {
  assertPositiveFinite("envelope sample rate", envelopeSampleRate);
  if (envelope.length < 2) return 0;

  const mean = envelope.reduce((sum, value) => sum + value, 0) / envelope.length;
  const centered = Float32Array.from(envelope, (value) => value - mean);
  const energy = centered.reduce((sum, value) => sum + value * value, 0);
  if (energy <= 0) return 0;

  let best = 0;
  const minLag = Math.max(1, Math.round(0.18 * envelopeSampleRate));
  const maxLag = Math.min(centered.length - 1, Math.round(0.26 * envelopeSampleRate));
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let index = 0; index < centered.length - lag; index += 1) {
      sum += centered[index]! * centered[index + lag]!;
    }
    best = Math.max(best, sum / energy);
  }

  return best;
}

export function estimateOnsetSpacing(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): OnsetSpacing {
  assertPositiveFinite("sample rate", sampleRate);
  const mono = toMono(left, right);
  const envelope = getFrameRmsEnvelope(mono, sampleRate);
  const envelopeSampleRate = 50;
  const flux = Array.from({ length: envelope.length }, (_, index) =>
    Math.max(0, envelope[index]! - (envelope[index - 1] ?? envelope[index]!)),
  );
  const threshold = percentile(flux, 0.82);
  const minSpacingFrames = Math.max(1, Math.round(0.16 * envelopeSampleRate));
  const onsetTimes: number[] = [];
  let lastFrame = -minSpacingFrames;

  for (let index = 1; index < flux.length - 1; index += 1) {
    if (
      flux[index]! >= threshold &&
      flux[index]! >= flux[index - 1]! &&
      flux[index]! >= flux[index + 1]! &&
      index - lastFrame >= minSpacingFrames
    ) {
      onsetTimes.push(index / envelopeSampleRate);
      lastFrame = index;
    }
  }

  const intervals = onsetTimes.slice(1).map((time, index) => time - onsetTimes[index]!);
  return {
    onsetCount: onsetTimes.length,
    medianSeconds: percentile(intervals, 0.5),
    p10Seconds: percentile(intervals, 0.1),
    p90Seconds: percentile(intervals, 0.9),
    pulseScore: getReferenceLikePulseScore(envelope, envelopeSampleRate),
  };
}
