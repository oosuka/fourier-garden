import * as THREE from "three/webgpu";
import type { WebGLRenderer } from "three";
import {
  Fn,
  float,
  length,
  mix,
  pass,
  sin,
  smoothstep,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import { createSeededRandom } from "../core/seed";
import { selectRendererBackend, type RendererBackend } from "../core/rendererBackend";
import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  getEpicycleSteps,
  projectSeriesToVerticalAxis,
} from "../math/fourier";
import {
  getResidueBloomVisualResponse,
  type ResidueBloomVisualResponse,
} from "./residueBloomVisualResponse";
import { getCoronaPresentation, getPhraseColorHex } from "./residueBloomScoreOverlay";
import type {
  FrameContext,
  PatternScene,
  PatternSceneOptions,
  QualityLevel,
  Viewport,
} from "./types";

const PALETTE = [0x78f3ff, 0x8ac8ff, 0xa798ff, 0xe59aff, 0xffc782, 0xc8fff3] as const;
const TWO_PI = Math.PI * 2;
const BURST_SLOT_COUNT = 4;
const BURST_PARTICLES_PER_SLOT = 96;
const BURST_PARTICLE_COUNT = BURST_SLOT_COUNT * BURST_PARTICLES_PER_SLOT;
const RESIDUE_BLOOM_AMPLITUDE_BOUND = RESIDUE_BLOOM_SERIES.terms.reduce(
  (sum, term) => sum + term.amplitude,
  0,
);

interface DynamicLine {
  line: THREE.Line;
  positions: Float32Array;
}

interface AtmosphereLayer {
  mesh: THREE.Mesh;
  scaleX: number;
  scaleY: number;
}

type SceneRenderer = THREE.WebGPURenderer | WebGLRenderer;

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

function createStarField(
  random: () => number,
  count: number,
  spanX: number,
  spanY: number,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const radiusBias = Math.pow(random(), 0.62);
    positions[index * 3] = (random() - 0.5) * spanX * radiusBias;
    positions[index * 3 + 1] = (random() - 0.5) * spanY;
    positions[index * 3 + 2] = -2 - random() * 8;

    color.setHex(PALETTE[Math.floor(random() * PALETTE.length)] ?? 0xffffff);
    const brightness = 0.22 + random() * 0.78;
    colors[index * 3] = color.r * brightness;
    colors[index * 3 + 1] = color.g * brightness;
    colors[index * 3 + 2] = color.b * brightness;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.025,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
}

function createAtmosphereMaterial(
  cyan: readonly [number, number, number],
  violet: readonly [number, number, number],
  phase: number,
  sceneTime: THREE.UniformNode<"float", number>,
  scoreEnergy: THREE.UniformNode<"float", number>,
  scoreWarmth: THREE.UniformNode<"float", number>,
): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  material.colorNode = Fn(() => {
    const centered = uv().sub(vec2(0.5, 0.5));
    const distance = length(centered.mul(vec2(1.0, 1.45)));
    const displacedDistance = distance.add(scoreEnergy.mul(0.018));
    const rings = sin(displacedDistance.mul(42).sub(sceneTime.mul(0.27)).add(float(phase)))
      .mul(0.5)
      .add(0.5);
    const veil = float(1).sub(smoothstep(0.02, 0.68, displacedDistance));
    const baseTone = mix(vec3(...cyan), vec3(...violet), rings);
    const tone = mix(baseTone, vec3(1, 0.58, 0.24), scoreWarmth.mul(0.24));
    const alpha = veil.mul(rings.mul(0.055).add(0.018).add(scoreEnergy.mul(0.12)));
    return vec4(tone, alpha);
  })();

  return material;
}

function smoothstepNumber(edge0: number, edge1: number, value: number): number {
  const normalized = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return normalized * normalized * (3 - 2 * normalized);
}

