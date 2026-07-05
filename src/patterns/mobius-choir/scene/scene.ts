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
  MOBIUS_CHOIR_DEFINITION,
  MOBIUS_CHOIR_GRID_TRIANGLE_COUNT,
  MOBIUS_CHOIR_GRID_VERTEX_COUNT,
  mapMobiusChoirEmbedding,
} from "../math/model";
import {
  MOBIUS_CHOIR_PARAMETER_GRID_SEGMENT_COUNT,
  createMobiusChoirDrawingModel,
  updateMobiusChoirDrawingModel,
  type MobiusChoirDrawingModel,
} from "./drawing";
import { evaluateMobiusChoirDramaturgy } from "./dramaturgy";
import { createMobiusChoirPoeticModel, getMobiusChoirPoeticQuality } from "./poetic";
import { MobiusChoirPoeticLayer, type MobiusChoirPoeticLayerStats } from "./poeticLayer";
import type { MobiusChoirVisualFrame } from "./visualResponse";
import type { QualityLevel, Viewport } from "../../contracts";

const CAMERA_FOV_DEGREES = 36;
const MATHEMATICAL_BOUND_RADIUS = 4.35;
const CAMERA_FIT_RADIUS = MATHEMATICAL_BOUND_RADIUS * 1.08;
const CAMERA_DIRECTION = new THREE.Vector3(0.94, -1.38, 0.78).normalize();
const SEAM_POINT_COUNT = 48;

type SceneRenderer = THREE.WebGPURenderer | WebGLRenderer;

export const MOBIUS_CHOIR_STRICT_LAYER_COUNTS = Object.freeze({
  vertices: MOBIUS_CHOIR_GRID_VERTEX_COUNT,
  triangles: MOBIUS_CHOIR_GRID_TRIANGLE_COUNT,
  boundaryComponents: 1,
  parameterGridSegments: MOBIUS_CHOIR_PARAMETER_GRID_SEGMENT_COUNT,
  seamSegments: SEAM_POINT_COUNT - 1,
  modes: MOBIUS_CHOIR_DEFINITION.modes.length,
});

