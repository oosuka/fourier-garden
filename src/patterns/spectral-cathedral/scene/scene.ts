import type { WebGLRenderer, WebGLRendererParameters } from "three";
import * as THREE from "three/webgpu";

import { selectRendererBackend, type RendererBackend } from "../../../core/rendererBackend";
import {
  SPECTRAL_CATHEDRAL_DEFINITION,
  SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT,
  SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT,
} from "../math/model";
import {
  createSpectralCathedralDrawingModel,
  updateSpectralCathedralDrawingModel,
  type SpectralCathedralDrawingModel,
} from "./drawing";
import { evaluateSpectralCathedralDramaturgy } from "./dramaturgy";
import {
  SPECTRAL_CATHEDRAL_CANONICAL_LIGHT_ANCHOR_COUNT,
  createSpectralCathedralPoeticModel,
  getSpectralCathedralPoeticQuality,
} from "./poetic";
import {
  SpectralCathedralPoeticLayer,
  type SpectralCathedralPoeticLayerStats,
} from "./poeticLayer";
import type { QualityLevel, Viewport } from "../../types";

const CAMERA_FOV_DEGREES = 38;
const MATHEMATICAL_BOUND_RADIUS = Math.hypot(1, 1 / Math.sqrt(2), 0.6);
const CAMERA_FIT_RADIUS = MATHEMATICAL_BOUND_RADIUS * 1.12;
const CAMERA_DIRECTION = new THREE.Vector3(1.9, -2.7, 1.8).normalize();
const BOUNDARY_HALF_HEIGHT =
  SPECTRAL_CATHEDRAL_DEFINITION.height / SPECTRAL_CATHEDRAL_DEFINITION.width;

type SceneRenderer = THREE.WebGPURenderer | WebGLRenderer;

export const SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS = Object.freeze({
  vertices: SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT,
  triangles: SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT,
  boundarySegments: 4,
  modes: SPECTRAL_CATHEDRAL_DEFINITION.modes.length,
});

export interface SpectralCathedralCameraPlacement {
  fovDegrees: number;
  near: number;
  far: number;
  distance: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

export interface SpectralCathedralSceneStats {
  backend: RendererBackend;
  vertices: number;
  triangles: number;
  nodalSegments: number;
  poetic: SpectralCathedralPoeticLayerStats | null;
}

export interface SpectralCathedralSceneOptions {
  canvas: HTMLCanvasElement;
  seed?: number;
  poeticLayers?: boolean;
  onDeviceLost?: () => void;
  preserveDrawingBuffer?: boolean;
}

export interface SpectralCathedralScene {
  readonly backend: RendererBackend;
  update(absoluteTimeSeconds: number): void;
  resize(viewport: Viewport): void;
  setQuality(level: QualityLevel): void;
  getStats(): SpectralCathedralSceneStats;
  dispose(): void;
}

export function getSpectralCathedralStrictQuality(_level: QualityLevel) {
  return SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS;
}

export function getSpectralCathedralSceneLayerCounts(
  level: QualityLevel,
  backend: RendererBackend,
  poeticLayers: boolean,
): Readonly<{
  strict: typeof SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS;
  poetic: SpectralCathedralPoeticLayerStats | null;
}> {
  if (!poeticLayers) {
    return {
      strict: SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS,
      poetic: null,
    };
  }
  const quality = getSpectralCathedralPoeticQuality(level, backend);
  return {
    strict: SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS,
    poetic: {
      anchors: SPECTRAL_CATHEDRAL_CANONICAL_LIGHT_ANCHOR_COUNT,
      arches: SPECTRAL_CATHEDRAL_CANONICAL_LIGHT_ANCHOR_COUNT - 1,
      particles: quality.particleCount,
      volumetricHalos: quality.volumetricHaloCount,
      archTrailLayers: quality.archTrailLayers,
    },
  };
}

export function getSpectralCathedralWebGLRendererParameters({
  canvas,
  preserveDrawingBuffer = false,
}: Pick<
  SpectralCathedralSceneOptions,
  "canvas" | "preserveDrawingBuffer"
>): WebGLRendererParameters {
  return {
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer,
  };
}

export function getSpectralCathedralCameraPlacement(
  aspect: number,
): SpectralCathedralCameraPlacement {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new Error("Spectral Cathedral camera aspect must be a positive finite number");
  }