function createFallbackAtmosphereMaterial(
  cyan: readonly [number, number, number],
  violet: readonly [number, number, number],
  phase: number,
): THREE.MeshBasicMaterial {
  const size = 384;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(...cyan),
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
  }

  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const centeredX = x / (size - 1) - 0.5;
      const centeredY = (y / (size - 1) - 0.5) * 1.45;
      const distance = Math.hypot(centeredX, centeredY);
      const rings = Math.sin(distance * 42 + phase) * 0.5 + 0.5;
      const veil = 1 - smoothstepNumber(0.02, 0.68, distance);
      const alpha = veil * (rings * 0.095 + 0.035);
      const offset = (y * size + x) * 4;
      image.data[offset] = Math.round((cyan[0] * (1 - rings) + violet[0] * rings) * 255);
      image.data[offset + 1] = Math.round((cyan[1] * (1 - rings) + violet[1] * rings) * 255);
      image.data[offset + 2] = Math.round((cyan[2] * (1 - rings) + violet[2] * rings) * 255);
      image.data[offset + 3] = Math.round(alpha * 255);
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

class ResidueBloomScene implements PatternScene {
  private readonly renderer: SceneRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly renderPipeline: THREE.RenderPipeline | null;
  private readonly bloomNode: ReturnType<typeof bloom> | null;
  private readonly backend: RendererBackend;
  private readonly random: () => number;
  private readonly sceneTime = uniform(0);
  private readonly scoreEnergy = uniform(0);
  private readonly scoreWarmth = uniform(0);
  private readonly epicycleGroup = new THREE.Group();
  private readonly atmosphereGroup = new THREE.Group();
  private readonly fieldGroup = new THREE.Group();
  private readonly atmosphereLayers: AtmosphereLayer[] = [];
  private readonly circles: THREE.Line[] = [];
  private readonly coronas: THREE.Line[] = [];
  private readonly spokes: DynamicLine;
  private readonly spokeNodePositions = new Float32Array(14 * 3);
  private readonly spokeNodes: THREE.Points;
  private readonly waveLines: DynamicLine[] = [];
  private readonly organicLines: DynamicLine[] = [];
  private readonly particleCloud: THREE.Points;
  private readonly particleBase: Float32Array;
  private readonly burstParticles: THREE.Points;
  private readonly burstPositions: Float32Array;
  private readonly burstColors: Float32Array;
  private readonly stars: THREE.Points[] = [];
  private readonly endpointCore: THREE.Mesh;
  private readonly endpointHalo: THREE.Mesh;
  private readonly connector: DynamicLine;
  private quality: QualityLevel = "high";
  private viewport: Viewport = {
    width: 1,
    height: 1,
    pixelRatio: 1,
  };

