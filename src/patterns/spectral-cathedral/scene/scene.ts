import type { WebGLRenderer, WebGLRendererParameters } from "three";
import * as THREE from "three/webgpu";

import { selectRendererBackend, type RendererBackend } from "../../../core/rendererBackend";
import { CinematicEnvironmentLayer } from "../../../rendering/cinematic/environmentLayer";
import { getCinematicEnvironmentParticleCount } from "../../../rendering/cinematic/model";
import {
  createCinematicPostProcessor,
  type CinematicPostMode,
  type CinematicPostProcessor,
} from "../../../rendering/cinematic/postProcessing";
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
import {
  CATHEDRAL_ARCH_FILAMENTS,
  CATHEDRAL_GRAND_VAULT_RIBS,
  CATHEDRAL_VAULT_REPEATS,
} from "./architecture";
import { evaluateSpectralCathedralDramaturgy } from "./dramaturgy";
import {
  SPECTRAL_CATHEDRAL_CANONICAL_LIGHT_ANCHOR_COUNT,
  createSpectralCathedralPoeticModel,
  getSpectralCathedralPoeticQuality,
} from "./poetic";
import {
  getSpectralCathedralArchitectureLayerCounts,
  SpectralCathedralPoeticLayer,
  type SpectralCathedralPoeticLayerStats,
} from "./poeticLayer";
import type { SpectralCathedralVisualFrame } from "./visualResponse";
import type { QualityLevel, Viewport } from "../../contracts";

const CAMERA_FOV_DEGREES = 38;
const MATHEMATICAL_BOUND_RADIUS = Math.hypot(1, 1 / Math.sqrt(2), 0.6);
const CAMERA_FIT_RADIUS = MATHEMATICAL_BOUND_RADIUS * 1.16;
const CAMERA_DIRECTION = new THREE.Vector3(1.9, -2.7, 1.8).normalize();
const CAMERA_TARGET_Z = 0.42;
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
  postMode: CinematicPostMode;
  vertices: number;
  triangles: number;
  nodalSegments: number;
  poetic: SpectralCathedralScenePoeticStats | null;
}

export interface SpectralCathedralScenePoeticStats extends SpectralCathedralPoeticLayerStats {
  environmentParticles: number;
  totalParticles: number;
}

