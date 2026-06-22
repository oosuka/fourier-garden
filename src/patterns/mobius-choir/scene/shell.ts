export interface MobiusChoirShellModel {
  readonly normals: Float32Array;
  readonly outer: Float32Array;
  readonly inner: Float32Array;
}

function validateInputs(strictPositions: Float32Array, indices: Uint32Array, offset: number): void {
  if (strictPositions.length < 9 || strictPositions.length % 3 !== 0) {
    throw new Error("Möbius Choir shell positions must contain complete vertices");
  }
  if (indices.length < 3 || indices.length % 3 !== 0) {
    throw new Error("Möbius Choir shell indices must contain complete triangles");
  }
  if (!strictPositions.every(Number.isFinite)) {
    throw new Error("Möbius Choir shell positions must be finite");
  }
  if (!Number.isFinite(offset) || offset <= 0) {
    throw new Error("Möbius Choir shell offset must be positive and finite");
  }
  const vertexCount = strictPositions.length / 3;
  for (const index of indices) {
    if (index >= vertexCount) throw new Error("Möbius Choir shell index is out of range");
  }
}

function accumulateTriangleNormal(
  positions: Float32Array,
  normals: Float64Array,
  firstIndex: number,
  secondIndex: number,
  thirdIndex: number,
): void {
  const first = firstIndex * 3;
  const second = secondIndex * 3;
  const third = thirdIndex * 3;
  const firstEdgeX = positions[second]! - positions[first]!;
  const firstEdgeY = positions[second + 1]! - positions[first + 1]!;
  const firstEdgeZ = positions[second + 2]! - positions[first + 2]!;
  const secondEdgeX = positions[third]! - positions[first]!;
  const secondEdgeY = positions[third + 1]! - positions[first + 1]!;
  const secondEdgeZ = positions[third + 2]! - positions[first + 2]!;
  const normalX = firstEdgeY * secondEdgeZ - firstEdgeZ * secondEdgeY;
  const normalY = firstEdgeZ * secondEdgeX - firstEdgeX * secondEdgeZ;
  const normalZ = firstEdgeX * secondEdgeY - firstEdgeY * secondEdgeX;
  for (const vertexIndex of [firstIndex, secondIndex, thirdIndex]) {
    const target = vertexIndex * 3;
    normals[target] += normalX;
    normals[target + 1] += normalY;
    normals[target + 2] += normalZ;
  }
}

export function createMobiusChoirShellModel(
  strictPositions: Float32Array,
  indices: Uint32Array,
  offset: number,
): MobiusChoirShellModel {
  validateInputs(strictPositions, indices, offset);
  const accumulatedNormals = new Float64Array(strictPositions.length);
  for (let index = 0; index < indices.length; index += 3) {
    accumulateTriangleNormal(
      strictPositions,
      accumulatedNormals,
      indices[index]!,
      indices[index + 1]!,
      indices[index + 2]!,
    );
  }

  const normals = new Float32Array(strictPositions.length);
  const outer = new Float32Array(strictPositions.length);
  const inner = new Float32Array(strictPositions.length);
  for (let index = 0; index < strictPositions.length; index += 3) {
    let normalX = accumulatedNormals[index]!;
    let normalY = accumulatedNormals[index + 1]!;
    let normalZ = accumulatedNormals[index + 2]!;
    let length = Math.hypot(normalX, normalY, normalZ);
    if (length < 1e-8) {
      normalX = strictPositions[index]!;
      normalY = strictPositions[index + 1]!;
      normalZ = strictPositions[index + 2]!;
      length = Math.max(1e-8, Math.hypot(normalX, normalY, normalZ));
    }
    normalX /= length;
    normalY /= length;
    normalZ /= length;
    normals[index] = normalX;
    normals[index + 1] = normalY;
    normals[index + 2] = normalZ;
    outer[index] = strictPositions[index]! + normalX * offset;
    outer[index + 1] = strictPositions[index + 1]! + normalY * offset;
    outer[index + 2] = strictPositions[index + 2]! + normalZ * offset;
    inner[index] = strictPositions[index]! - normalX * offset;
    inner[index + 1] = strictPositions[index + 1]! - normalY * offset;
    inner[index + 2] = strictPositions[index + 2]! - normalZ * offset;
  }
  return { normals, outer, inner };
}