  private constructor(renderer: SceneRenderer, random: () => number, backend: RendererBackend) {
    this.renderer = renderer;
    this.random = random;
    this.backend = backend;
    this.scene.background = new THREE.Color(0x010308);
    this.camera.position.set(0, 0, 20);
    this.camera.near = 0.01;
    this.camera.far = 80;

    this.createAtmosphere();
    this.createStars();
    this.createEpicycles();

    this.spokes = makeLine(14, 0xd6f8ff, 0.48);
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
        index === 0 ? 0.92 : 0.055 + (8 - index) * 0.012,
      );
      this.waveLines.push(wave);
      this.fieldGroup.add(wave.line);
    }

    for (let index = 0; index < 11; index += 1) {
      const organic = makeLine(
        460,
        PALETTE[(index + 2) % PALETTE.length] ?? 0xffffff,
        0.035 + (index % 4) * 0.012,
        true,
      );
      this.organicLines.push(organic);
      this.atmosphereGroup.add(organic.line);
    }

    this.connector = makeLine(2, 0xbef9ff, 0.27);
    (this.connector.line.material as THREE.LineBasicMaterial).transparent = true;
    this.scene.add(this.connector.line);

    const particleData = this.createFlowParticles(7_200);
    this.particleCloud = particleData.points;
    this.particleBase = particleData.base;
    this.atmosphereGroup.add(this.particleCloud);

    const burstData = this.createBurstParticles();
    this.burstParticles = burstData.points;
    this.burstPositions = burstData.positions;
    this.burstColors = burstData.colors;
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
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.scene.add(this.endpointHalo, this.endpointCore);

    this.scene.add(this.atmosphereGroup, this.fieldGroup, this.epicycleGroup);

    if (backend === "webgpu") {
      const scenePass = pass(this.scene, this.camera);
      const sceneColor = scenePass.getTextureNode("output");
      this.bloomNode = bloom(sceneColor, 0.72, 0.32, 0.17);
      this.renderPipeline = new THREE.RenderPipeline(renderer as THREE.WebGPURenderer);
      this.renderPipeline.outputNode = sceneColor.add(this.bloomNode);
    } else {
      this.bloomNode = null;
      this.renderPipeline = null;
    }
  }

  static async create({
    canvas,
    seed,
    onDeviceLost,
  }: PatternSceneOptions): Promise<ResidueBloomScene> {
    const forceWebGL = new URLSearchParams(window.location.search).get("renderer") === "webgl";
    const backend = selectRendererBackend(forceWebGL, "gpu" in navigator);

    if (backend === "webgl") {
      const { WebGLRenderer } = await import("three");
      const renderer = new WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.13;
      return new ResidueBloomScene(renderer, createSeededRandom(seed), backend);
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
    await renderer.init();

    return new ResidueBloomScene(renderer, createSeededRandom(seed), backend);
  }

  update(frame: FrameContext): void {
    const timeValue = frame.time;
    const response = getResidueBloomVisualResponse(frame.score);
    this.sceneTime.value = timeValue;
    this.scoreEnergy.value = response.membraneDisplacement;
    this.scoreWarmth.value = response.warmth;
    const angle = timeValue * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE;
    const aspect = this.viewport.width / this.viewport.height;
    const epicycleScale = aspect < 1.6 ? 0.49 : 0.54;
    const centerX = aspect < 1.6 ? -4.9 : -5.9;
    const centerY = 0.35;
    const steps = getEpicycleSteps(RESIDUE_BLOOM_SERIES, angle);

    this.epicycleGroup.position.set(centerX, centerY, 0.7);
    this.updateEpicycles(steps, epicycleScale, response, frame.score.event.phraseIndex);

    const endpoint = steps.at(-1);
    const endpointX = centerX + (endpoint?.x ?? 0) * epicycleScale;
    const endpointY = centerY + (endpoint?.y ?? 0) * epicycleScale;
    this.endpointCore.position.set(endpointX, endpointY, 1.4);
    this.endpointHalo.position.set(endpointX, endpointY, 1.3);
    this.endpointHalo.scale.setScalar(
      this.backend === "webgl" ? response.haloScale * 1.08 : response.haloScale,
    );
    (this.endpointHalo.material as THREE.MeshBasicMaterial).opacity =
      this.backend === "webgl" ? Math.min(0.48, response.haloOpacity * 1.35) : response.haloOpacity;

    const waveStart = aspect < 1.6 ? 1.6 : 1.1;
    this.updateConnector(endpointX, endpointY, waveStart);
    this.updateWaves(timeValue, centerY, waveStart, epicycleScale);
    this.updateOrganicField(timeValue, endpointX, endpointY, response);
    this.updateFlowParticles(timeValue, endpointX, endpointY, response);
    this.updateBurstParticles(frame, response, centerX, centerY, epicycleScale);
    this.updateAtmosphereResponse(response);

    this.atmosphereGroup.rotation.z = Math.sin(timeValue * 0.027) * 0.025;
    this.stars[0]!.rotation.z = timeValue * 0.0018;
    this.stars[1]!.rotation.z = -timeValue * 0.0011;
    this.fieldGroup.position.y = Math.sin(timeValue * 0.037) * 0.12;

    if (this.bloomNode) {
      const baseStrength = this.quality === "low" ? 0.48 : this.quality === "medium" ? 0.58 : 0.72;
      this.bloomNode.strength.value = Math.min(0.9, baseStrength + response.bloomBoost);
    }

    if (this.renderPipeline) {
      this.renderPipeline.render();
    } else {
      (this.renderer as WebGLRenderer).render(this.scene, this.camera);
    }
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
    this.renderer.setPixelRatio(viewport.pixelRatio);
    this.renderer.setSize(viewport.width, viewport.height, false);
  }

  setQuality(level: QualityLevel): void {
    this.quality = level;
    this.particleCloud.geometry.setDrawRange(0, this.getQualityMaximum());
    if (this.bloomNode) {
      this.bloomNode.strength.value = level === "low" ? 0.48 : level === "medium" ? 0.58 : 0.72;
    }
    this.organicLines.forEach((line, index) => {
      line.line.visible = level === "low" ? index < 5 : level === "medium" ? index < 8 : true;
    });
  }

  dispose(): void {
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
    this.renderPipeline?.dispose();
    this.renderer.dispose();
  }

  private createAtmosphere(): void {
    const veils = [
      {
        colorA: [0.05, 0.88, 1] as const,
        colorB: [0.48, 0.2, 1] as const,
        scale: [1.24, 0.92] as const,
        rotation: -0.1,
        phase: 0,
      },
      {
        colorA: [0.22, 0.55, 1] as const,
        colorB: [1, 0.42, 0.63] as const,
        scale: [0.94, 1.2] as const,
        rotation: 0.38,
        phase: 2.1,
      },
      {
        colorA: [0.18, 1, 0.76] as const,
        colorB: [1, 0.66, 0.28] as const,
        scale: [1.08, 0.74] as const,
        rotation: -0.52,
        phase: 4.2,
      },
    ];

    veils.forEach((veil, index) => {
      const material =
        this.backend === "webgpu"
          ? createAtmosphereMaterial(
              veil.colorA,
              veil.colorB,
              veil.phase,
              this.sceneTime,
              this.scoreEnergy,
              this.scoreWarmth,
            )
          : createFallbackAtmosphereMaterial(veil.colorA, veil.colorB, veil.phase);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(28, 17, 1, 1), material);
      mesh.scale.set(veil.scale[0], veil.scale[1], 1);
      mesh.rotation.z = veil.rotation;
      mesh.position.set(index * 1.8 - 2.4, index * -0.8 + 0.7, -4 - index);
      this.atmosphereLayers.push({
        mesh,
        scaleX: veil.scale[0],
        scaleY: veil.scale[1],
      });
      this.atmosphereGroup.add(mesh);
    });
  }

  private createStars(): void {
    const far = createStarField(this.random, 5_200, 39, 23);
    const near = createStarField(this.random, 2_600, 34, 20);
    (near.material as THREE.PointsMaterial).size = 0.044;
    (near.material as THREE.PointsMaterial).opacity = 0.42;
    near.position.z = 2;
    this.stars.push(far, near);
    this.scene.add(far, near);
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
        opacity: Math.max(0.12, 0.58 - index * 0.032),
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
        size: 0.034,
        transparent: true,
        opacity: 0.64,
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
      coronaMaterial.opacity = presentation.opacity;
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
    spokeNodeMaterial.opacity = response.spokeNodeOpacity;
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
        const historyAngle =
          (timeValue - progress * 8.6 - delay) * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE;
        const offset = index * 3;
        wave.positions[offset] = waveStart + progress * lengthValue + trailIndex * 0.018;
        wave.positions[offset + 1] =
          projectSeriesToVerticalAxis(RESIDUE_BLOOM_SERIES, historyAngle, centerY, scale) +
          (trailIndex === 0 ? 0 : Math.sin(progress * 21 + timeValue * 0.22) * trailIndex * 0.012);
        wave.positions[offset + 2] = 0.25 - trailIndex * 0.028;
      }
      updateAttribute(wave);
    });
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
    frame: FrameContext,
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

  private updateAtmosphereResponse(response: ResidueBloomVisualResponse): void {
    if (this.backend !== "webgl") return;

    const scaleBoost = 1 + response.membraneDisplacement * 0.08;
    for (const layer of this.atmosphereLayers) {
      layer.mesh.scale.set(layer.scaleX * scaleBoost, layer.scaleY * scaleBoost, 1);
      (layer.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(
        1,
        0.86 + response.membraneOpacityBoost,
      );
    }
  }

  private getQualityMaximum(): number {
    const drawCounts: Record<QualityLevel, number> = {
      low: 2_400,
      medium: 4_200,
      high: 5_800,
      ultra: 7_200,
    };
    return drawCounts[this.quality];
  }
}

export async function createResidueBloomScene(options: PatternSceneOptions): Promise<PatternScene> {
  return ResidueBloomScene.create(options);
}