export interface MobiusChoirCameraPlacement {
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

export interface MobiusChoirSceneStats {
  backend: RendererBackend;
  postMode: CinematicPostMode;
  vertices: number;
  triangles: number;
  nodalSegments: number;
  boundaryComponents: number;
  seamSegments: number;
  parameterGridSegments: number;
  poetic: MobiusChoirScenePoeticStats | null;
}

export interface MobiusChoirScenePoeticStats extends MobiusChoirPoeticLayerStats {
  environmentParticles: number;
  totalParticles: number;
}

export interface MobiusChoirSceneReaction {
  environmentEnergy: number;
  warmth: number;
  bloomEnergy: number;
  cameraDollyScale: number;
}

export interface MobiusChoirSceneOptions {
  canvas: HTMLCanvasElement;
  seed?: number;
  poeticLayers?: boolean;
  onDeviceLost?: () => void;
  preserveDrawingBuffer?: boolean;
}

export interface MobiusChoirScene {
  readonly backend: RendererBackend;
  update(absoluteTimeSeconds: number): void;
  resize(viewport: Viewport): void;
  setQuality(level: QualityLevel): void;
  getStats(): MobiusChoirSceneStats;
  dispose(): void;
}

export function getMobiusChoirStrictQuality(_level: QualityLevel) {
  return MOBIUS_CHOIR_STRICT_LAYER_COUNTS;
}

export function getMobiusChoirNodalVisibility(segmentCount: number): boolean {
  if (!Number.isInteger(segmentCount) || segmentCount < 0) {
    throw new Error("Möbius Choir nodal segment count must be a nonnegative integer");
  }
  return segmentCount > 0;
}

export function getMobiusChoirSceneLayerCounts(
  level: QualityLevel,
  _backend: RendererBackend,
  poeticLayers: boolean,
): Readonly<{
  strict: typeof MOBIUS_CHOIR_STRICT_LAYER_COUNTS;
  poetic: MobiusChoirScenePoeticStats | null;
}> {
  const quality = getMobiusChoirPoeticQuality(level);
  const environmentParticles = getCinematicEnvironmentParticleCount(
    "mobius-choir",
    level,
    quality.particleCount,
  );
  return {
    strict: MOBIUS_CHOIR_STRICT_LAYER_COUNTS,
    poetic: poeticLayers
      ? {
          particles: quality.particleCount,
          surfaceParticles: quality.surfaceParticleCount,
          atmosphereParticles: quality.atmosphereParticleCount,
          panoramaParticles: quality.panoramaParticleCount,
          ribbons: quality.ribbonCount,
          trailLayers: quality.trailLayers,
          halos: quality.haloCount,
          atmosphereLayers: 1,
          shellLayers: level === "low" ? 1 : 2,
          environmentParticles,
          totalParticles: quality.particleCount + environmentParticles,
        }
      : null,
  };
}

export function getMobiusChoirWebGLRendererParameters({
  canvas,
  preserveDrawingBuffer = false,
}: Pick<MobiusChoirSceneOptions, "canvas" | "preserveDrawingBuffer">): WebGLRendererParameters {
  return {
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer,
  };
}

export function getMobiusChoirCameraPlacement(aspect: number): MobiusChoirCameraPlacement {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new Error("Möbius Choir camera aspect must be a positive finite number");
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function getMobiusChoirSceneReaction(
  frame: MobiusChoirVisualFrame,
): MobiusChoirSceneReaction {
  const confluenceWarmth = frame.dramaturgy.sectionId === "confluence" ? 0.8 : 0;
  const pulseEnergy = Math.max(...frame.modes.map((mode) => mode.pulseEnergy));
  return {
    environmentEnergy: clamp01(
      frame.dramaturgy.visualEnergy * 0.56 +
        frame.collectiveEnergy * 0.28 +
        frame.onsetEnergy * 0.26 +
        frame.seamEnergy * 0.1 +
        pulseEnergy * 0.14,
    ),
    warmth: clamp01(
      Math.max(confluenceWarmth, frame.dramaturgy.audioEnergy * 0.34) +
        frame.collectiveEnergy * 0.18 +
        frame.seamEnergy * 0.22 +
        pulseEnergy * 0.1,
    ),
    bloomEnergy: clamp01(
      frame.dramaturgy.visualEnergy * 0.56 +
        frame.collectiveEnergy * 0.24 +
        frame.onsetEnergy * 0.32 +
        frame.seamEnergy * 0.14 +
        pulseEnergy * 0.2,
    ),
    cameraDollyScale: Math.min(
      1.008,
      Math.max(
        0.982,
        1 + frame.seamEnergy * 0.003 - frame.onsetEnergy * 0.01 - pulseEnergy * 0.028,
      ),
    ),
  };
}

export function getMobiusChoirChoreographedCameraPlacement(
  base: MobiusChoirCameraPlacement,
  absoluteTimeSeconds: number,
): MobiusChoirCameraPlacement {
  const choreography = evaluateMobiusChoirDramaturgy(absoluteTimeSeconds).camera;
  const cosine = Math.cos(choreography.orbitRadians);
  const sine = Math.sin(choreography.orbitRadians);
  return {
    ...base,
    distance: base.distance * choreography.dollyRatio,
    positionX: (base.positionX * cosine - base.positionZ * sine) * choreography.dollyRatio,
    positionY: base.positionY * choreography.dollyRatio,
    positionZ: (base.positionX * sine + base.positionZ * cosine) * choreography.dollyRatio,
    targetX: choreography.targetX * MATHEMATICAL_BOUND_RADIUS,
    targetY: choreography.targetY * MATHEMATICAL_BOUND_RADIUS,
  };
}

function createSurface(model: MobiusChoirDrawingModel): {
  mesh: THREE.Mesh;
  colorAttribute: THREE.BufferAttribute;
} {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(model.positions, 3));
  const colorAttribute = new THREE.BufferAttribute(model.colors, 3);
  colorAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("color", colorAttribute);
  geometry.setIndex(new THREE.BufferAttribute(model.indices, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), MATHEMATICAL_BOUND_RADIUS);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.58, 0.72, 1),
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return { mesh, colorAttribute };
}

function createLine(
  positions: Float32Array,
  color: number,
  opacity: number,
  renderOrder: number,
): THREE.Line {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent: opacity < 1,
    toneMapped: false,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  line.renderOrder = renderOrder;
  return line;
}

function createLineSegments(
  positions: Float32Array,
  color: number,
  opacity: number,
  renderOrder: number,
): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent: true,
    toneMapped: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = renderOrder;
  return lines;
}

