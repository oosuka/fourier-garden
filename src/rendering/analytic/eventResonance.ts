import * as THREE from "three/webgpu";
import type { PikoScoreProgram, PikoTimbreProfile } from "../../audio/pikoProgram";
import type { RendererBackend } from "../../core/rendererBackend";
import { createPikoEventField, type PikoVisualVoice } from "../../experience/pikoEventField";
import { createPoints } from "./primitives";

type MaterialGesture = "spark" | "ripple" | "string" | "ember" | "rain" | "veil" | "orbit";
interface ResonanceDesign {
  gesture: MaterialGesture;
  colors: readonly [number, number, number];
  timbre: PikoTimbreProfile;
  locate(voice: PikoVisualVoice, time: number, target: THREE.Vector3): void;
}

/** A bounded, local poetic layer. Its cores use the very same finite envelope
 * as the audio processor; the surrounding strokes use labeled visual afterglow.
 * Chapter callbacks locate sources without altering the mathematical geometry.
 */
export function createEventResonance(
  score: PikoScoreProgram,
  backend: RendererBackend,
  design: ResonanceDesign,
) {
  const field = createPikoEventField(score, design.timbre);
  const group = new THREE.Group();
  group.name = "event-resonance";
  group.userData.layer = "poetic-score-response";
  group.userData.gesture = design.gesture;
  const segments = 32;
  const positions = new Float32Array(field.capacity * 3);
  const coreColors = new Float32Array(positions.length);
  const strokes = new Float32Array(field.capacity * segments * 6);
  const strokeColors = new Float32Array(strokes.length);
  const core = createPoints(positions, 0xffffff, 0.19, backend);
  const coreColor = new THREE.BufferAttribute(coreColors, 3);
  core.points.geometry.setAttribute("color", coreColor);
  (core.points.material as THREE.PointsMaterial).vertexColors = true;
  const aura = createPoints(positions, 0xffffff, 0.74, backend);
  aura.points.geometry.setAttribute("color", coreColor);
  (aura.points.material as THREE.PointsMaterial).vertexColors = true;
  (aura.points.material as THREE.PointsMaterial).opacity = 0.12;
  const strokeGeometry = new THREE.BufferGeometry();
  const strokePosition = new THREE.BufferAttribute(strokes, 3);
  const strokeColor = new THREE.BufferAttribute(strokeColors, 3);
  strokeGeometry.setAttribute("position", strokePosition);
  strokeGeometry.setAttribute("color", strokeColor);
  const strokeMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const lines = new THREE.LineSegments(strokeGeometry, strokeMaterial);
  lines.frustumCulled = false;
  group.add(aura.points, lines, core.points);
  const anchor = new THREE.Vector3();
  const colors = design.colors.map((color) => new THREE.Color(color));
  const maximumGain = Math.max(...score.events.map((event) => event.gain), 0.001);
  const beads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 10, 6),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    Math.max(1, field.capacity),
  );
  beads.frustumCulled = false;
  beads.name = "finite-envelope-cores";
  group.add(beads);
  const transform = new THREE.Object3D();
  const beadColor = new THREE.Color();
  const contactColor = new THREE.Color(0xf5ebd4);
  return {
    group,
    update(time: number, reducedMotion: boolean) {
      const frame = field.sample(time);
      group.userData.sourceIndex = frame.focus?.sourceIndex ?? null;
      core.points.geometry.setDrawRange(0, frame.count);
      aura.points.geometry.setDrawRange(0, frame.count);
      strokeGeometry.setDrawRange(0, frame.count * segments * 2);
      beads.count = frame.count;
      for (let index = 0; index < frame.count; index++) {
        const voice = frame.voices[index]!;
        design.locate(voice, time, anchor);
        positions[index * 3] = anchor.x;
        positions[index * 3 + 1] = anchor.y;
        positions[index * 3 + 2] = anchor.z + 0.012;
        const color = colors[voice.event.sourceIndex % colors.length]!;
        const light = Math.sqrt(voice.amplitude / maximumGain) * 2.4;
        transform.position.copy(anchor);
        transform.scale.setScalar(reducedMotion ? 0.045 : 0.02 + 0.05 * Math.sqrt(voice.envelope));
        transform.updateMatrix();
        beads.setMatrixAt(index, transform.matrix);
        beads.setColorAt(
          index,
          beadColor
            .copy(color)
            .lerp(contactColor, Math.min(1, voice.contact * 2))
            .multiplyScalar(light),
        );
        coreColors[index * 3] = color.r * light;
        coreColors[index * 3 + 1] = color.g * light;
        coreColors[index * 3 + 2] = color.b * light;
        const age = voice.ageSeconds;
        const motionAge = reducedMotion ? 0 : age;
        const radius = reducedMotion
          ? 0.06
          : 0.06 + age * (0.35 + voice.event.frequencyHz / 1800) + voice.contact * 0.12;
        const tail = Math.sqrt(voice.event.gain / maximumGain) * voice.afterglow;
        for (let segment = 0; segment < segments; segment++) {
          for (let endpoint = 0; endpoint < 2; endpoint++) {
            const unit = (segment + endpoint) / segments;
            const angle = unit * Math.PI * 2;
            let x = Math.cos(angle) * radius;
            let y = Math.sin(angle) * radius;
            let z = 0;
            switch (design.gesture) {
              case "spark": {
                const rays = Math.floor(unit * 8);
                const reach = ((unit * 8) % 1) * radius;
                x = Math.cos((rays * Math.PI) / 4) * reach;
                y = Math.sin((rays * Math.PI) / 4) * reach;
                break;
              }
              case "ripple":
                z = Math.sin(angle * 3 + motionAge * 4) * radius * 0.04;
                break;
              case "string":
                x = (unit - 0.5) * radius * 5;
                y = Math.sin(angle * 2) * radius * 0.1;
                break;
              case "ember":
                x *= 0.35;
                y = unit * radius * 3;
                z = Math.sin(angle) * radius * 0.3;
                break;
              case "rain":
                x = Math.sin(angle) * radius * 0.12;
                y = -unit * radius * 4;
                break;
              case "veil":
                x = (unit - 0.5) * radius * 4;
                y = Math.sin(angle * 2) * radius * 0.4;
                z = unit * radius;
                break;
              case "orbit":
                y *= 0.32;
                z = Math.sin(angle) * radius * 0.82;
                break;
            }
            const offset = (index * segments * 2 + segment * 2 + endpoint) * 3;
            strokes[offset] = anchor.x + x;
            strokes[offset + 1] = anchor.y + y;
            strokes[offset + 2] = anchor.z + z + 0.025;
            const density = tail * (0.24 + 0.76 * Math.sin(Math.PI * unit) ** 2);
            strokeColors[offset] = color.r * density;
            strokeColors[offset + 1] = color.g * density;
            strokeColors[offset + 2] = color.b * density;
          }
        }
      }
      core.attribute.needsUpdate = true;
      aura.attribute.needsUpdate = true;
      coreColor.needsUpdate = true;
      strokePosition.needsUpdate = true;
      strokeColor.needsUpdate = true;
      beads.instanceMatrix.needsUpdate = true;
      if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
      return frame;
    },
  };
}