  const verticalHalfFov = THREE.MathUtils.degToRad(CAMERA_FOV_DEGREES * 0.5);
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
  const distance = CAMERA_FIT_RADIUS / Math.sin(limitingHalfFov);
  const near = Math.max(0.05, distance - CAMERA_FIT_RADIUS * 2.2);
  const far = distance + CAMERA_FIT_RADIUS * 3;

  return {
    fovDegrees: CAMERA_FOV_DEGREES,
    near,
    far,
    distance,
    positionX: CAMERA_DIRECTION.x * distance,
    positionY: CAMERA_DIRECTION.y * distance,
    positionZ: CAMERA_DIRECTION.z * distance,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
  };
}

export function getSpectralCathedralChoreographedCameraPlacement(
  base: SpectralCathedralCameraPlacement,
  absoluteTimeSeconds: number,
): SpectralCathedralCameraPlacement {
  const choreography = evaluateSpectralCathedralDramaturgy(absoluteTimeSeconds).camera;
  const radiusX = base.positionX - base.targetX;
  const radiusY = base.positionY - base.targetY;
  const radiusZ = base.positionZ - base.targetZ;
  const cosine = Math.cos(choreography.orbitRadians);
  const sine = Math.sin(choreography.orbitRadians);

  return {
    ...base,
    distance: base.distance * choreography.dollyRatio,
    positionX: base.targetX + (radiusX * cosine - radiusZ * sine) * choreography.dollyRatio,
    positionY: base.targetY + radiusY * choreography.dollyRatio,
    positionZ: base.targetZ + (radiusX * sine + radiusZ * cosine) * choreography.dollyRatio,
    targetX: base.targetX + choreography.targetX,
    targetY: base.targetY + choreography.targetY,
  };
}

