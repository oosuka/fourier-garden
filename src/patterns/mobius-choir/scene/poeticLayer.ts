import * as THREE from "three";

import type { RendererBackend } from "../../../core/rendererBackend";
import { MOBIUS_CHOIR_DEFINITION, mapMobiusChoirEmbedding } from "../math/model";
import {
  MOBIUS_CHOIR_ATMOSPHERE_PARTICLES,
  MOBIUS_CHOIR_SURFACE_PARTICLES,
  type MobiusChoirPoeticModel,
  getMobiusChoirPoeticQuality,
  updateMobiusChoirParticles,
} from "./poetic";
import { evaluateMobiusChoirVisualFrame } from "./visualResponse";
import type { QualityLevel } from "../../contracts";

export interface MobiusChoirPoeticLayerStats {
  particles: number;
  surfaceParticles: number;
  atmosphereParticles: number;
  panoramaParticles: number;
  ribbons: number;
  trailLayers: number;
  halos: number;
  atmosphereLayers: number;
}

export interface MobiusChoirParticleStyle {
  size: number;
  opacity: number;
}

const MAX_TRAIL_LAYERS = 3;

export function getMobiusChoirParticleStyle(backend: RendererBackend): MobiusChoirParticleStyle {
  return backend === "webgl" ? { size: 0.022, opacity: 0.56 } : { size: 0.028, opacity: 0.62 };
}

function createAtmosphereShell(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(12, 48, 24);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index) / 12;
    const y = positions.getY(index) / 12;
    const z = positions.getZ(index) / 12;
    const violet = 0.5 + 0.5 * Math.sin(x * 3.1 + z * 2.3);
    const cyan = 0.5 + 0.5 * Math.sin(y * 3.7 - x * 1.9);
    colors[index * 3] = 0.003 + violet * 0.009;
    colors[index * 3 + 1] = 0.004 + cyan * 0.014;
    colors[index * 3 + 2] = 0.012 + violet * 0.025 + cyan * 0.012;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

function createHaloTexture(): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const x = (column / (size - 1)) * 2 - 1;
      const y = (row / (size - 1)) * 2 - 1;
      const alpha = Math.max(0, 1 - Math.hypot(x, y)) ** 2.6;
      const offset = (row * size + column) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createSeamPositions(): Float32Array {
  const count = 96;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const point = mapMobiusChoirEmbedding((Math.PI * index) / (count - 1), 0);
    positions[index * 3] = point.x;
    positions[index * 3 + 1] = point.y;
    positions[index * 3 + 2] = point.z;
  }
  return positions;
}

export class MobiusChoirPoeticLayer {
  readonly group = new THREE.Group();

  private readonly model: MobiusChoirPoeticModel;
  private readonly surfaceParticles: THREE.Points;
  private readonly atmosphereParticles: THREE.Points;
  private readonly panoramaParticles: THREE.Points;
  private readonly surfaceParticleAttribute: THREE.BufferAttribute;
  private readonly atmosphereParticleAttribute: THREE.BufferAttribute;
  private readonly panoramaParticleAttribute: THREE.BufferAttribute;
  private readonly panoramaMaterial: THREE.PointsMaterial;
  private readonly panoramaBaseSize: number;
  private readonly atmosphere = createAtmosphereShell();
  private readonly haloTexture = createHaloTexture();
  private readonly haloGeometry = new THREE.PlaneGeometry(1.15, 1.15);
  private readonly halos = new THREE.Group();
  private readonly haloGroups: THREE.Group[] = [];
  private readonly haloMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly ribbons = new THREE.Group();
  private readonly ribbonLines: THREE.Line[] = [];
  private readonly trails = new THREE.Group();
  private readonly trailLines: THREE.Line[] = [];
  private quality: QualityLevel = "high";
  private disposed = false;

