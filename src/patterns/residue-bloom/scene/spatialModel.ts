import { RESIDUE_BLOOM_SERIES } from "../math/model";

const AMPLITUDE_BOUND = RESIDUE_BLOOM_SERIES.terms.reduce(
  (sum, term) => sum + Math.abs(term.amplitude),
  0,
);

export function getResidueBloomSceneLayout(aspect: number) {
  if (!Number.isFinite(aspect) || aspect <= 0)
    throw new Error("Residue Bloom aspect must be positive and finite");
  const halfWidth = 10 * aspect;
  return {
    centerX: -halfWidth * 0.4,
    centerY: 0.12,
    scale: Math.min(halfWidth * 0.53, 7.6) / AMPLITUDE_BOUND,
    waveStart: halfWidth * 0.16,
    waveEnd: halfWidth * 0.94,
  };
}

export function writeResidueBloomFlowPositions(
  positions: Float32Array,
  seeds: Float32Array,
  count: number,
  time: number,
  energy: number,
  endpointX: number,
  endpointY: number,
  reducedMotion = false,
): void {
  const driftTime = reducedMotion ? 0 : time;
  const excitationPhase = reducedMotion ? 0 : energy * 0.002;
  const anchorX = reducedMotion ? 0 : endpointX * 0.14;
  const anchorY = reducedMotion ? 0 : endpointY * 0.1;
  for (let index = 0; index < count; index++) {
    const progress = (seeds[index * 4]! + driftTime * 0.0038 + excitationPhase) % 1;
    const spread = seeds[index * 4 + 1]!;
    const depth = seeds[index * 4 + 2]!;
    const phase = seeds[index * 4 + 3]!;
    const theta = progress * Math.PI * 2 + phase * 0.12;
    const radius = 3.2 + depth * 6.8 + Math.sin(theta * 4) * 0.55;
    positions[index * 3] =
      anchorX + Math.cos(theta) * radius + spread * 0.7 * Math.sin(theta * 3 + driftTime * 0.1);
    positions[index * 3 + 1] = anchorY + Math.sin(theta) * radius * 0.56 + spread * 1.35;
    positions[index * 3 + 2] = -0.35 - depth * 2.8;
  }
}