function createSurface(model: SpectralCathedralDrawingModel): {
  mesh: THREE.Mesh;
  positionAttribute: THREE.BufferAttribute;
  colorAttribute: THREE.BufferAttribute;
} {
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(model.positions, 3);
  const colorAttribute = new THREE.BufferAttribute(model.colors, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  colorAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", colorAttribute);
  geometry.setIndex(new THREE.BufferAttribute(model.indices, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), MATHEMATICAL_BOUND_RADIUS);

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return { mesh, positionAttribute, colorAttribute };
}

function createBoundary(): THREE.Line {
  const positions = new Float32Array([
    -1,
    -BOUNDARY_HALF_HEIGHT,
    0,
    1,
    -BOUNDARY_HALF_HEIGHT,
    0,
    1,
    BOUNDARY_HALF_HEIGHT,
    0,
    -1,
    BOUNDARY_HALF_HEIGHT,
    0,
    -1,
    -BOUNDARY_HALF_HEIGHT,
    0,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xb8d1d8,
    toneMapped: false,
  });
  const boundary = new THREE.Line(geometry, material);
  boundary.renderOrder = 2;
  return boundary;
}

function createNodalLines(model: SpectralCathedralDrawingModel): {
  lines: THREE.LineSegments;
  positionAttribute: THREE.BufferAttribute;
} {
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(model.nodalPositions, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setDrawRange(0, model.nodalSegmentCount * 2);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), MATHEMATICAL_BOUND_RADIUS);
  const material = new THREE.LineBasicMaterial({
    color: 0x9c7a3b,
    toneMapped: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = 3;
  return { lines, positionAttribute };
}

class SpectralCathedralStrictScene implements SpectralCathedralScene {
  readonly backend: RendererBackend;

  private readonly renderer: SceneRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEGREES, 1, 0.1, 20);
  private readonly drawingModel = createSpectralCathedralDrawingModel();
  private readonly surface = createSurface(this.drawingModel);
  private readonly nodalLines = createNodalLines(this.drawingModel);
  private readonly boundary = createBoundary();
  private readonly poeticLayer: SpectralCathedralPoeticLayer | null;
  private cameraBasePlacement: SpectralCathedralCameraPlacement | null = null;
  private disposed = false;

  constructor(
    renderer: SceneRenderer,
    backend: RendererBackend,
    seed: number,
    poeticLayers: boolean,
  ) {
    this.renderer = renderer;
    this.backend = backend;
    this.scene.background = new THREE.Color(0x010308);
    this.poeticLayer = poeticLayers
      ? new SpectralCathedralPoeticLayer(createSpectralCathedralPoeticModel(seed), backend)
      : null;
    if (this.poeticLayer) this.scene.add(this.poeticLayer.group);
    this.scene.add(this.surface.mesh, this.nodalLines.lines, this.boundary);
  }

  update(absoluteTimeSeconds: number): void {
    if (this.disposed) {
      throw new Error("Spectral Cathedral scene has been disposed");
    }
    updateSpectralCathedralDrawingModel(this.drawingModel, absoluteTimeSeconds);
    this.surface.positionAttribute.needsUpdate = true;
    this.surface.colorAttribute.needsUpdate = true;
    this.nodalLines.positionAttribute.needsUpdate = true;
    this.nodalLines.lines.geometry.setDrawRange(0, this.drawingModel.nodalSegmentCount * 2);
    this.poeticLayer?.update(absoluteTimeSeconds);
    if (this.cameraBasePlacement) {
      const placement = getSpectralCathedralChoreographedCameraPlacement(
        this.cameraBasePlacement,
        absoluteTimeSeconds,
      );
      this.camera.position.set(placement.positionX, placement.positionY, placement.positionZ);
      this.camera.lookAt(placement.targetX, placement.targetY, placement.targetZ);
    }
    this.renderer.render(this.scene, this.camera);
  }

  resize(viewport: Viewport): void {
    if (
      !Number.isFinite(viewport.width) ||
      !Number.isFinite(viewport.height) ||
      !Number.isFinite(viewport.pixelRatio) ||
      viewport.width <= 0 ||
      viewport.height <= 0 ||
      viewport.pixelRatio <= 0
    ) {
      throw new Error("Spectral Cathedral viewport values must be positive and finite");
    }

    const aspect = viewport.width / viewport.height;
    const placement = getSpectralCathedralCameraPlacement(aspect);
    this.cameraBasePlacement = placement;
    this.camera.aspect = aspect;
    this.camera.fov = placement.fovDegrees;
    this.camera.near = placement.near;
    this.camera.far = placement.far;
    this.camera.position.set(placement.positionX, placement.positionY, placement.positionZ);
    this.camera.lookAt(placement.targetX, placement.targetY, placement.targetZ);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(viewport.pixelRatio);
    this.renderer.setSize(viewport.width, viewport.height, false);
  }

  setQuality(level: QualityLevel): void {
    getSpectralCathedralStrictQuality(level);
    this.poeticLayer?.setQuality(level);
  }

  getStats(): SpectralCathedralSceneStats {
    return {
      backend: this.backend,
      vertices: this.drawingModel.vertexCount,
      triangles: this.drawingModel.triangleCount,
      nodalSegments: this.drawingModel.nodalSegmentCount,
      poetic: this.poeticLayer?.getStats() ?? null,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.surface.mesh.geometry.dispose();
    (this.surface.mesh.material as THREE.Material).dispose();
    this.nodalLines.lines.geometry.dispose();
    (this.nodalLines.lines.material as THREE.Material).dispose();
    this.boundary.geometry.dispose();
    (this.boundary.material as THREE.Material).dispose();
    this.poeticLayer?.dispose();
    this.renderer.dispose();
  }
}

export async function createSpectralCathedralScene({
  canvas,
  seed = 0,
  poeticLayers = true,
  onDeviceLost,
  preserveDrawingBuffer,
}: SpectralCathedralSceneOptions): Promise<SpectralCathedralScene> {
  const forceWebGL = new URLSearchParams(window.location.search).get("renderer") === "webgl";
  const backend = selectRendererBackend(forceWebGL, "gpu" in navigator);

  if (backend === "webgl") {
    const { WebGLRenderer } = await import("three");
    const renderer = new WebGLRenderer(
      getSpectralCathedralWebGLRendererParameters({
        canvas,
        preserveDrawingBuffer,
      }),
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    return new SpectralCathedralStrictScene(renderer, backend, seed, poeticLayers);
  }

  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  const reportDeviceLost = renderer.onDeviceLost.bind(renderer);
  renderer.onDeviceLost = (info) => {
    reportDeviceLost(info);
    onDeviceLost?.();
  };
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  await renderer.init();
  return new SpectralCathedralStrictScene(renderer, backend, seed, poeticLayers);
}
