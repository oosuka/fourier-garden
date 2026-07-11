import * as THREE from "three/webgpu";
import type { WebGLRenderer, WebGLRendererParameters } from "three";

import { selectRendererBackend, type RendererBackend } from "../../../core/rendererBackend";
import { createSeededRandom } from "../../../core/seed";
import { getEpicycleSteps, projectSeriesToVerticalAxis } from "../../../math/fourierSeries";
import { CinematicEnvironmentLayer } from "../../../rendering/cinematic/environmentLayer";
import {
  CINEMATIC_PARTICLE_BUDGETS,
  getCinematicEnvironmentParticleCount,
} from "../../../rendering/cinematic/model";
import {
  createCinematicPostProcessor,
  type CinematicPostMode,
  type CinematicPostProcessor,
} from "../../../rendering/cinematic/postProcessing";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "../math/model";
import { getResidueBloomVisualResponse, type ResidueBloomVisualResponse } from "./visualResponse";
import {
  RESIDUE_BLOOM_HISTORY_PULSE_POINTS,
  getCoronaPresentation,
  getHistoryPulsePoint,
  getHistoryPulseWindow,
  getPhraseColorHex,
  getRendererVisibilityScale,
  getWaveTrailVerticalDrift,
} from "./scoreOverlay";
import type { PatternSceneOptions, QualityLevel, Viewport } from "../../contracts";
import type { ResidueBloomFrameContext, ResidueBloomSceneInstance } from "../types";

const PALETTE = [0x78f3ff, 0x8ac8ff, 0xa798ff, 0xe59aff, 0xffc782, 0xc8fff3] as const;
const TWO_PI = Math.PI * 2;
const BURST_SLOT_COUNT = 4;
const BURST_PARTICLES_PER_SLOT = 192;
const BURST_PARTICLE_COUNT = BURST_SLOT_COUNT * BURST_PARTICLES_PER_SLOT;
const HISTORY_PULSE_SLOT_COUNT = 4;
const RESIDUE_BLOOM_AMPLITUDE_BOUND = RESIDUE_BLOOM_SERIES.terms.reduce(
  (sum, term) => sum + term.amplitude,
  0,
);

interface DynamicLine {
  line: THREE.Line;
  positions: Float32Array;
}

type SceneRenderer = THREE.WebGPURenderer | WebGLRenderer;

export interface ResidueBloomSceneOptions extends PatternSceneOptions {
  poeticLayers?: boolean;
  preserveDrawingBuffer?: boolean;
}

export interface ResidueBloomSceneStats {
  backend: RendererBackend;
  postMode: CinematicPostMode;
  totalParticles: number;
}

const RESIDUE_BLOOM_LOCAL_PARTICLE_COUNTS: Readonly<Record<QualityLevel, number>> = Object.freeze({
  low: 4_000,
  medium: 7_000,
  high: 9_000,
  ultra: 12_000,
});

const RESIDUE_BLOOM_WEBGL_LOCAL_PARTICLE_COUNTS: Readonly<Record<QualityLevel, number>> =
  Object.freeze({
    low: 3_000,
    medium: 5_000,
    high: 7_000,
    ultra: 9_000,
  });

export function getResidueBloomLocalParticleCount(
  level: QualityLevel,
  backend: RendererBackend,
): number {
  return backend === "webgl"
    ? RESIDUE_BLOOM_WEBGL_LOCAL_PARTICLE_COUNTS[level]
    : RESIDUE_BLOOM_LOCAL_PARTICLE_COUNTS[level];
}

export function getResidueBloomCinematicCounts(level: QualityLevel): {
  localParticles: number;
  burstParticles: typeof BURST_PARTICLE_COUNT;
  environmentParticles: number;
  totalParticles: number;
} {
  const localParticles = RESIDUE_BLOOM_LOCAL_PARTICLE_COUNTS[level];
  const environmentParticles = getCinematicEnvironmentParticleCount(
    "residue-bloom",
    level,
    localParticles + BURST_PARTICLE_COUNT,
  );
  return {
    localParticles,
    burstParticles: BURST_PARTICLE_COUNT,
    environmentParticles,
    totalParticles: CINEMATIC_PARTICLE_BUDGETS["residue-bloom"][level],
  };
}