  constructor(model: MobiusChoirPoeticModel, backend: RendererBackend) {
    this.model = model;
    const style = getMobiusChoirParticleStyle(backend);
    const surfaceGeometry = new THREE.BufferGeometry();
    this.surfaceParticleAttribute = new THREE.BufferAttribute(
      model.particlePositions.subarray(0, MOBIUS_CHOIR_SURFACE_PARTICLES * 3),
      3,
    );
    this.surfaceParticleAttribute.setUsage(THREE.DynamicDrawUsage);
    surfaceGeometry.setAttribute("position", this.surfaceParticleAttribute);
    surfaceGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        model.particleColors.subarray(0, MOBIUS_CHOIR_SURFACE_PARTICLES * 3),
        3,
      ),
    );
    surfaceGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5.2);
    const surfaceMaterial = new THREE.PointsMaterial({
      size: style.size,
      opacity: style.opacity,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      sizeAttenuation: true,
    });
    this.surfaceParticles = new THREE.Points(surfaceGeometry, surfaceMaterial);
    this.surfaceParticles.frustumCulled = false;
    this.surfaceParticles.renderOrder = 4;

    const atmosphereGeometry = new THREE.BufferGeometry();
    this.atmosphereParticleAttribute = new THREE.BufferAttribute(
      model.particlePositions.subarray(
        MOBIUS_CHOIR_SURFACE_PARTICLES * 3,
        (MOBIUS_CHOIR_SURFACE_PARTICLES + MOBIUS_CHOIR_ATMOSPHERE_PARTICLES) * 3,
      ),
      3,
    );
    this.atmosphereParticleAttribute.setUsage(THREE.DynamicDrawUsage);
    atmosphereGeometry.setAttribute("position", this.atmosphereParticleAttribute);
    atmosphereGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        model.particleColors.subarray(
          MOBIUS_CHOIR_SURFACE_PARTICLES * 3,
          (MOBIUS_CHOIR_SURFACE_PARTICLES + MOBIUS_CHOIR_ATMOSPHERE_PARTICLES) * 3,
        ),
        3,
      ),
    );
    atmosphereGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6.4);
    const atmosphereMaterial = new THREE.PointsMaterial({
      size: style.size * 0.72,
      opacity: style.opacity * 0.68,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      sizeAttenuation: true,
    });
    this.atmosphereParticles = new THREE.Points(atmosphereGeometry, atmosphereMaterial);
    this.atmosphereParticles.frustumCulled = false;
    this.atmosphereParticles.renderOrder = 1;

    const panoramaOffset = (MOBIUS_CHOIR_SURFACE_PARTICLES + MOBIUS_CHOIR_ATMOSPHERE_PARTICLES) * 3;
    const panoramaGeometry = new THREE.BufferGeometry();
    this.panoramaParticleAttribute = new THREE.BufferAttribute(
      model.particlePositions.subarray(panoramaOffset),
      3,
    );
    this.panoramaParticleAttribute.setUsage(THREE.DynamicDrawUsage);
    panoramaGeometry.setAttribute("position", this.panoramaParticleAttribute);
    panoramaGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(model.particleColors.subarray(panoramaOffset), 3),
    );
    panoramaGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 14);
    this.panoramaMaterial = new THREE.PointsMaterial({
      size: style.size * 0.9,
      opacity: style.opacity * 0.52,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      sizeAttenuation: true,
    });
    this.panoramaBaseSize = style.size * 0.9;
    this.panoramaParticles = new THREE.Points(panoramaGeometry, this.panoramaMaterial);
    this.panoramaParticles.frustumCulled = false;
    this.panoramaParticles.renderOrder = 0;
    const particleRoot = new THREE.Group();
    particleRoot.add(this.panoramaParticles, this.atmosphereParticles, this.surfaceParticles);

    for (const positions of model.ribbonPositions) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({
        color: 0x805eff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const line = new THREE.Line(geometry, material);
      line.frustumCulled = false;
      line.renderOrder = 5;
      this.ribbonLines.push(line);
      this.ribbons.add(line);
    }

    const seamPositions = createSeamPositions();
    for (let index = 0; index < MAX_TRAIL_LAYERS; index += 1) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(seamPositions.slice(), 3));
      const material = new THREE.LineBasicMaterial({
        color: 0x8deaff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const line = new THREE.Line(geometry, material);
      line.scale.setScalar(1 + index * 0.004);
      line.renderOrder = 6 + index;
      this.trailLines.push(line);
      this.trails.add(line);
    }

    for (const [index, mode] of MOBIUS_CHOIR_DEFINITION.modes.entries()) {
      const sourceX = Math.PI / (2 * mode.m);
      const sourceY = (index * Math.PI) / MOBIUS_CHOIR_DEFINITION.modes.length;
      const point = mapMobiusChoirEmbedding(sourceX, sourceY);
      const material = new THREE.MeshBasicMaterial({
        map: this.haloTexture,
        color: new THREE.Color(0.42, 0.3, 1.25),
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const group = new THREE.Group();
      group.position.set(point.x, point.y, point.z);
      const first = new THREE.Mesh(this.haloGeometry, material);
      first.lookAt(0, 0, 0);
      const second = new THREE.Mesh(this.haloGeometry, material);
      second.lookAt(0, 0, 0);
      second.rotation.z += Math.PI / 2;
      group.add(first, second);
      this.haloGroups.push(group);
      this.haloMaterials.push(material);
      this.halos.add(group);
    }

    this.group.add(particleRoot, this.ribbons, this.trails, this.atmosphere, this.halos);
    this.setQuality(this.quality);
    this.update(0);
  }

  setQuality(level: QualityLevel): void {
    if (this.disposed) throw new Error("Möbius Choir poetic layer has been disposed");
    this.quality = level;
    const quality = getMobiusChoirPoeticQuality(level);
    this.surfaceParticles.geometry.setDrawRange(0, quality.surfaceParticleCount);
    this.atmosphereParticles.geometry.setDrawRange(0, quality.atmosphereParticleCount);
    this.panoramaParticles.geometry.setDrawRange(0, quality.panoramaParticleCount);
    this.ribbonLines.forEach((line, index) => {
      line.visible = index < quality.ribbonCount;
    });
    this.trailLines.forEach((line, index) => {
      line.visible = index < quality.trailLayers;
    });
    this.haloGroups.forEach((halo, index) => {
      halo.visible = index < quality.haloCount;
    });
  }

  update(absoluteTimeSeconds: number): void {
    if (this.disposed) throw new Error("Möbius Choir poetic layer has been disposed");
    const quality = getMobiusChoirPoeticQuality(this.quality);
    const frame = evaluateMobiusChoirVisualFrame(absoluteTimeSeconds);
    updateMobiusChoirParticles(
      this.model,
      absoluteTimeSeconds,
      frame.modes.map((mode) => mode.energy),
      frame.modes.map((mode) => mode.mathematicalVelocity),
      quality.particleCount,
    );
    this.surfaceParticleAttribute.needsUpdate = true;
    this.atmosphereParticleAttribute.needsUpdate = true;
    this.panoramaParticleAttribute.needsUpdate = true;
    this.panoramaMaterial.opacity = 0.22 + frame.collectiveEnergy * 0.22;
    this.panoramaMaterial.size = this.panoramaBaseSize * (0.9 + frame.onsetEnergy * 0.55);
    this.ribbonLines.forEach((line, index) => {
      const response = frame.modes[index]!;
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = 0.05 + response.opacity * 0.62;
      material.color.setRGB(
        0.34 + response.cyanRatio * 0.18,
        0.22 + response.cyanRatio * 0.55,
        0.92 + response.cyanRatio * 0.08,
      );
      line.scale.setScalar(1 + response.ribbonWidth * 0.006);
    });
    const seamEnergy = Math.max(...frame.modes.map((mode) => mode.seamAfterglow));
    this.trailLines.forEach((line, index) => {
      (line.material as THREE.LineBasicMaterial).opacity =
        seamEnergy * (0.38 / Math.max(1, index + 1));
    });
    this.haloGroups.forEach((halo, index) => {
      const response = frame.modes[index]!;
      const material = this.haloMaterials[index]!;
      material.opacity = 0.035 + response.opacity * 0.2 + response.seamAfterglow * 0.16;
      material.color.setRGB(
        0.38 + response.cyanRatio * 0.24,
        0.24 + response.cyanRatio * 0.72,
        1.08 + response.energy * 0.38,
      );
      halo.scale.setScalar(0.82 + response.ribbonWidth * 0.78);
      halo.rotation.z = absoluteTimeSeconds * (0.025 + index * 0.003);
    });
    this.atmosphere.rotation.y = absoluteTimeSeconds * (0.006 + frame.collectiveEnergy * 0.008);
    this.atmosphere.rotation.z =
      Math.sin(absoluteTimeSeconds * 0.09) * (0.035 + frame.seamEnergy * 0.035);
    (this.atmosphere.material as THREE.MeshBasicMaterial).opacity =
      0.62 + frame.collectiveEnergy * 0.18;
  }

  getStats(): MobiusChoirPoeticLayerStats {
    const quality = getMobiusChoirPoeticQuality(this.quality);
    return {
      particles: quality.particleCount,
      surfaceParticles: quality.surfaceParticleCount,
      atmosphereParticles: quality.atmosphereParticleCount,
      panoramaParticles: quality.panoramaParticleCount,
      ribbons: quality.ribbonCount,
      trailLayers: quality.trailLayers,
      halos: quality.haloCount,
      atmosphereLayers: 1,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.surfaceParticles.geometry.dispose();
    (this.surfaceParticles.material as THREE.Material).dispose();
    this.atmosphereParticles.geometry.dispose();
    (this.atmosphereParticles.material as THREE.Material).dispose();
    this.panoramaParticles.geometry.dispose();
    this.panoramaMaterial.dispose();
    this.atmosphere.geometry.dispose();
    (this.atmosphere.material as THREE.Material).dispose();
    this.haloGeometry.dispose();
    this.haloTexture.dispose();
    for (const material of this.haloMaterials) material.dispose();
    for (const line of [...this.ribbonLines, ...this.trailLines]) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.group.clear();
  }
}
