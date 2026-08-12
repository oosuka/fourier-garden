import * as THREE from "three/webgpu";
import type { WebGLRenderer } from "three";

import { selectRendererBackend, type RendererBackend } from "../../core/rendererBackend";
import type {
  PatternScene,
  PatternSceneOptions,
  QualityLevel,
  Viewport,
} from "../../patterns/contracts";
import { CinematicEnvironmentLayer } from "../cinematic/environmentLayer";
import type { CinematicEnvironmentProfile } from "../cinematic/model";
import {
  createCinematicPostProcessor,
  type CinematicPostProcessor,
} from "../cinematic/postProcessing";

type SceneRenderer = THREE.WebGPURenderer | WebGLRenderer;

export interface AnalyticSceneFrame {
  energy: number;
  warmth: number;
  cameraX?: number;
  cameraY?: number;
}

export interface AnalyticSceneContent {
  group: THREE.Group;
  update(timeSeconds: number): AnalyticSceneFrame;
  setQuality?(level: QualityLevel): void;
  dispose?(): void;
}

export interface ImmersiveAnalyticSceneConfig {
  profile: CinematicEnvironmentProfile;
  palette: readonly [number, number, number];
  particleBudgets: Readonly<Record<QualityLevel, number>>;
  extent: Readonly<{ x: number; y: number; z: number }>;
  camera: Readonly<{ distance: number; height: number; targetY: number; fovDegrees: number }>;
  exposure: number;
  createContent(backend: RendererBackend): AnalyticSceneContent;
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const renderable = object as THREE.Mesh & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    renderable.geometry?.dispose();
    const materials = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : [];
    for (const material of materials) {
      const texturedMaterial = material as THREE.Material & {
        alphaMap?: THREE.Texture | null;
        map?: THREE.Texture | null;
      };
      texturedMaterial.map?.dispose();
      if (texturedMaterial.alphaMap !== texturedMaterial.map) texturedMaterial.alphaMap?.dispose();
      material.dispose();
    }
  });
}

class ImmersiveAnalyticScene implements PatternScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera();
  private readonly content: AnalyticSceneContent;
  private readonly environment: CinematicEnvironmentLayer | null;
  private postProcessor: CinematicPostProcessor | null = null;
  private quality: QualityLevel = "high";
  private aspect = 1;
  private disposed = false;

  constructor(
    private readonly renderer: SceneRenderer,
    private readonly backend: RendererBackend,
    private readonly config: ImmersiveAnalyticSceneConfig,
    seed: number,
    poeticLayers: boolean,
  ) {
    this.scene.background = new THREE.Color(0x010208);
    this.content = config.createContent(backend);
    this.environment = poeticLayers
      ? new CinematicEnvironmentLayer({
          backend,
          profile: config.profile,
          seed,
          maximumParticleCount: config.particleBudgets.ultra,
          palette: config.palette,
          extent: config.extent,
        })
      : null;
    if (this.environment) this.scene.add(this.environment.group);
    this.scene.add(this.content.group);
  }

  async initialize(): Promise<void> {
    this.postProcessor = await createCinematicPostProcessor({
      renderer: this.renderer,
      backend: this.backend,
      scene: this.scene,
      camera: this.camera,
      exposure: this.config.exposure,
    });
    this.postProcessor.setQuality(this.quality);
  }

  update(frame: { time: number }): void {
    if (this.disposed) throw new Error("Analytic scene has been disposed");
    const response = this.content.update(frame.time);
    const cameraDistance =
      this.config.camera.distance * (this.aspect > 2 ? 1.06 : 1) +
      Math.cos(frame.time * 0.031) * 0.24;
    const orbit = Math.sin(frame.time * 0.071) * 0.36 + Math.sin(frame.time * 0.019 + 1.2) * 0.18;
    this.camera.position.set(
      (response.cameraX ?? 0) + orbit,
      this.config.camera.height +
        (response.cameraY ?? 0) +
        Math.sin(frame.time * 0.049 + 0.7) * 0.16,
      cameraDistance,
    );
    this.camera.lookAt(
      Math.sin(frame.time * 0.023) * 0.14,
      this.config.camera.targetY + Math.cos(frame.time * 0.027) * 0.1,
      0,
    );
    this.environment?.update(frame.time, response.energy, response.warmth, this.camera);
    this.postProcessor?.setEnergy(response.energy);
    if (this.postProcessor) this.postProcessor.render();
    else this.renderer.render(this.scene, this.camera);
  }

  resize(viewport: Viewport): void {
    this.aspect = viewport.width / viewport.height;
    this.camera.aspect = this.aspect;
    this.camera.fov = this.config.camera.fovDegrees + (this.aspect < 1.55 ? 4 : 0);
    this.camera.near = 0.1;
    this.camera.far = 100;
    this.camera.updateProjectionMatrix();
    this.environment?.resize(this.aspect);
    if (this.postProcessor) {
      this.postProcessor.resize(viewport.width, viewport.height, viewport.pixelRatio);
    } else {
      this.renderer.setPixelRatio(viewport.pixelRatio);
      this.renderer.setSize(viewport.width, viewport.height, false);
    }
  }

  setQuality(level: QualityLevel): void {
    this.quality = level;
    this.environment?.setParticleCount(this.config.particleBudgets[level]);
    this.content.setQuality?.(level);
    this.postProcessor?.setQuality(level);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.content.dispose?.();
    disposeObject(this.content.group);
    this.environment?.dispose();
    this.postProcessor?.dispose();
    this.renderer.dispose();
  }
}

export async function createImmersiveAnalyticScene(
  options: PatternSceneOptions,
  config: ImmersiveAnalyticSceneConfig,
): Promise<PatternScene> {
  const forceWebGL = new URLSearchParams(window.location.search).get("renderer") === "webgl";
  const backend = selectRendererBackend(forceWebGL, "gpu" in navigator);
  options.canvas.dataset.rendererBackend = backend;
  let renderer: SceneRenderer;
  if (backend === "webgl") {
    const module = await import("three");
    renderer = new module.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } else {
    const webgpu = new THREE.WebGPURenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: false,
    });
    const reportDeviceLost = webgpu.onDeviceLost.bind(webgpu);
    webgpu.onDeviceLost = (info) => {
      reportDeviceLost(info);
      options.onDeviceLost?.();
    };
    await webgpu.init();
    renderer = webgpu;
  }
  const poeticLayers = new URLSearchParams(window.location.search).get("poetic") !== "off";
  const scene = new ImmersiveAnalyticScene(renderer, backend, config, options.seed, poeticLayers);
  await scene.initialize();
  return scene;
}