export function getResidueBloomPrimaryWavePoint(
  timeSeconds: number,
  progress: number,
  waveStartX: number,
  waveEndX: number,
  centerY: number,
  scale: number,
): { x: number; y: number; angle: number } {
  if (
    !Number.isFinite(timeSeconds) ||
    !Number.isFinite(waveStartX) ||
    !Number.isFinite(waveEndX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(scale)
  ) {
    throw new Error("Residue Bloom primary waveform inputs must be finite");
  }
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new Error("Residue Bloom primary waveform progress must be between zero and one");
  }
  const angle = (timeSeconds - progress * 8.6) * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE;
  return {
    x: waveStartX + progress * (waveEndX - waveStartX),
    y: projectSeriesToVerticalAxis(RESIDUE_BLOOM_SERIES, angle, centerY, scale),
    angle,
  };
}

function hash01(eventSeed: number, particleIndex: number, channel: number): number {
  let value =
    eventSeed ^ Math.imul(particleIndex + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

function makeLine(pointCount: number, color: number, opacity: number, loop = false): DynamicLine {
  const positions = new Float32Array(pointCount * 3);
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const line = loop ? new THREE.Line(geometry, material) : new THREE.Line(geometry, material);
  return { line, positions };
}

function updateAttribute(line: DynamicLine): void {
  const attribute = line.line.geometry.getAttribute("position") as THREE.BufferAttribute;
  attribute.needsUpdate = true;
  line.line.geometry.computeBoundingSphere();
}

class ResidueBloomScene implements ResidueBloomSceneInstance {
  private readonly renderer: SceneRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly backend: RendererBackend;
  private readonly random: () => number;
  private readonly poeticLayers: boolean;
  private readonly environmentLayer: CinematicEnvironmentLayer | null;
  private readonly epicycleGroup = new THREE.Group();
  private readonly atmosphereGroup = new THREE.Group();
  private readonly fieldGroup = new THREE.Group();
  private readonly circles: THREE.Line[] = [];
  private readonly coronas: THREE.Line[] = [];
  private readonly spokes: DynamicLine;
  private readonly spokeNodePositions = new Float32Array(14 * 3);
  private readonly spokeNodes: THREE.Points;
  private readonly waveLines: DynamicLine[] = [];
  private readonly historyPulseLines: DynamicLine[] = [];
  private readonly historyPulseBeads: THREE.Mesh[] = [];
  private readonly organicLines: DynamicLine[] = [];
  private readonly particleCloud: THREE.Points;
  private readonly particleBase: Float32Array;
  private readonly burstParticles: THREE.Points;
  private readonly burstPositions: Float32Array;
  private readonly burstColors: Float32Array;
  private readonly endpointCore: THREE.Mesh;
  private readonly endpointHalo: THREE.Mesh;
  private readonly connector: DynamicLine;
  private postProcessor: CinematicPostProcessor | null = null;
  private quality: QualityLevel = "high";
  private viewport: Viewport = {
    width: 1,
    height: 1,
    pixelRatio: 1,
  };

  private constructor(
    renderer: SceneRenderer,
    seed: number,
    backend: RendererBackend,
    poeticLayers: boolean,
  ) {
    this.renderer = renderer;
    this.random = createSeededRandom(seed);
    this.backend = backend;
    this.poeticLayers = poeticLayers;
    this.scene.background = new THREE.Color(0x010308);
    this.camera.position.set(0, 0, 20);
    this.camera.near = 0.01;
    this.camera.far = 80;

    this.environmentLayer = poeticLayers
      ? new CinematicEnvironmentLayer({
          backend,
          chapter: "residue-bloom",
          seed,
          maximumParticleCount: getResidueBloomCinematicCounts("ultra").environmentParticles,
          palette: [0x78f3ff, 0xa798ff, 0xffc782],
          extent: { x: 46, y: 27, z: 22 },
        })
      : null;
    if (this.environmentLayer) this.scene.add(this.environmentLayer.group);
    this.createEpicycles();

    this.spokes = makeLine(14, 0xd6f8ff, 0.62);
    this.epicycleGroup.add(this.spokes.line);

    const spokeNodeGeometry = new THREE.BufferGeometry();
    const spokeNodeAttribute = new THREE.BufferAttribute(this.spokeNodePositions, 3);
    spokeNodeAttribute.setUsage(THREE.DynamicDrawUsage);
    spokeNodeGeometry.setAttribute("position", spokeNodeAttribute);
    this.spokeNodes = new THREE.Points(
      spokeNodeGeometry,
      new THREE.PointsMaterial({
        color: 0xffc782,
        size: this.backend === "webgl" ? 0.1 : 0.085,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.spokeNodes.frustumCulled = false;
    this.epicycleGroup.add(this.spokeNodes);

    for (let index = 0; index < 9; index += 1) {
      const wave = makeLine(
        720,
        PALETTE[index % PALETTE.length] ?? 0xffffff,
        index === 0 ? 1 : 0.12 + (8 - index) * 0.025,
      );
      if (!poeticLayers && index > 0) wave.line.visible = false;
      this.waveLines.push(wave);
      this.fieldGroup.add(wave.line);
    }

    for (let index = 0; index < HISTORY_PULSE_SLOT_COUNT; index += 1) {
      const pulse = makeLine(RESIDUE_BLOOM_HISTORY_PULSE_POINTS, 0xffc782, 0);
      pulse.line.visible = false;
      pulse.line.frustumCulled = false;
      pulse.line.renderOrder = 4;
      this.historyPulseLines.push(pulse);
      this.fieldGroup.add(pulse.line);

      const bead = new THREE.Mesh(
        new THREE.CircleGeometry(0.085, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffc782,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      bead.visible = false;
      bead.renderOrder = 5;
      this.historyPulseBeads.push(bead);
      this.fieldGroup.add(bead);
    }

    for (let index = 0; index < 15; index += 1) {
      const organic = makeLine(
        460,
        PALETTE[(index + 2) % PALETTE.length] ?? 0xffffff,
        0.07 + (index % 4) * 0.025,
        true,
      );
      organic.line.visible = poeticLayers;
      this.organicLines.push(organic);
      this.atmosphereGroup.add(organic.line);
    }

    this.connector = makeLine(2, 0xbef9ff, 0.27);
    (this.connector.line.material as THREE.LineBasicMaterial).transparent = true;
    this.scene.add(this.connector.line);

    const particleData = this.createFlowParticles(12_000);
    this.particleCloud = particleData.points;
    this.particleBase = particleData.base;
    this.particleCloud.visible = poeticLayers;
    this.atmosphereGroup.add(this.particleCloud);

    const burstData = this.createBurstParticles();
    this.burstParticles = burstData.points;
    this.burstPositions = burstData.positions;
    this.burstColors = burstData.colors;
    this.burstParticles.visible = poeticLayers;
    this.scene.add(this.burstParticles);

    const coreGeometry = new THREE.CircleGeometry(0.105, 48);
    this.endpointCore = new THREE.Mesh(
      coreGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.endpointHalo = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 64),
      new THREE.MeshBasicMaterial({
        color: 0x72eaff,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.endpointHalo.visible = poeticLayers;
    this.scene.add(this.endpointHalo, this.endpointCore);

    this.scene.add(this.atmosphereGroup, this.fieldGroup, this.epicycleGroup);
  }

  static async create({
    canvas,
    seed,
    onDeviceLost,
    poeticLayers = true,
    preserveDrawingBuffer = false,
  }: ResidueBloomSceneOptions): Promise<ResidueBloomScene> {
    const forceWebGL = new URLSearchParams(window.location.search).get("renderer") === "webgl";
    const backend = selectRendererBackend(forceWebGL, "gpu" in navigator);

    if (backend === "webgl") {
      const { WebGLRenderer } = await import("three");
      const parameters: WebGLRendererParameters = {
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer,
      };
      const renderer = new WebGLRenderer(parameters);
      const scene = new ResidueBloomScene(renderer, seed, backend, poeticLayers);
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
    const scene = new ResidueBloomScene(renderer, seed, backend, poeticLayers);
    await scene.initializePostProcessor();
    return scene;
  }

  private async initializePostProcessor(): Promise<void> {
    this.postProcessor = await createCinematicPostProcessor({
      renderer: this.renderer,
      backend: this.backend,
      scene: this.scene,
      camera: this.camera,
      exposure: 1.26,
    });
    this.postProcessor.setQuality(this.quality);
  }

  update(frame: ResidueBloomFrameContext): void {
    const timeValue = frame.time;
    const response = getResidueBloomVisualResponse(frame.score);
    const angle = timeValue * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE;
    const aspect = this.viewport.width / this.viewport.height;
    const epicycleScale = aspect < 1.6 ? 0.58 : 0.66;
    const centerX = aspect < 1.6 ? -5.15 : -6.35;
    const centerY = 0.12;
    const steps = getEpicycleSteps(RESIDUE_BLOOM_SERIES, angle);

    this.epicycleGroup.position.set(centerX, centerY, 0.7);
    this.updateEpicycles(steps, epicycleScale, response, frame.score.event.phraseIndex);

    const endpoint = steps.at(-1);
    const endpointX = centerX + (endpoint?.x ?? 0) * epicycleScale;
    const endpointY = centerY + (endpoint?.y ?? 0) * epicycleScale;
    this.endpointCore.position.set(endpointX, endpointY, 1.4);
    this.endpointHalo.position.set(endpointX, endpointY, 1.3);
    this.endpointHalo.scale.setScalar(
      this.backend === "webgl" ? response.haloScale * 1.18 : response.haloScale * 1.12,
    );
    (this.endpointHalo.material as THREE.MeshBasicMaterial).opacity =
      this.backend === "webgl"
        ? Math.min(0.54, response.haloOpacity * 1.5)
        : Math.min(0.48, response.haloOpacity * 1.18);

    const waveStart = aspect < 1.6 ? 2.05 : 2.55;
    this.updateConnector(endpointX, endpointY, waveStart);
    this.updateWaves(timeValue, centerY, waveStart, epicycleScale);
    if (this.poeticLayers) {
      this.updateHistoryPulses(frame, response, timeValue, centerY, waveStart, epicycleScale);
      this.updateOrganicField(timeValue, endpointX, endpointY, response);
      this.updateFlowParticles(timeValue, endpointX, endpointY, response);
      this.updateBurstParticles(frame, response, centerX, centerY, epicycleScale);
    }
    this.environmentLayer?.update(
      timeValue,
      Math.min(1, response.membraneDisplacement + response.flowEnergy * 0.55),
      response.warmth,
      this.camera,
    );

    this.atmosphereGroup.rotation.z = Math.sin(timeValue * 0.027) * 0.025;
    this.waveLines.forEach((wave, trailIndex) => {
      wave.line.position.y = getWaveTrailVerticalDrift(timeValue, trailIndex);
    });

    this.postProcessor?.setEnergy(Math.min(1, response.bloomBoost + response.flowEnergy * 0.65));
    if (this.postProcessor) this.postProcessor.render();
    else this.renderer.render(this.scene, this.camera);
  }

  resize(viewport: Viewport): void {
    this.viewport = viewport;
    const aspect = viewport.width / viewport.height;
    const halfHeight = 10;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
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
    this.quality = level;
    this.particleCloud.geometry.setDrawRange(0, this.getQualityMaximum());
    this.environmentLayer?.setParticleCount(
      getResidueBloomCinematicCounts(level).environmentParticles,
    );
    this.postProcessor?.setQuality(level);
    this.organicLines.forEach((line, index) => {
      line.line.visible =
        this.poeticLayers && (level === "low" ? index < 5 : level === "medium" ? index < 8 : true);
    });
  }

  getStats(): ResidueBloomSceneStats {
    return {
      backend: this.backend,
      postMode: this.postProcessor?.mode ?? "direct",
      totalParticles: this.poeticLayers
        ? getResidueBloomCinematicCounts(this.quality).totalParticles
        : 0,
    };
  }

  dispose(): void {
    if (this.environmentLayer) {
      this.scene.remove(this.environmentLayer.group);
      this.environmentLayer.dispose();
    }
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((item) => {
          (item as THREE.MeshBasicMaterial).map?.dispose();
          item.dispose();
        });
      } else {
        (material as THREE.MeshBasicMaterial | undefined)?.map?.dispose();
        material?.dispose();
      }
    });
    this.postProcessor?.dispose();
    this.postProcessor = null;
    this.renderer.dispose();
  }

  private createEpicycles(): void {
    for (let index = 0; index < RESIDUE_BLOOM_SERIES.terms.length; index += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 129 }, (_, pointIndex) => {
          const angle = (pointIndex / 128) * TWO_PI;
          return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
        }),
      );
      const material = new THREE.LineBasicMaterial({
        color: PALETTE[index % PALETTE.length],
        transparent: true,
        opacity: Math.max(0.18, 0.72 - index * 0.038),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const circle = new THREE.Line(geometry, material);
      const corona = new THREE.Line(
        geometry.clone(),
        new THREE.LineBasicMaterial({
          color: 0xffc782,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      corona.renderOrder = 3;
      this.circles.push(circle);
      this.coronas.push(corona);
      this.epicycleGroup.add(circle, corona);
    }
  }

  private createFlowParticles(count: number): {
    points: THREE.Points;
    base: Float32Array;
  } {
    const base = new Float32Array(count * 4);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const normalized = this.random();
      base[index * 4] = normalized;
      base[index * 4 + 1] = (this.random() - 0.5) * 2;
      base[index * 4 + 2] = this.random();
      base[index * 4 + 3] = this.random() * TWO_PI;
      color.setHex(PALETTE[Math.floor(this.random() * PALETTE.length)]!);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", positionAttribute);
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.044,
        transparent: true,
        opacity: 0.76,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    return { points, base };
  }

  private createBurstParticles(): {
    points: THREE.Points;
    positions: Float32Array;
    colors: Float32Array;
  } {
    const positions = new Float32Array(BURST_PARTICLE_COUNT * 3);
    const colors = new Float32Array(BURST_PARTICLE_COUNT * 3);
    positions.fill(-1_000);
    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    const colorAttribute = new THREE.BufferAttribute(colors, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    colorAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", positionAttribute);
    geometry.setAttribute("color", colorAttribute);
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.16,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.92,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    points.frustumCulled = false;
    return { points, positions, colors };
  }

  private updateEpicycles(
    steps: ReturnType<typeof getEpicycleSteps>,
    scale: number,
    response: ResidueBloomVisualResponse,
    phraseIndex: number,
  ): void {
    const spokePositions = this.spokes.positions;
    const rendererVisibilityScale = getRendererVisibilityScale(this.backend);
    spokePositions[0] = 0;
    spokePositions[1] = 0;
    spokePositions[2] = 0.2;

    steps.forEach((step, index) => {
      const circle = this.circles[index]!;
      circle.position.set(step.originX * scale, step.originY * scale, 0.2);
      circle.scale.setScalar(step.radius * scale);

      const corona = this.coronas[index]!;
      corona.position.copy(circle.position);
      corona.scale.copy(circle.scale);
      const presentation = getCoronaPresentation(index, response.coronaStrength, phraseIndex);
      const coronaMaterial = corona.material as THREE.LineBasicMaterial;
      coronaMaterial.opacity = Math.min(1, presentation.opacity * rendererVisibilityScale);
      coronaMaterial.color.setHex(presentation.colorHex);

      const offset = (index + 1) * 3;
      spokePositions[offset] = step.x * scale;
      spokePositions[offset + 1] = step.y * scale;
      spokePositions[offset + 2] = 0.3;
    });
    updateAttribute(this.spokes);

    this.spokeNodePositions.set(spokePositions);
    const spokeNodeAttribute = this.spokeNodes.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    spokeNodeAttribute.needsUpdate = true;
    this.spokeNodes.geometry.computeBoundingSphere();
    const spokeNodeMaterial = this.spokeNodes.material as THREE.PointsMaterial;
    spokeNodeMaterial.color.setHex(getPhraseColorHex(phraseIndex));
    spokeNodeMaterial.opacity = Math.min(1, response.spokeNodeOpacity * rendererVisibilityScale);
  }

  private updateConnector(endpointX: number, endpointY: number, waveStart: number): void {
    this.connector.positions.set([endpointX, endpointY, 0.4, waveStart, endpointY, 0.4]);
    updateAttribute(this.connector);
  }

  private updateWaves(timeValue: number, centerY: number, waveStart: number, scale: number): void {
    const worldRight = this.camera.right + 1.4;
    const lengthValue = worldRight - waveStart;

    this.waveLines.forEach((wave, trailIndex) => {
      const delay = trailIndex * 0.035;
      for (let index = 0; index < 720; index += 1) {
        const progress = index / 719;
        const offset = index * 3;
        if (trailIndex === 0) {
          const point = getResidueBloomPrimaryWavePoint(
            timeValue,
            progress,
            waveStart,
            worldRight,
            centerY,
            scale,
          );
          wave.positions[offset] = point.x;
          wave.positions[offset + 1] = point.y;
        } else {
          const historyAngle =
            (timeValue - progress * 8.6 - delay) * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE;
          wave.positions[offset] = waveStart + progress * lengthValue + trailIndex * 0.018;
          wave.positions[offset + 1] =
            projectSeriesToVerticalAxis(RESIDUE_BLOOM_SERIES, historyAngle, centerY, scale) +
            Math.sin(progress * 21 + timeValue * 0.22) * trailIndex * 0.012;
        }
        wave.positions[offset + 2] = 0.25 - trailIndex * 0.028;
      }
      updateAttribute(wave);
    });
  }

  private updateHistoryPulses(
    frame: ResidueBloomFrameContext,
    response: ResidueBloomVisualResponse,
    timeValue: number,
    centerY: number,
    waveStart: number,
    scale: number,
  ): void {
    const worldRight = this.camera.right + 1.4;
    const rendererVisibilityScale = getRendererVisibilityScale(this.backend);

    for (let slot = 0; slot < HISTORY_PULSE_SLOT_COUNT; slot += 1) {
      const pulse = this.historyPulseLines[slot]!;
      const bead = this.historyPulseBeads[slot]!;
      const impulse = frame.score.recentImpulses[slot];

      if (!impulse) {
        pulse.line.visible = false;
        bead.visible = false;
        continue;
      }

      const window = getHistoryPulseWindow(impulse.ageSeconds);
      for (let index = 0; index < RESIDUE_BLOOM_HISTORY_PULSE_POINTS; index += 1) {
        const pointProgress = index / (RESIDUE_BLOOM_HISTORY_PULSE_POINTS - 1);
        const progress =
          window.startProgress + (window.endProgress - window.startProgress) * pointProgress;
        const point = getHistoryPulsePoint({
          timeSeconds: timeValue,
          progress,
          waveStartX: waveStart,
          waveEndX: worldRight,
          centerY,
          scale,
        });
        const offset = index * 3;
        pulse.positions[offset] = point.x;
        pulse.positions[offset + 1] = point.y;
        pulse.positions[offset + 2] = 0.42;
      }

      const colorHex = getPhraseColorHex(impulse.event.phraseIndex);
      const eventStrength = Math.max(impulse.impact, impulse.tail * 0.45);
      const opacity = Math.min(
        0.96,
        response.historyPulseOpacity * eventStrength * rendererVisibilityScale,
      );
      const pulseMaterial = pulse.line.material as THREE.LineBasicMaterial;
      pulseMaterial.color.setHex(colorHex);
      pulseMaterial.opacity = opacity;
      pulse.line.visible = opacity > 0.002;
      updateAttribute(pulse);

      const centerPoint = getHistoryPulsePoint({
        timeSeconds: timeValue,
        progress: window.centerProgress,
        waveStartX: waveStart,
        waveEndX: worldRight,
        centerY,
        scale,
      });
      bead.position.set(centerPoint.x, centerPoint.y, 0.5);
      bead.scale.setScalar(0.78 + Math.min(1.4, impulse.impact) * 0.42);
      const beadMaterial = bead.material as THREE.MeshBasicMaterial;
      beadMaterial.color.setHex(colorHex);
      beadMaterial.opacity = Math.min(1, opacity * 1.18);
      bead.visible = pulse.line.visible;
    }
  }

  private updateOrganicField(
    timeValue: number,
    endpointX: number,
    endpointY: number,
    response: ResidueBloomVisualResponse,
  ): void {
    this.organicLines.forEach((organic, lineIndex) => {
      const huePhase = lineIndex / this.organicLines.length;
      for (let index = 0; index < 460; index += 1) {
        const progress = index / 459;
        const theta = progress * TWO_PI;
        const responseLobe =
          response.membraneDisplacement * Math.sin(theta * 2 - timeValue * 1.7 + lineIndex * 0.4);
        const lobe =
          1 +
          0.2 * Math.sin(theta * (3 + (lineIndex % 4)) + timeValue * 0.17) +
          0.08 * Math.sin(theta * 11 - timeValue * 0.11) +
          responseLobe;
        const radiusX = 5.1 + lineIndex * 0.21;
        const radiusY = 3.25 + lineIndex * 0.17;
        const drift = Math.sin(timeValue * 0.043 + lineIndex) * 0.6;
        const offset = index * 3;
        organic.positions[offset] =
          endpointX * 0.18 + Math.cos(theta + huePhase) * radiusX * lobe + drift;
        organic.positions[offset + 1] =
          endpointY * 0.12 +
          Math.sin(theta) * radiusY * lobe +
          Math.sin(theta * 2 - timeValue * 0.08) * 0.8;
        organic.positions[offset + 2] = -0.8 - lineIndex * 0.08;
      }
      updateAttribute(organic);
    });
  }

  private updateFlowParticles(
    timeValue: number,
    endpointX: number,
    endpointY: number,
    response: ResidueBloomVisualResponse,
  ): void {
    const positions = (
      this.particleCloud.geometry.getAttribute("position") as THREE.BufferAttribute
    ).array as Float32Array;
    const qualityMaximum = this.getQualityMaximum();
    const activeCount = Math.floor(qualityMaximum * (0.55 + response.sectionDensity * 0.45));
    const scoreDrift = response.flowEnergy * 0.16;
    this.particleCloud.geometry.setDrawRange(0, activeCount);

    for (let index = 0; index < activeCount; index += 1) {
      const progress =
        (this.particleBase[index * 4]! + timeValue * (0.0038 + scoreDrift * 0.002)) % 1;
      const spread = this.particleBase[index * 4 + 1]!;
      const depth = this.particleBase[index * 4 + 2]!;
      const phase = this.particleBase[index * 4 + 3]!;
      const theta = progress * TWO_PI + phase * 0.12;
      const radius = 3.2 + depth * 6.8 + Math.sin(theta * 4) * 0.55;
      positions[index * 3] =
        endpointX * 0.14 +
        Math.cos(theta) * radius +
        spread * 0.7 * Math.sin(theta * 3 + timeValue * 0.1);
      positions[index * 3 + 1] = endpointY * 0.1 + Math.sin(theta) * radius * 0.56 + spread * 1.35;
      positions[index * 3 + 2] = -0.35 - depth * 2.8;
    }
    (this.particleCloud.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
      true;
  }

  private updateBurstParticles(
    frame: ResidueBloomFrameContext,
    response: ResidueBloomVisualResponse,
    centerX: number,
    centerY: number,
    epicycleScale: number,
  ): void {
    for (let slot = 0; slot < BURST_SLOT_COUNT; slot += 1) {
      const impulse = frame.score.recentImpulses[slot];
      for (let particleIndex = 0; particleIndex < BURST_PARTICLES_PER_SLOT; particleIndex += 1) {
        const globalParticleIndex = slot * BURST_PARTICLES_PER_SLOT + particleIndex;
        const offset = globalParticleIndex * 3;

        if (!impulse) {
          this.burstPositions[offset] = -1_000;
          this.burstPositions[offset + 1] = -1_000;
          this.burstPositions[offset + 2] = -1_000;
          this.burstColors[offset] = 0;
          this.burstColors[offset + 1] = 0;
          this.burstColors[offset + 2] = 0;
          continue;
        }

        const eventSeed = Math.imul(frame.score.cycleIndex, 768) + impulse.event.globalStep;
        const angle = hash01(eventSeed, particleIndex, 0) * TWO_PI;
        const radius =
          impulse.ageSeconds *
          (2.4 + hash01(eventSeed, particleIndex, 1) * 2.2) *
          response.burstEnergy;
        const originX =
          centerX + impulse.event.normalizedPhasorX * RESIDUE_BLOOM_AMPLITUDE_BOUND * epicycleScale;
        const originY =
          centerY + impulse.event.normalizedPhasorY * RESIDUE_BLOOM_AMPLITUDE_BOUND * epicycleScale;
        this.burstPositions[offset] = originX + Math.cos(angle) * radius;
        this.burstPositions[offset + 1] = originY + Math.sin(angle) * radius;
        this.burstPositions[offset + 2] = 1.08 - hash01(eventSeed, particleIndex, 2) * 0.42;

        const intensity =
          impulse.impact *
          Math.exp(-impulse.ageSeconds / 0.38) *
          (0.45 + hash01(eventSeed, particleIndex, 3) * 0.55) *
          (this.backend === "webgl" ? 1.35 : 1);
        const colorMix = hash01(eventSeed, particleIndex, 4);
        let red = 0.22;
        let green = 0.88;
        let blue = 1;

        if (impulse.event.phraseIndex === 0) {
          red = 1;
          green = 0.82;
          blue = 0.5;
        } else if (impulse.event.phraseIndex === 2) {
          red = 0.5;
          green = 0.42;
          blue = 1;
        } else if (impulse.event.phraseIndex === 3) {
          red = 0.68 + colorMix * 0.32;
          green = 0.32 + colorMix * 0.38;
          blue = 1 - colorMix * 0.72;
        }

        this.burstColors[offset] = red * intensity;
        this.burstColors[offset + 1] = green * intensity;
        this.burstColors[offset + 2] = blue * intensity;
      }
    }

    (this.burstParticles.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
      true;
    (this.burstParticles.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate =
      true;
  }

  private getQualityMaximum(): number {
    return getResidueBloomLocalParticleCount(this.quality, this.backend);
  }
}

export async function createResidueBloomScene(
  options: ResidueBloomSceneOptions,
): Promise<ResidueBloomSceneInstance & { getStats(): ResidueBloomSceneStats }> {
  return ResidueBloomScene.create(options);
}