export interface SpectralCathedralSceneReaction {
  environmentEnergy: number;
  warmth: number;
  bloomEnergy: number;
  cameraDollyScale: number;
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
  poetic: SpectralCathedralScenePoeticStats | null;
}> {
  if (!poeticLayers) {
    return {
      strict: SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS,
      poetic: null,
    };
  }
  const quality = getSpectralCathedralPoeticQuality(level, backend);
  const architecture = getSpectralCathedralArchitectureLayerCounts(level);
  const archCount = SPECTRAL_CATHEDRAL_CANONICAL_LIGHT_ANCHOR_COUNT - 1;
  const environmentParticles = getCinematicEnvironmentParticleCount(
    "spectral-cathedral",
    level,
    quality.particleCount,
  );
  return {
    strict: SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS,
    poetic: {
      anchors: SPECTRAL_CATHEDRAL_CANONICAL_LIGHT_ANCHOR_COUNT,
      arches: archCount,
      pillarShells: SPECTRAL_CATHEDRAL_CANONICAL_LIGHT_ANCHOR_COUNT,
      archFilaments: archCount * CATHEDRAL_ARCH_FILAMENTS,
      visibleArchFilaments: archCount * architecture.filamentsPerArch,
      vaultRepeats: archCount * CATHEDRAL_VAULT_REPEATS,
      visibleVaultRepeats: archCount * architecture.vaultsPerArch,
      archMembranes: archCount,
      grandVaultRibs: CATHEDRAL_GRAND_VAULT_RIBS,
      visibleGrandVaultRibs: architecture.grandVaults,
      particles: quality.particleCount,
      environmentParticles,
      totalParticles: quality.particleCount + environmentParticles,
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
    positionZ: CAMERA_TARGET_Z + CAMERA_DIRECTION.z * distance,
    targetX: 0,
    targetY: 0,
    targetZ: CAMERA_TARGET_Z,
  };
}

export function orientSpectralCathedralCamera(camera: THREE.PerspectiveCamera): void {
  camera.up.set(0, 0, 1);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function getSpectralCathedralSceneReaction(
  frame: SpectralCathedralVisualFrame,
): SpectralCathedralSceneReaction {
  const sectionWarmth = frame.dramaturgy.sectionId === "afterglow" ? 0.8 : 0;
  return {
    environmentEnergy: clamp01(
      frame.dramaturgy.visualEnergy * 0.68 +
        frame.collectiveEnergy * 0.22 +
        frame.onsetEnergy * 0.18,
    ),
    warmth: clamp01(
      Math.max(sectionWarmth, frame.dramaturgy.audioEnergy * 0.38) +
        frame.collectiveEnergy * 0.24 +
        frame.onsetEnergy * 0.12,
    ),
    bloomEnergy: clamp01(
      frame.dramaturgy.visualEnergy * 0.7 +
        frame.collectiveEnergy * 0.22 +
        frame.onsetEnergy * 0.26,
    ),
    cameraDollyScale: Math.min(
      1.006,
      Math.max(0.992, 1 + frame.collectiveEnergy * 0.004 - frame.onsetEnergy * 0.012),
    ),
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
    color: new THREE.Color(0.22, 0.46, 1),
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
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
    color: 0xd7f9ff,
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
    color: 0xffc875,
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
  private readonly environmentLayer: CinematicEnvironmentLayer | null;
  private postProcessor: CinematicPostProcessor | null = null;
  private cameraBasePlacement: SpectralCathedralCameraPlacement | null = null;
  private quality: QualityLevel = "high";
  private disposed = false;

  constructor(
    renderer: SceneRenderer,
    backend: RendererBackend,
    seed: number,
    poeticLayers: boolean,
  ) {
    this.renderer = renderer;
    this.backend = backend;
    orientSpectralCathedralCamera(this.camera);
    this.scene.background = new THREE.Color(0x01030a);
    this.environmentLayer = poeticLayers
      ? new CinematicEnvironmentLayer({
          backend,
          chapter: "spectral-cathedral",
          seed,
          maximumParticleCount: getCinematicEnvironmentParticleCount(
            "spectral-cathedral",
            "ultra",
            getSpectralCathedralPoeticQuality("ultra", backend).particleCount,
          ),
          palette: [0x62eaff, 0xb678ff, 0xffb56e],
          extent: { x: 24, y: 16, z: 24 },
        })
      : null;
    this.poeticLayer = poeticLayers
      ? new SpectralCathedralPoeticLayer(createSpectralCathedralPoeticModel(seed), backend)
      : null;
    this.poeticLayer?.group.scale.set(1.52, 1.52, 2.08);
    if (this.poeticLayer) this.poeticLayer.group.position.z = -0.08;
    if (this.environmentLayer) this.scene.add(this.environmentLayer.group);
    if (this.poeticLayer) this.scene.add(this.poeticLayer.group);
    this.scene.add(this.surface.mesh, this.nodalLines.lines, this.boundary);
  }

  async initializePostProcessor(): Promise<void> {
    this.postProcessor = await createCinematicPostProcessor({
      renderer: this.renderer,
      backend: this.backend,
      scene: this.scene,
      camera: this.camera,
      exposure: 1.1,
    });
    this.postProcessor.setQuality(this.quality);
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
    const visualFrame = this.poeticLayer?.update(absoluteTimeSeconds) ?? null;
    const dramaturgy =
      visualFrame?.dramaturgy ?? evaluateSpectralCathedralDramaturgy(absoluteTimeSeconds);
    const reaction = visualFrame ? getSpectralCathedralSceneReaction(visualFrame) : null;
    if (this.cameraBasePlacement) {
      const placement = getSpectralCathedralChoreographedCameraPlacement(
        this.cameraBasePlacement,
        absoluteTimeSeconds,
      );
      const cameraDollyScale = reaction?.cameraDollyScale ?? 1;
      this.camera.position.set(
        placement.targetX + (placement.positionX - placement.targetX) * cameraDollyScale,
        placement.targetY + (placement.positionY - placement.targetY) * cameraDollyScale,
        placement.targetZ + (placement.positionZ - placement.targetZ) * cameraDollyScale,
      );
      this.camera.lookAt(placement.targetX, placement.targetY, placement.targetZ);
    }
    this.environmentLayer?.update(
      absoluteTimeSeconds,
      reaction?.environmentEnergy ?? dramaturgy.visualEnergy,
      reaction?.warmth ??
        (dramaturgy.sectionId === "afterglow" ? 0.8 : dramaturgy.audioEnergy * 0.5),
      this.camera,
    );
    this.postProcessor?.setEnergy(reaction?.bloomEnergy ?? dramaturgy.visualEnergy);
    if (this.postProcessor) this.postProcessor.render();
    else this.renderer.render(this.scene, this.camera);
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
    this.environmentLayer?.resize(aspect);
    if (this.postProcessor) {
      this.postProcessor.resize(viewport.width, viewport.height, viewport.pixelRatio);
    } else {
      this.renderer.setPixelRatio(viewport.pixelRatio);
      this.renderer.setSize(viewport.width, viewport.height, false);
    }
  }

  setQuality(level: QualityLevel): void {
    getSpectralCathedralStrictQuality(level);
    this.quality = level;
    this.poeticLayer?.setQuality(level);
    const localParticles = getSpectralCathedralPoeticQuality(level, this.backend).particleCount;
    this.environmentLayer?.setParticleCount(
      getCinematicEnvironmentParticleCount("spectral-cathedral", level, localParticles),
    );
    this.postProcessor?.setQuality(level);
  }

  getStats(): SpectralCathedralSceneStats {
    return {
      backend: this.backend,
      postMode: this.postProcessor?.mode ?? "direct",
      vertices: this.drawingModel.vertexCount,
      triangles: this.drawingModel.triangleCount,
      nodalSegments: this.drawingModel.nodalSegmentCount,
      poetic:
        this.poeticLayer && this.environmentLayer
          ? {
              ...this.poeticLayer.getStats(),
              environmentParticles: this.environmentLayer.getStats().particles,
              totalParticles:
                this.poeticLayer.getStats().particles + this.environmentLayer.getStats().particles,
            }
          : null,
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
    this.environmentLayer?.dispose();
    this.postProcessor?.dispose();
    this.postProcessor = null;
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
    const scene = new SpectralCathedralStrictScene(renderer, backend, seed, poeticLayers);
    await scene.initializePostProcessor();
    return scene;
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
  await renderer.init();
  const scene = new SpectralCathedralStrictScene(renderer, backend, seed, poeticLayers);
  await scene.initializePostProcessor();
  return scene;
}