function createSeam(): THREE.Line {
  const positions = new Float32Array(SEAM_POINT_COUNT * 3);
  for (let index = 0; index < SEAM_POINT_COUNT; index += 1) {
    const point = mapMobiusChoirEmbedding((Math.PI * index) / (SEAM_POINT_COUNT - 1), 0);
    positions[index * 3] = point.x;
    positions[index * 3 + 1] = point.y;
    positions[index * 3 + 2] = point.z;
  }
  return createLine(positions, 0x78d9eb, 0.72, 3);
}

function createNodalLines(model: MobiusChoirDrawingModel): {
  lines: THREE.LineSegments;
  attribute: THREE.BufferAttribute;
} {
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(model.nodalPositions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  geometry.setDrawRange(0, model.nodalSegmentCount * 2);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), MATHEMATICAL_BOUND_RADIUS);
  const material = new THREE.LineBasicMaterial({ color: 0xd7c8ff, toneMapped: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = 4;
  return { lines, attribute };
}

class MobiusChoirSceneImplementation implements MobiusChoirScene {
  readonly backend: RendererBackend;

  private readonly renderer: SceneRenderer;
  private readonly canvas: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEGREES, 1, 0.1, 40);
  private readonly drawing = createMobiusChoirDrawingModel();
  private readonly surface = createSurface(this.drawing);
  private readonly boundary = createLine(this.drawing.boundaryPositions, 0xc3b5e8, 0.9, 2);
  private readonly parameterGrid = createLineSegments(
    this.drawing.parameterGridPositions,
    0x5c5d9e,
    0.28,
    1,
  );
  private readonly seam = createSeam();
  private readonly nodes = createNodalLines(this.drawing);
  private readonly poetic: MobiusChoirPoeticLayer | null;
  private readonly environment: CinematicEnvironmentLayer | null;
  private readonly onContextLost: (event: Event) => void;
  private readonly onContextRestored: () => void;
  private postProcessor: CinematicPostProcessor | null = null;
  private quality: QualityLevel = "high";
  private basePlacement: MobiusChoirCameraPlacement | null = null;
  private disposed = false;

  constructor(
    renderer: SceneRenderer,
    backend: RendererBackend,
    canvas: HTMLCanvasElement,
    seed: number,
    poeticLayers: boolean,
    onDeviceLost?: () => void,
  ) {
    this.renderer = renderer;
    this.backend = backend;
    this.canvas = canvas;
    this.scene.background = new THREE.Color(0x010107);
    this.environment = poeticLayers
      ? new CinematicEnvironmentLayer({
          backend,
          chapter: "mobius-choir",
          seed,
          maximumParticleCount: getCinematicEnvironmentParticleCount(
            "mobius-choir",
            "ultra",
            getMobiusChoirPoeticQuality("ultra").particleCount,
          ),
          palette: [0x76efff, 0xa766ff, 0xffbd78],
          extent: { x: 25, y: 16, z: 24 },
        })
      : null;
    this.poetic = poeticLayers
      ? new MobiusChoirPoeticLayer(createMobiusChoirPoeticModel(seed), backend, this.drawing)
      : null;
    if (this.environment) this.scene.add(this.environment.group);
    if (this.poetic) this.scene.add(this.poetic.group);
    this.scene.add(
      this.surface.mesh,
      this.parameterGrid,
      this.boundary,
      this.seam,
      this.nodes.lines,
    );
    this.onContextLost = (event) => {
      event.preventDefault();
    };
    this.onContextRestored = () => onDeviceLost?.();
    if (backend === "webgl") {
      canvas.addEventListener("webglcontextlost", this.onContextLost);
      canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    }
  }

  async initializePostProcessor(): Promise<void> {
    this.postProcessor = await createCinematicPostProcessor({
      renderer: this.renderer,
      backend: this.backend,
      scene: this.scene,
      camera: this.camera,
      exposure: 1.2,
    });
    this.postProcessor.setQuality(this.quality);
  }

  update(absoluteTimeSeconds: number): void {
    if (this.disposed) throw new Error("Möbius Choir scene has been disposed");
    updateMobiusChoirDrawingModel(this.drawing, absoluteTimeSeconds);
    this.surface.colorAttribute.needsUpdate = true;
    this.nodes.attribute.needsUpdate = true;
    this.nodes.lines.geometry.setDrawRange(0, this.drawing.nodalSegmentCount * 2);
    this.nodes.lines.visible = getMobiusChoirNodalVisibility(this.drawing.nodalSegmentCount);
    const visualFrame = this.poetic?.update(absoluteTimeSeconds) ?? null;
    const dramaturgy =
      visualFrame?.dramaturgy ?? evaluateMobiusChoirDramaturgy(absoluteTimeSeconds);
    const reaction = visualFrame ? getMobiusChoirSceneReaction(visualFrame) : null;
    if (this.basePlacement) {
      const placement = getMobiusChoirChoreographedCameraPlacement(
        this.basePlacement,
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
    this.environment?.update(
      absoluteTimeSeconds,
      reaction?.environmentEnergy ?? dramaturgy.visualEnergy,
      reaction?.warmth ??
        (dramaturgy.sectionId === "confluence" ? 0.8 : dramaturgy.audioEnergy * 0.45),
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
      throw new Error("Möbius Choir viewport values must be positive and finite");
    }
    const aspect = viewport.width / viewport.height;
    const placement = getMobiusChoirCameraPlacement(aspect);
    this.basePlacement = placement;
    this.camera.aspect = aspect;
    this.camera.fov = placement.fovDegrees;
    this.camera.near = placement.near;
    this.camera.far = placement.far;
    this.camera.position.set(placement.positionX, placement.positionY, placement.positionZ);
    this.camera.lookAt(placement.targetX, placement.targetY, placement.targetZ);
    this.camera.updateProjectionMatrix();
    this.environment?.resize(aspect);
    if (this.postProcessor) {
      this.postProcessor.resize(viewport.width, viewport.height, viewport.pixelRatio);
    } else {
      this.renderer.setPixelRatio(viewport.pixelRatio);
      this.renderer.setSize(viewport.width, viewport.height, false);
    }
  }

  setQuality(level: QualityLevel): void {
    getMobiusChoirStrictQuality(level);
    this.quality = level;
    this.poetic?.setQuality(level);
    const localParticles = getMobiusChoirPoeticQuality(level).particleCount;
    this.environment?.setParticleCount(
      getCinematicEnvironmentParticleCount("mobius-choir", level, localParticles),
    );
    this.postProcessor?.setQuality(level);
  }

  getStats(): MobiusChoirSceneStats {
    return {
      backend: this.backend,
      postMode: this.postProcessor?.mode ?? "direct",
      vertices: this.drawing.vertexCount,
      triangles: this.drawing.triangleCount,
      nodalSegments: this.drawing.nodalSegmentCount,
      boundaryComponents: 1,
      seamSegments: SEAM_POINT_COUNT - 1,
      parameterGridSegments: this.drawing.parameterGridSegmentCount,
      poetic:
        this.poetic && this.environment
          ? {
              ...this.poetic.getStats(),
              environmentParticles: this.environment.getStats().particles,
              totalParticles:
                this.poetic.getStats().particles + this.environment.getStats().particles,
            }
          : null,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.surface.mesh.geometry.dispose();
    (this.surface.mesh.material as THREE.Material).dispose();
    for (const object of [this.parameterGrid, this.boundary, this.seam, this.nodes.lines]) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
    this.poetic?.dispose();
    this.environment?.dispose();
    this.postProcessor?.dispose();
    this.postProcessor = null;
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.renderer.dispose();
  }
}

export async function createMobiusChoirScene({
  canvas,
  seed = 0,
  poeticLayers = true,
  onDeviceLost,
  preserveDrawingBuffer,
}: MobiusChoirSceneOptions): Promise<MobiusChoirScene> {
  const forceWebGL = new URLSearchParams(window.location.search).get("renderer") === "webgl";
  const backend = selectRendererBackend(forceWebGL, "gpu" in navigator);
  if (backend === "webgl") {
    const { WebGLRenderer } = await import("three");
    const renderer = new WebGLRenderer(
      getMobiusChoirWebGLRendererParameters({ canvas, preserveDrawingBuffer }),
    );
    const scene = new MobiusChoirSceneImplementation(
      renderer,
      backend,
      canvas,
      seed,
      poeticLayers,
      onDeviceLost,
    );
    await scene.initializePostProcessor();
    return scene;
  }

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: false });
  const reportDeviceLost = renderer.onDeviceLost.bind(renderer);
  renderer.onDeviceLost = (info) => {
    reportDeviceLost(info);
    onDeviceLost?.();
  };
  await renderer.init();
  const scene = new MobiusChoirSceneImplementation(
    renderer,
    backend,
    canvas,
    seed,
    poeticLayers,
    onDeviceLost,
  );
  await scene.initializePostProcessor();
  return scene;
}
