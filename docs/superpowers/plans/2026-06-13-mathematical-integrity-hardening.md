# Mathematical Integrity Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the exact `Residue Bloom` Fourier series and current audiovisual quality while making phasor-derived score controls correct for every 144-second cycle, fixing spectrum/audio display inaccuracies, applying the Nyquist guard after stereo detune, and preventing the same mistakes in future chapters.

**Architecture:** Separate the 144-second repeating musical form from phasor values evaluated at absolute event time. Keep only repeatable musical data in `MusicalScoreEvent`, derive `EvaluatedMusicalScoreEvent` from a serializable phasor mapping at runtime, and enforce the time/spectrum/rendering conventions through pattern-definition validation. Use pure helpers for spectrum layout and audio display states so UI labels and coordinates share one tested contract.

**Tech Stack:** TypeScript 6, React 19, Three.js r184, Web Audio API, AudioWorklet, Vitest, Vite 8, Oxlint, Biome.

---

## Non-Negotiable Invariants

Do not change:

```math
f(x)=5\sum_{k=0}^{12}\frac{1}{k+1}\sin((4k+1)x)
```

```math
n_k=4k+1,\qquad A_k=\frac{5}{k+1},\qquad
z(x)=\sum_{k=0}^{12}A_ke^{in_kx}
```

```math
f(x)=\operatorname{Im}z(x),\qquad x(t)=0.31t
```

Also preserve:

- 13 terms and sine phase zero
- the two-sided complex coefficients
- the exact epicycle endpoint and primary waveform projection
- 80 BPM, 4/4, 48 bars, and the 144-second musical form
- carrier order `9f₀, 8f₀, 8f₀, 9f₀`
- baseline perceptual weighting `A_k/(k+1)^1.4`
- stereo detune ratio `0.00125`
- generated reverb, EQ, compressor, and overall sound direction
- WebGPU and forced WebGL2 support

The score form repeats every 144 seconds. Mathematical time does not wrap with the score.

## File and Responsibility Map

Create:

- `src/patterns/validatePatternDefinition.ts`
  - Validates formula, terms, absolute visual time, spectrum convention, score phasor mapping, and forbidden repeat-event fields.
- `src/patterns/validatePatternDefinition.test.ts`
  - Rejects future chapter definitions that violate the mathematical provenance contract.
- `src/components/dataCanvasModel.ts`
  - Owns logarithmic spectrum positions, one-sided sine-amplitude bar heights, tick labels, and audio-waveform display mode.
- `src/components/dataCanvasModel.test.ts`
  - Verifies spectrum bars and ticks share one axis and uninitialized audio has no mathematical fallback.
- `src/audio/workletContract.test.ts`
  - Guards the plain JavaScript AudioWorklet against reintroducing stored phasor controls, nominal-only band limiting, or per-sample phasor recomputation.

Modify:

- `src/audio/musicalScore.ts`
  - Split repeatable events from absolute-time evaluated events and reconstruct previous-cycle recent impulses correctly.
- `src/audio/musicalScore.test.ts`
  - Add two-cycle, loop-boundary, and repeat-table ownership tests.
- `src/audio/synthesis.ts`
  - Expose detuned left/right frequencies and apply the guard to their maximum.
- `src/audio/synthesis.test.ts`
  - Add detune-aware sample-rate tests and retain source-weighting/peak tests.
- `public/audio/fourier-worklet.js`
  - Evaluate phasor controls from absolute event time once per event/cycle and apply detune-aware band limiting.
- `src/audio/AudioEngine.ts`
  - Increment the worklet module version after changing the worklet contract.
- `src/patterns/types.ts`
  - Add explicit absolute visual-time, analytic spectrum, and sampled-polyline provenance types.
- `src/patterns/registry.ts`
  - Declare the strengthened provenance and validate the pattern at registration.
- `src/patterns/registry.test.ts`
  - Verify the new provenance and score mapping.
- `src/patterns/residueBloomVisualResponse.test.ts`
  - Verify later cycles use absolute-time evaluated controls.
- `src/patterns/residueBloomScene.ts`
  - Consume the evaluated event shape without changing exact mathematical coordinates.
- `src/components/DataCanvas.tsx`
  - Use the shared logarithmic axis and show only real analyser data in the audio-output canvas.
- `src/components/DetailsPanel.tsx`
  - Use precise frequency-reference, amplitude, stereo-sonification, and sampled-rendering language.
- `src/App.tsx`
  - Remove the now-unused `playing` prop from the details panel and identify main-screen frequency annotations as analytic-spectrum mappings.
- `src/styles.css`
  - Position frequency ticks by tested logarithmic percentages and style the waiting audio state.
- `AGENTS.md`
  - Add permanent constraints for absolute mathematical time, repeating score data, detune-aware guards, spectrum conventions, and numerical-rendering language.
- `README.md`
  - Explain the corrected time and display conventions.
- `docs/mathematical-model.md`
  - Define the three time quantities and the actual stereo sonification formula.
- `design-qa.md`
  - Correct prior wording and record two-cycle browser observations.

Do not add dependencies or change `package-lock.json`.

---

### Task 1: Separate repeating score events from absolute-time phasor evaluation

**Files:**
- Modify: `src/audio/musicalScore.ts`
- Modify: `src/audio/musicalScore.test.ts`
- Modify: `src/audio/synthesis.ts`
- Modify: `src/audio/synthesis.test.ts`
- Modify: `src/patterns/registry.test.ts`
- Modify: `src/patterns/residueBloomVisualResponse.test.ts`

- [ ] **Step 1: Write failing tests that expose the second-cycle error**

Merge `evaluateScoreEvent` and `MusicalScoreEvent` into the existing named
import from `./musicalScore`:

```ts
import {
  evaluateScoreEvent,
  type MusicalScoreEvent,
} from "./musicalScore";
```

Replace the existing cycle-equivalence assertion with tests that distinguish repeating form from absolute phasor state:

```ts
it("repeats musical form without storing phasor results in the event table", () => {
  const program = createProgram();
  const event = program.events[0] as MusicalScoreEvent & Record<string, unknown>;

  expect(event).not.toHaveProperty("normalizedPhasorX");
  expect(event).not.toHaveProperty("normalizedPhasorY");
  expect(event).not.toHaveProperty("normalizedPhasorRadius");
  expect(event).not.toHaveProperty("brightness");
  expect(event).not.toHaveProperty("accent");
  expect(event).toMatchObject({
    baseGain: expect.any(Number),
    baseBrightness: expect.any(Number),
    baseAccent: expect.any(Number),
  });
});

it("evaluates the same musical step from each cycle at its absolute event time", () => {
  const program = createProgram();
  const first = evaluateMusicalScore(program, 0.02);
  const second = evaluateMusicalScore(program, program.cycleSeconds + 0.02);
  const expectedSecondEndpoint = evaluateEpicycle(
    RESIDUE_BLOOM_SERIES,
    program.cycleSeconds * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  );

  expect(second.globalStep).toBe(first.globalStep);
  expect(second.event.carrierHz).toBe(first.event.carrierHz);
  expect(second.event.absoluteTimeSeconds).toBeCloseTo(program.cycleSeconds, 12);
  expect(second.event.normalizedPhasorX).toBeCloseTo(
    expectedSecondEndpoint.x / program.phasorMapping.amplitudeBound,
    12,
  );
  expect(second.event.normalizedPhasorY).toBeCloseTo(
    expectedSecondEndpoint.y / program.phasorMapping.amplitudeBound,
    12,
  );
  expect(second.event.normalizedPhasorX).not.toBeCloseTo(
    first.event.normalizedPhasorX,
    4,
  );
});

it("does not reset the event phasor to z(0) at 144 seconds", () => {
  const program = createProgram();
  const frame = evaluateMusicalScore(program, 144.02);

  expect(frame.event.absoluteTimeSeconds).toBeCloseTo(144, 12);
  expect(frame.event.normalizedPhasorX).not.toBeCloseTo(1, 4);
  expect(frame.event.normalizedPhasorY).not.toBeCloseTo(0, 4);
});
```

Add loop-history tests:

```ts
it("evaluates a wrapped recent impulse in the cycle where it occurred", () => {
  const program = createProgram();
  const frame = evaluateMusicalScore(program, 144);
  const previousCycleEvent = frame.recentImpulses.find(
    (impulse) => impulse.event.globalStep === 764,
  );
  const expectedTime = 143.25;
  const expectedEndpoint = evaluateEpicycle(
    RESIDUE_BLOOM_SERIES,
    expectedTime * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  );

  expect(previousCycleEvent?.event.absoluteTimeSeconds).toBeCloseTo(expectedTime, 12);
  expect(previousCycleEvent?.event.normalizedPhasorX).toBeCloseTo(
    expectedEndpoint.x / program.phasorMapping.amplitudeBound,
    12,
  );
});

it("does not invent impulses before transport time zero", () => {
  const frame = evaluateMusicalScore(createProgram(), 0.01);

  expect(
    frame.recentImpulses.every((impulse) => impulse.event.absoluteTimeSeconds >= 0),
  ).toBe(true);
});
```

Replace the existing event-table phasor test with an evaluated-event test:

```ts
it("evaluates exact phasor metadata at an event absolute time", () => {
  const program = createProgram();
  const amplitudeBound = RESIDUE_BLOOM_SERIES.terms.reduce(
    (sum, term) => sum + term.amplitude,
    0,
  );
  const baseEvent = program.events.find(
    (candidate) => candidate.active && candidate.globalStep > 20,
  )!;
  const event = evaluateScoreEvent(program, baseEvent, 0);
  const endpoint = evaluateEpicycle(
    RESIDUE_BLOOM_SERIES,
    event.absoluteTimeSeconds * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  );

  expect(program.phasorMapping.amplitudeBound).toBeCloseTo(
    amplitudeBound,
    12,
  );
  expect(event.normalizedPhasorX).toBeCloseTo(
    endpoint.x / amplitudeBound,
    12,
  );
  expect(event.normalizedPhasorY).toBeCloseTo(
    endpoint.y / amplitudeBound,
    12,
  );
  expect(event.normalizedPhasorRadius).toBeCloseTo(
    Math.hypot(endpoint.x, endpoint.y) / amplitudeBound,
    12,
  );
});
```

Change the bounded-control test to evaluate frames rather than inspecting the
repeat event table:

```ts
for (let step = 0; step < program.totalSteps * 2; step += 1) {
  const frame = evaluateMusicalScore(
    program,
    step * program.stepSeconds + 0.01,
  );
  const event = frame.event;
  expect(event.normalizedPhasorX).toBeGreaterThanOrEqual(-1);
  expect(event.normalizedPhasorX).toBeLessThanOrEqual(1);
  expect(event.normalizedPhasorY).toBeGreaterThanOrEqual(-1);
  expect(event.normalizedPhasorY).toBeLessThanOrEqual(1);
  expect(event.normalizedPhasorRadius).toBeGreaterThanOrEqual(0);
  expect(event.normalizedPhasorRadius).toBeLessThanOrEqual(1);
}
```

Replace the loop-equivalence test in `src/audio/synthesis.test.ts` with:

```ts
it("repeats the musical form while retaining absolute phasor controls", () => {
  const firstTime = 18.25;
  const secondTime = firstTime + score.cycleSeconds;
  const firstFrame = evaluateMusicalScore(score, firstTime);
  const secondFrame = evaluateMusicalScore(score, secondTime);
  const options = {
    durationSeconds: 0.5,
    sampleRate: 48_000,
    score,
  };
  const first = renderRhythmicSeries({
    ...options,
    startTimeSeconds: firstTime,
  });
  const second = renderRhythmicSeries({
    ...options,
    startTimeSeconds: secondTime,
  });

  expect(secondFrame.globalStep).toBe(firstFrame.globalStep);
  expect(secondFrame.event.carrierHz).toBe(firstFrame.event.carrierHz);
  expect(secondFrame.event.normalizedPhasorX).not.toBeCloseTo(
    firstFrame.event.normalizedPhasorX,
    4,
  );
  expect(second).not.toEqual(first);
});
```

In `src/patterns/residueBloomVisualResponse.test.ts`, keep the final-bar return
assertion about the repeatable section profile by comparing:

```ts
finalReturnFrame.event.baseBrightness
introFrame.event.baseBrightness
denseReturnFrame.event.baseBrightness
```

Do not compare the evaluated `brightness` values, because their phasor component
is intentionally absolute-time dependent.

Update the registry score assertion:

```ts
expect(pattern?.audio.score.phasorMapping.visualAngularRate).toBe(
  pattern?.mathematics.visualAngularRate,
);
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
npx vitest run src/audio/musicalScore.test.ts src/audio/synthesis.test.ts src/patterns/registry.test.ts src/patterns/residueBloomVisualResponse.test.ts
```

Expected: FAIL because repeat events still own phasor results and second-cycle evaluation reuses first-cycle values.

- [ ] **Step 3: Introduce explicit repeatable and evaluated event types**

In `src/audio/musicalScore.ts`, define:

```ts
export interface SerializablePhasorMapping {
  visualAngularRate: number;
  amplitudeBound: number;
  terms: readonly {
    harmonic: number;
    amplitude: number;
    sinePhase: number;
  }[];
}

export interface MusicalScoreEvent {
  globalStep: number;
  barIndex: number;
  stepInBar: number;
  section: MusicalSectionId;
  sectionProgress: number;
  active: boolean;
  activeNoteOrdinal: number;
  phraseIndex: 0 | 1 | 2 | 3;
  carrierHz: number;
  baseGain: number;
  baseBrightness: number;
  baseAccent: number;
  wetSend: number;
  stereoSpread: number;
  visualIntensity: number;
}

export interface EvaluatedMusicalScoreEvent extends MusicalScoreEvent {
  absoluteTimeSeconds: number;
  brightness: number;
  accent: number;
  normalizedPhasorX: number;
  normalizedPhasorY: number;
  normalizedPhasorRadius: number;
}
```

Change these contracts:

```ts
export interface MusicalScoreProgram {
  definition: MusicalScoreDefinition;
  fundamentalHz: number;
  stepSeconds: number;
  stepsPerBar: number;
  totalSteps: number;
  cycleSeconds: number;
  phasorMapping: SerializablePhasorMapping;
  events: readonly MusicalScoreEvent[];
}

export interface RecentMusicalImpulse {
  event: EvaluatedMusicalScoreEvent;
  ageSeconds: number;
  impact: number;
  tail: number;
}

export interface MusicalScoreFrame {
  cycleTimeSeconds: number;
  cycleIndex: number;
  globalStep: number;
  localStepTimeSeconds: number;
  event: EvaluatedMusicalScoreEvent;
  noteEnvelope: number;
  visualImpact: number;
  visualTail: number;
  recentImpulses: readonly RecentMusicalImpulse[];
}
```

- [ ] **Step 4: Build only repeatable values into the 768-event table**

Construct the mapping once:

```ts
const phasorMapping: SerializablePhasorMapping = {
  visualAngularRate,
  amplitudeBound: series.terms.reduce(
    (sum, term) => sum + Math.abs(term.amplitude),
    0,
  ),
  terms: series.terms.map((term) => ({
    harmonic: term.harmonic,
    amplitude: term.amplitude,
    sinePhase: term.sinePhase,
  })),
};
```

For each repeat event, return:

```ts
return {
  globalStep,
  barIndex,
  stepInBar,
  section: section.id,
  sectionProgress,
  active,
  activeNoteOrdinal: eventOrdinal,
  phraseIndex,
  carrierHz,
  baseGain: active ? profile.gain : 0,
  baseBrightness: profile.brightness,
  baseAccent: active ? PHRASE_ACCENTS[phraseIndex] * downbeatAccent : 0,
  wetSend: profile.wetSend,
  stereoSpread: profile.stereoSpread,
  visualIntensity: profile.visualIntensity,
};
```

Return `phasorMapping` from the program and remove top-level `visualAngularRate` and `amplitudeBound`.

- [ ] **Step 5: Add a pure absolute-time event evaluator**

Add:

```ts
export function evaluateSerializedPhasor(
  mapping: SerializablePhasorMapping,
  absoluteTimeSeconds: number,
): Readonly<{
  normalizedX: number;
  normalizedY: number;
  normalizedRadius: number;
}> {
  const angle = absoluteTimeSeconds * mapping.visualAngularRate;
  let x = 0;
  let y = 0;

  for (const term of mapping.terms) {
    const phase = term.harmonic * angle + term.sinePhase;
    x += term.amplitude * Math.cos(phase);
    y += term.amplitude * Math.sin(phase);
  }

  return {
    normalizedX: clamp(x / mapping.amplitudeBound, -1, 1),
    normalizedY: clamp(y / mapping.amplitudeBound, -1, 1),
    normalizedRadius: clamp(Math.hypot(x, y) / mapping.amplitudeBound, 0, 1),
  };
}

export function evaluateScoreEvent(
  program: MusicalScoreProgram,
  event: MusicalScoreEvent,
  cycleIndex: number,
): EvaluatedMusicalScoreEvent {
  const absoluteTimeSeconds =
    cycleIndex * program.cycleSeconds + event.globalStep * program.stepSeconds;
  const phasor = evaluateSerializedPhasor(program.phasorMapping, absoluteTimeSeconds);
  const phasorBrightness = (phasor.normalizedY + 1) * 0.5;

  return {
    ...event,
    absoluteTimeSeconds,
    brightness: clamp(event.baseBrightness * 0.72 + phasorBrightness * 0.28, 0, 1),
    accent: event.active
      ? event.baseAccent * (0.9 + phasor.normalizedRadius * 0.2)
      : 0,
    normalizedPhasorX: phasor.normalizedX,
    normalizedPhasorY: phasor.normalizedY,
    normalizedPhasorRadius: phasor.normalizedRadius,
  };
}
```

- [ ] **Step 6: Evaluate current and recent events in the correct cycle**

In `evaluateMusicalScore()`:

```ts
const baseEvent = program.events[globalStep]!;
const event = evaluateScoreEvent(program, baseEvent, cycleIndex);
```

When scanning recent events:

```ts
const eventIndex = positiveModulo(globalStep - stepOffset, program.totalSteps);
const wrappedIntoPreviousCycle = eventIndex > globalStep;
const eventCycleIndex = wrappedIntoPreviousCycle ? cycleIndex - 1 : cycleIndex;
if (eventCycleIndex < 0) continue;

const recentBaseEvent = program.events[eventIndex]!;
if (!recentBaseEvent.active) continue;
const recentEvent = evaluateScoreEvent(program, recentBaseEvent, eventCycleIndex);
```

Use `recentEvent.visualIntensity` directly when calculating impact. Do not call
`getSectionProfile()` during frame evaluation.

- [ ] **Step 7: Keep offline synthesis on absolute transport time**

In `renderRhythmicSeries()`, replace the modulo-reduced start time with:

```ts
const absoluteStartSeconds = Math.max(0, startTimeSeconds);
```

Evaluate each sample with:

```ts
const frame = evaluateMusicalScore(
  score,
  absoluteStartSeconds + sample / sampleRate,
);
```

Use `frame.event.baseGain` instead of `frame.event.gain`. This helper remains a
mono test renderer, but it must preserve the same absolute-time event controls
as the live stereo worklet.

- [ ] **Step 8: Run focused tests and typecheck**

Run:

```bash
npx vitest run src/audio/musicalScore.test.ts src/audio/synthesis.test.ts src/patterns/registry.test.ts src/patterns/residueBloomVisualResponse.test.ts src/patterns/residueBloomScoreOverlay.test.ts
npm run typecheck
```

Expected: PASS. Existing visual code continues to receive evaluated phasor fields through `frame.event`.

- [ ] **Step 9: Commit the score contract correction**

```bash
git add src/audio/musicalScore.ts src/audio/musicalScore.test.ts src/audio/synthesis.ts src/audio/synthesis.test.ts src/patterns/registry.test.ts src/patterns/residueBloomVisualResponse.test.ts
git diff --cached --check
git commit -m "絶対時刻でフェーザ制御を評価"
```

---

### Task 2: Apply the Nyquist guard after stereo detune

**Files:**
- Modify: `src/audio/musicalScore.ts`
- Modify: `src/audio/synthesis.ts`
- Modify: `src/audio/synthesis.test.ts`

- [ ] **Step 1: Write failing detune-aware band-limit tests**

Add `stereoDetuneRatio` to the expected definition in `src/audio/musicalScore.test.ts`:

```ts
expect(program.definition.stereoDetuneRatio).toBeCloseTo(0.00125, 12);
```

Extend `src/audio/synthesis.test.ts`:

```ts
it("applies the anti-alias guard to the louder-side detuned frequency", () => {
  const definition = {
    ...score.definition,
    antiAliasRatio: 0.9,
    stereoDetuneRatio: 0.00125,
  };
  const nominalFrequencyHz = 10_000;
  const sampleRate =
    (nominalFrequencyHz * (1 + definition.stereoDetuneRatio)) /
    (0.5 * definition.antiAliasRatio);
  const components = getSonificationComponents(
    55,
    nominalFrequencyHz,
    sampleRate,
    definition,
  );
  const fundamental = components.find((component) => component.harmonic === 1)!;

  expect(fundamental.nominalFrequencyHz).toBe(nominalFrequencyHz);
  expect(fundamental.rightFrequencyHz).toBeGreaterThanOrEqual(
    sampleRate * 0.5 * definition.antiAliasRatio,
  );
  expect(fundamental.included).toBe(false);
});

it.each([44_100, 48_000, 96_000])(
  "keeps every included detuned component below 0.45 Fs at %i Hz",
  (sampleRate) => {
    for (const carrierHz of [440, 495]) {
      const components = getSonificationComponents(
        55,
        carrierHz,
        sampleRate,
        score.definition,
      );
      for (const component of components.filter((candidate) => candidate.included)) {
        expect(
          Math.max(component.leftFrequencyHz, component.rightFrequencyHz),
        ).toBeLessThan(sampleRate * 0.45);
      }
    }
  },
);
```

- [ ] **Step 2: Run the focused tests and confirm RED**

```bash
npx vitest run src/audio/synthesis.test.ts src/audio/musicalScore.test.ts
```

Expected: FAIL because the definition and components do not expose detuned frequencies and inclusion uses the nominal frequency.

- [ ] **Step 3: Add the declared detune ratio to score definition**

Add:

```ts
stereoDetuneRatio: number;
```

to `MusicalScoreDefinition`, and set:

```ts
stereoDetuneRatio: 0.00125,
```

in `RESIDUE_BLOOM_SCORE_DEFINITION`.

Add the same field to `AudioRhythmPreset` and `createRhythmPreset()`.

- [ ] **Step 4: Return nominal and detuned frequencies from synthesis helpers**

Change `SonificationComponent`:

```ts
export interface SonificationComponent extends AudioPartial {
  nominalFrequencyHz: number;
  leftFrequencyHz: number;
  rightFrequencyHz: number;
  weightedAmplitude: number;
  included: boolean;
}
```

Implement:

```ts
const nominalFrequencyHz = carrierHz * partial.harmonic;
const leftFrequencyHz =
  nominalFrequencyHz * (1 - scoreDefinition.stereoDetuneRatio);
const rightFrequencyHz =
  nominalFrequencyHz * (1 + scoreDefinition.stereoDetuneRatio);
const maximumGeneratedFrequencyHz = Math.max(leftFrequencyHz, rightFrequencyHz);

return {
  ...partial,
  nominalFrequencyHz,
  leftFrequencyHz,
  rightFrequencyHz,
  weightedAmplitude:
    partial.sourceAmplitude /
    Math.pow(index + 1, scoreDefinition.timbreDamping),
  included: maximumGeneratedFrequencyHz < frequencyLimit,
};
```

Update existing tests from `audibleFrequencyHz` to `nominalFrequencyHz`.

In the mono offline renderer, preserve its current sound-test role by using
`component.nominalFrequencyHz`; inclusion must still use the detune-aware result.

- [ ] **Step 5: Run focused tests**

```bash
npx vitest run src/audio/synthesis.test.ts src/audio/musicalScore.test.ts
npm run typecheck
```

Expected: PASS, including existing 48 kHz term counts. If the 495 Hz included count changes because of the corrected guard, update the expected count to the mathematically calculated value and record it in `docs/mathematical-model.md` during Task 7.

- [ ] **Step 6: Commit the detune-aware guard**

```bash
git add src/audio/musicalScore.ts src/audio/musicalScore.test.ts src/audio/synthesis.ts src/audio/synthesis.test.ts
git diff --cached --check
git commit -m "デチューン後の帯域制限を厳密化"
```

---

### Task 3: Make AudioWorklet evaluate absolute-time phasors once per event

**Files:**
- Create: `src/audio/workletContract.test.ts`
- Modify: `public/audio/fourier-worklet.js`
- Modify: `src/audio/AudioEngine.ts`

- [ ] **Step 1: Write a failing source-contract test**

Create `src/audio/workletContract.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workletSource = readFileSync(
  new URL("../../public/audio/fourier-worklet.js", import.meta.url),
  "utf8",
);

describe("AudioWorklet mathematical contract", () => {
  it("derives phasor controls from the serialized mapping instead of repeat events", () => {
    expect(workletSource).toContain("evaluateSerializedPhasor");
    expect(workletSource).toContain(
      "const baseEvent = score.events[globalStep]",
    );
    expect(workletSource).toContain(
      "evaluateEvent(score, baseEvent, cycleIndex)",
    );
    expect(workletSource).not.toContain(
      "score.events[globalStep].normalizedPhasorX",
    );
    expect(workletSource).not.toContain(
      "score.events[globalStep].normalizedPhasorRadius",
    );
  });

  it("caches evaluated controls by cycle and global step", () => {
    expect(workletSource).toContain("cachedEventKey");
    expect(workletSource).toContain("`${cycleIndex}:${globalStep}`");
  });

  it("guards the maximum detuned frequency", () => {
    expect(workletSource).toContain(
      "Math.max(leftFrequency, rightFrequency) >= frequencyLimit",
    );
    expect(workletSource).not.toContain(
      "frequency >= sampleRate * 0.5 * score.definition.antiAliasRatio",
    );
  });

  it("does not define musical masks or carrier sequences", () => {
    expect(workletSource).not.toMatch(
      /QUARTER_NOTES|EIGHTH_NOTES|TWELVE_NOTES|SIXTEENTH_NOTES|carrierMultipliers/,
    );
  });
});
```

- [ ] **Step 2: Run the worklet contract test and confirm RED**

```bash
npx vitest run src/audio/workletContract.test.ts
```

Expected: FAIL because the worklet reads stored phasor fields and checks only nominal frequency.

- [ ] **Step 3: Add generic phasor and event evaluators to the worklet**

At top level in `public/audio/fourier-worklet.js`, add:

```js
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function evaluateSerializedPhasor(mapping, absoluteTimeSeconds) {
  const angle = absoluteTimeSeconds * mapping.visualAngularRate;
  let x = 0;
  let y = 0;

  for (const term of mapping.terms) {
    const phase = term.harmonic * angle + term.sinePhase;
    x += term.amplitude * Math.cos(phase);
    y += term.amplitude * Math.sin(phase);
  }

  return {
    normalizedX: clamp(x / mapping.amplitudeBound, -1, 1),
    normalizedY: clamp(y / mapping.amplitudeBound, -1, 1),
    normalizedRadius: clamp(Math.hypot(x, y) / mapping.amplitudeBound, 0, 1),
  };
}

function evaluateEvent(score, event, cycleIndex) {
  const absoluteTimeSeconds =
    cycleIndex * score.cycleSeconds + event.globalStep * score.stepSeconds;
  const phasor = evaluateSerializedPhasor(
    score.phasorMapping,
    absoluteTimeSeconds,
  );
  const phasorBrightness = (phasor.normalizedY + 1) * 0.5;

  return {
    ...event,
    absoluteTimeSeconds,
    brightness: clamp(
      event.baseBrightness * 0.72 + phasorBrightness * 0.28,
      0,
      1,
    ),
    accent: event.active
      ? event.baseAccent * (0.9 + phasor.normalizedRadius * 0.2)
      : 0,
    normalizedPhasorX: phasor.normalizedX,
    normalizedPhasorY: phasor.normalizedY,
    normalizedPhasorRadius: phasor.normalizedRadius,
  };
}
```

- [ ] **Step 4: Cache one evaluated event per cycle and step**

Initialize:

```js
this.cachedEventKey = "";
this.cachedEvent = null;
```

Reset both on `configure` and `seek`.

Inside `process()`:

```js
const cycleIndex = Math.floor(Math.max(0, absoluteTime) / score.cycleSeconds);
const eventKey = `${cycleIndex}:${globalStep}`;
if (this.cachedEventKey !== eventKey) {
  this.cachedEventKey = eventKey;
  const baseEvent = score.events[globalStep];
  this.cachedEvent = evaluateEvent(
    score,
    baseEvent,
    cycleIndex,
  );
}
const event = this.cachedEvent;
```

Do not evaluate the phasor inside the partial loop or once per sample when `eventKey` is unchanged.

- [ ] **Step 5: Apply detune-aware frequency inclusion**

Before the partial loop:

```js
const frequencyLimit =
  sampleRate * 0.5 * score.definition.antiAliasRatio;
const detune = score.definition.stereoDetuneRatio;
```

Inside the loop:

```js
const nominalFrequency = event.carrierHz * partial.harmonic;
const leftFrequency = nominalFrequency * (1 - detune);
const rightFrequency = nominalFrequency * (1 + detune);
if (Math.max(leftFrequency, rightFrequency) >= frequencyLimit) {
  continue;
}

const leftPhase =
  Math.PI * 2 * leftFrequency * localTime + partial.sinePhase;
const rightPhase =
  Math.PI * 2 * rightFrequency * localTime + partial.sinePhase;
```

Use `event.baseGain` instead of `event.gain` in the output scale. Keep wet-send section-driven.

- [ ] **Step 6: Bump the worklet version**

In `src/audio/AudioEngine.ts`:

```ts
await context.audioWorklet.addModule("/audio/fourier-worklet.js?v=5");
```

- [ ] **Step 7: Run worklet, score, and synthesis verification**

```bash
npx vitest run src/audio/workletContract.test.ts src/audio/musicalScore.test.ts src/audio/synthesis.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit the AudioWorklet correction**

```bash
git add public/audio/fourier-worklet.js src/audio/AudioEngine.ts src/audio/workletContract.test.ts
git diff --cached --check
git commit -m "音声ワークレットを絶対時刻へ同期"
```

---

### Task 4: Enforce mathematical provenance for every chapter

**Files:**
- Create: `src/patterns/validatePatternDefinition.ts`
- Create: `src/patterns/validatePatternDefinition.test.ts`
- Modify: `src/patterns/types.ts`
- Modify: `src/patterns/registry.ts`
- Modify: `src/patterns/registry.test.ts`

- [ ] **Step 1: Write failing validation tests**

Create `src/patterns/validatePatternDefinition.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { patternRegistry } from "./registry";
import { validatePatternDefinition } from "./validatePatternDefinition";
import type { PatternDefinition } from "./types";

function mutatePattern(
  mutate: (pattern: PatternDefinition) => PatternDefinition,
): PatternDefinition {
  return mutate(patternRegistry[0]!);
}

describe("pattern mathematical provenance", () => {
  it("accepts Residue Bloom", () => {
    expect(() => validatePatternDefinition(patternRegistry[0]!)).not.toThrow();
  });

  it("rejects score-wrapped mathematical time", () => {
    const invalid = mutatePattern((pattern) => ({
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        visualTime: {
          ...pattern.mathematics.visualTime,
          wrapsWithScore: true as never,
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /mathematical time must not wrap with score/i,
    );
  });

  it("rejects a score phasor rate that differs from the chapter rate", () => {
    const invalid = mutatePattern((pattern) => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: {
            ...pattern.audio.score.phasorMapping,
            visualAngularRate: 0.5,
          },
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /visual angular rate/i,
    );
  });

  it("rejects spectrum and audio reference-frequency disagreement", () => {
    const invalid = mutatePattern((pattern) => ({
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        spectrum: {
          ...pattern.mathematics.spectrum,
          referenceFrequencyHz: 110,
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /reference frequency/i,
    );
  });

  it("rejects score mapping terms that differ from the formula", () => {
    const pattern = patternRegistry[0]!;
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: {
            ...pattern.audio.score.phasorMapping,
            terms: pattern.audio.score.phasorMapping.terms.map((term, index) =>
              index === 0 ? { ...term, amplitude: term.amplitude + 1 } : term,
            ),
          },
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /phasor mapping terms/i,
    );
  });

  it("rejects a phasor amplitude bound that differs from the formula", () => {
    const pattern = patternRegistry[0]!;
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: {
            ...pattern.audio.score.phasorMapping,
            amplitudeBound:
              pattern.audio.score.phasorMapping.amplitudeBound + 1,
          },
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /phasor amplitude bound/i,
    );
  });

  it("rejects phasor results smuggled into repeating events", () => {
    const pattern = patternRegistry[0]!;
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          events: pattern.audio.score.events.map((event, index) =>
            index === 0
              ? ({ ...event, normalizedPhasorX: 0 } as typeof event)
              : event,
          ),
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /repeat event contains evaluated phasor data/i,
    );
  });
});
```

- [ ] **Step 2: Run the validation test and confirm RED**

```bash
npx vitest run src/patterns/validatePatternDefinition.test.ts
```

Expected: FAIL because the validator and strengthened provenance fields do not exist.

- [ ] **Step 3: Strengthen `MathematicalProvenance`**

Replace `visualAngularRate` in `src/patterns/types.ts` with:

```ts
export interface MathematicalProvenance {
  operation: "finite-fourier-series-synthesis";
  coefficientSource: "analytic";
  phasorProjection: "imaginary";
  fftUsed: false;
  visualTime: {
    mode: "absolute-linear";
    angularRateRadiansPerSecond: number;
    wrapsWithScore: false;
  };
  spectrum: {
    kind: "analytic-one-sided-sine-amplitude";
    frequencyScale: "logarithmic";
    referenceFrequencyHz: number;
  };
  rendering: {
    method: "sampled-polyline";
  };
  phasorLatex: string;
  complexCoefficientLatex: string;
}
```

- [ ] **Step 4: Implement the runtime validator**

Create `src/patterns/validatePatternDefinition.ts`:

```ts
import type { PatternDefinition } from "./types";

const FORBIDDEN_REPEAT_EVENT_FIELDS = [
  "normalizedPhasorX",
  "normalizedPhasorY",
  "normalizedPhasorRadius",
  "brightness",
  "accent",
  "absoluteTimeSeconds",
] as const;

function sameNumber(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-12;
}

export function validatePatternDefinition(
  pattern: PatternDefinition,
): void {
  if (pattern.terms !== pattern.formula.terms) {
    throw new Error("Pattern terms must reference formula terms");
  }
  if (pattern.mathematics.visualTime.wrapsWithScore !== false) {
    throw new Error("Mathematical time must not wrap with score");
  }
  if (
    !sameNumber(
      pattern.mathematics.visualTime.angularRateRadiansPerSecond,
      pattern.audio.score.phasorMapping.visualAngularRate,
    )
  ) {
    throw new Error("Score visual angular rate differs from pattern");
  }
  if (
    !sameNumber(
      pattern.mathematics.spectrum.referenceFrequencyHz,
      pattern.audio.fundamentalHz,
    )
  ) {
    throw new Error("Spectrum reference frequency differs from audio reference");
  }
  if (pattern.mathematics.fftUsed !== false) {
    throw new Error("Analytic coefficient pattern cannot declare FFT use");
  }

  const mappingTerms = pattern.audio.score.phasorMapping.terms;
  const expectedAmplitudeBound = pattern.formula.terms.reduce(
    (sum, term) => sum + Math.abs(term.amplitude),
    0,
  );
  if (
    !sameNumber(
      pattern.audio.score.phasorMapping.amplitudeBound,
      expectedAmplitudeBound,
    )
  ) {
    throw new Error("Score phasor amplitude bound differs from formula");
  }
  if (
    mappingTerms.length !== pattern.formula.terms.length ||
    mappingTerms.some((term, index) => {
      const formulaTerm = pattern.formula.terms[index];
      return (
        !formulaTerm ||
        term.harmonic !== formulaTerm.harmonic ||
        !sameNumber(term.amplitude, formulaTerm.amplitude) ||
        !sameNumber(term.sinePhase, formulaTerm.sinePhase)
      );
    })
  ) {
    throw new Error("Score phasor mapping terms differ from formula");
  }

  for (const event of pattern.audio.score.events) {
    for (const field of FORBIDDEN_REPEAT_EVENT_FIELDS) {
      if (field in event) {
        throw new Error("Repeat event contains evaluated phasor data");
      }
    }
  }
}
```

- [ ] **Step 5: Register the strengthened chapter definition**

In `src/patterns/registry.ts`, add:

```ts
import { validatePatternDefinition } from "./validatePatternDefinition";
```

Change the current registry array element into a named definition by replacing:

```ts
export const patternRegistry: readonly PatternDefinition[] = [
  {
```

with:

```ts
const residueBloomPattern = {
```

Replace the complete `mathematics` property with:

```ts
mathematics: {
  operation: "finite-fourier-series-synthesis",
  coefficientSource: "analytic",
  phasorProjection: "imaginary",
  fftUsed: false,
  visualTime: {
    mode: "absolute-linear",
    angularRateRadiansPerSecond: RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    wrapsWithScore: false,
  },
  spectrum: {
    kind: "analytic-one-sided-sine-amplitude",
    frequencyScale: "logarithmic",
    referenceFrequencyHz: 55,
  },
  rendering: {
    method: "sampled-polyline",
  },
  phasorLatex:
    "z(x)=\\sum_{k=0}^{12}A_k e^{i n_kx},\\quad f(x)=\\operatorname{Im}z(x)",
  complexCoefficientLatex:
    "c_{n_k}=-\\frac{iA_k}{2},\\quad c_{-n_k}=\\frac{iA_k}{2}",
},
```

After the named object closes, replace the old array terminator with:

```ts
} satisfies PatternDefinition;

validatePatternDefinition(residueBloomPattern);

export const patternRegistry: readonly PatternDefinition[] =
  Object.freeze([residueBloomPattern]);
```

Update all references from:

```ts
pattern.mathematics.visualAngularRate
```

to:

```ts
pattern.mathematics.visualTime.angularRateRadiansPerSecond
```

- [ ] **Step 6: Strengthen registry assertions**

In `src/patterns/registry.test.ts`, expect:

```ts
expect(pattern?.mathematics).toMatchObject({
  visualTime: {
    mode: "absolute-linear",
    angularRateRadiansPerSecond: 0.31,
    wrapsWithScore: false,
  },
  spectrum: {
    kind: "analytic-one-sided-sine-amplitude",
    frequencyScale: "logarithmic",
    referenceFrequencyHz: 55,
  },
  rendering: {
    method: "sampled-polyline",
  },
});
```

- [ ] **Step 7: Run focused tests and typecheck**

```bash
npx vitest run src/patterns/validatePatternDefinition.test.ts src/patterns/registry.test.ts src/audio/musicalScore.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit the future-chapter constraints**

```bash
git add src/patterns/types.ts src/patterns/registry.ts src/patterns/registry.test.ts src/patterns/validatePatternDefinition.ts src/patterns/validatePatternDefinition.test.ts
git diff --cached --check
git commit -m "章定義へ数学的整合性検証を追加"
```

---

### Task 5: Put spectrum bars and ticks on one exact logarithmic axis

**Files:**
- Create: `src/components/dataCanvasModel.ts`
- Create: `src/components/dataCanvasModel.test.ts`
- Modify: `src/components/DataCanvas.tsx`
- Modify: `src/components/DetailsPanel.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing pure layout tests**

Create `src/components/dataCanvasModel.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { RESIDUE_BLOOM_SERIES } from "../math/fourier";
import {
  createSpectrumLayout,
  getAudioWaveformMode,
  getLogFrequencyProgress,
} from "./dataCanvasModel";

describe("data canvas model", () => {
  it("places bars and ticks with the same logarithmic function", () => {
    const layout = createSpectrumLayout(RESIDUE_BLOOM_SERIES, 55);

    for (const tick of layout.ticks) {
      expect(tick.progress).toBeCloseTo(
        getLogFrequencyProgress(
          tick.frequencyHz,
          layout.minimumHz,
          layout.maximumHz,
        ),
        12,
      );
    }

    const firstBar = layout.bars[0]!;
    expect(firstBar.progress).toBeCloseTo(
      getLogFrequencyProgress(
        firstBar.frequencyHz,
        layout.minimumHz,
        layout.maximumHz,
      ),
      12,
    );
  });

  it("uses one-sided sine amplitudes without a decorative minimum height", () => {
    const layout = createSpectrumLayout(RESIDUE_BLOOM_SERIES, 55);

    expect(layout.amplitudeConvention).toBe(
      "analytic-one-sided-sine-amplitude",
    );
    expect(layout.bars[0]?.heightRatio).toBeCloseTo(1, 12);
    expect(layout.bars[12]?.heightRatio).toBeCloseTo(1 / 13, 12);
  });

  it("shows only a waiting state before analyser initialization", () => {
    expect(getAudioWaveformMode(false)).toBe("waiting");
    expect(getAudioWaveformMode(true)).toBe("analyser");
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

```bash
npx vitest run src/components/dataCanvasModel.test.ts
```

Expected: FAIL because the model module does not exist.

- [ ] **Step 3: Implement the pure data model**

Create `src/components/dataCanvasModel.ts`:

```ts
import {
  getAnalyticSpectrum,
  type FourierSeriesDefinition,
} from "../math/fourier";

export function getLogFrequencyProgress(
  frequencyHz: number,
  minimumHz: number,
  maximumHz: number,
): number {
  const bounded = Math.min(maximumHz, Math.max(minimumHz, frequencyHz));
  return (
    Math.log10(bounded / minimumHz) /
    Math.log10(maximumHz / minimumHz)
  );
}

export function createSpectrumLayout(
  series: FourierSeriesDefinition,
  referenceFrequencyHz: number,
) {
  const spectrum = getAnalyticSpectrum(series, referenceFrequencyHz);
  const minimumHz = Math.min(45, spectrum[0]?.frequencyHz ?? referenceFrequencyHz);
  const maximumHz = Math.max(
    3_200,
    spectrum.at(-1)?.frequencyHz ?? referenceFrequencyHz,
  );
  const maximumAmplitude =
    spectrum.reduce(
      (maximum, bin) => Math.max(maximum, bin.amplitude),
      0,
    ) || 1;
  const tickFrequencies = [
    referenceFrequencyHz,
    referenceFrequencyHz * 8,
    1_000,
    spectrum.at(-1)?.frequencyHz ?? maximumHz,
  ];
  const uniqueTicks = [...new Set(tickFrequencies)];

  return {
    minimumHz,
    maximumHz,
    amplitudeConvention: "analytic-one-sided-sine-amplitude" as const,
    bars: spectrum.map((bin) => ({
      ...bin,
      progress: getLogFrequencyProgress(
        bin.frequencyHz,
        minimumHz,
        maximumHz,
      ),
      heightRatio: bin.amplitude / maximumAmplitude,
    })),
    ticks: uniqueTicks.map((frequencyHz) => ({
      frequencyHz,
      progress: getLogFrequencyProgress(
        frequencyHz,
        minimumHz,
        maximumHz,
      ),
      label:
        frequencyHz >= 1_000
          ? `${(frequencyHz / 1_000).toFixed(
              frequencyHz % 1_000 === 0 ? 0 : 1,
            )}k`
          : frequencyHz.toFixed(0),
    })),
  };
}

export function getAudioWaveformMode(
  initialized: boolean,
): "waiting" | "analyser" {
  return initialized ? "analyser" : "waiting";
}
```

- [ ] **Step 4: Render spectrum bars from the shared layout**

Change `SpectrumCanvas` to accept:

```ts
interface SpectrumCanvasProps {
  series: FourierSeriesDefinition;
  referenceFrequencyHz: number;
}
```

Use:

```ts
const layout = createSpectrumLayout(series, referenceFrequencyHz);
```

Re-run the drawing effect when either input changes:

```ts
}, [series, referenceFrequencyHz]);
```

For each bar:

```ts
const x = 8 + bin.progress * (rect.width - 16);
const height = bin.heightRatio * (rect.height - 12);
```

Remove `Math.max(3, ...)`.

Export a `SpectrumAxis` component that uses the same layout:

```tsx
export function SpectrumAxis({
  series,
  referenceFrequencyHz,
}: SpectrumCanvasProps) {
  const layout = createSpectrumLayout(series, referenceFrequencyHz);

  return (
    <div className="frequencyAxis" aria-hidden="true">
      {layout.ticks.map((tick, index) => (
        <span
          key={tick.frequencyHz}
          style={{ left: `${tick.progress * 100}%` }}
        >
          {tick.label}
          {index === layout.ticks.length - 1 ? " Hz" : ""}
        </span>
      ))}
    </div>
  );
}
```

Use the precise canvas label:

```tsx
aria-label="片側正弦振幅 A_k の解析的スペクトル"
```

- [ ] **Step 5: Replace the equal-spaced axis CSS**

Use:

```css
.frequencyAxis {
  position: relative;
  height: 12px;
  margin-inline: 8px;
  color: rgba(174, 207, 214, 0.38);
  font-size: 8px;
}

.frequencyAxis span {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  white-space: nowrap;
}
```

The `8px` inline margins must match the canvas bar inset. Remove `display: flex`,
`justify-content: space-between`, and the old first/last-child transforms.

- [ ] **Step 6: Wire the pattern formula and reference frequency**

In `DetailsPanel.tsx`:

```tsx
<SpectrumCanvas
  series={pattern.formula}
  referenceFrequencyHz={
    pattern.mathematics.spectrum.referenceFrequencyHz
  }
/>
<SpectrumAxis
  series={pattern.formula}
  referenceFrequencyHz={
    pattern.mathematics.spectrum.referenceFrequencyHz
  }
/>
```

- [ ] **Step 7: Run focused tests and typecheck**

```bash
npx vitest run src/components/dataCanvasModel.test.ts src/math/fourier.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit the spectrum correction**

```bash
git add src/components/dataCanvasModel.ts src/components/dataCanvasModel.test.ts src/components/DataCanvas.tsx src/components/DetailsPanel.tsx src/styles.css
git diff --cached --check
git commit -m "解析的スペクトルの表示規約を修正"
```

---

### Task 6: Remove the false audio-waveform fallback and correct UI terminology

**Files:**
- Modify: `src/components/DataCanvas.tsx`
- Modify: `src/components/dataCanvasModel.test.ts`
- Modify: `src/components/DetailsPanel.tsx`
- Modify: `src/patterns/registry.ts`
- Modify: `src/patterns/registry.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add failing terminology and waveform-state tests**

Extend `src/components/dataCanvasModel.test.ts`:

```ts
it("uses precise public labels for the mathematical display", () => {
  const layout = createSpectrumLayout(RESIDUE_BLOOM_SERIES, 55);

  expect(layout.referenceLabel).toBe("解析的スペクトルの周波数対応基準");
  expect(layout.amplitudeLabel).toBe("片側正弦振幅 A_k");
  expect(layout.renderingLabel).toBe(
    "解析式から評価した標本点を結ぶ数値描画",
  );
});
```

Extend `src/patterns/registry.test.ts`:

```ts
it("describes the implemented stereo sonification without assigning wet-send to phasor radius", () => {
  const pattern = patternRegistry[0]!;

  expect(pattern.audio.sonificationLatex).toContain("f_{k,j}^{L/R}");
  expect(pattern.audio.sonificationLatex).toContain("P_k^{L/R}");
  expect(pattern.education.sonificationBody).toContain(
    "絶対イベント時刻",
  );
  expect(pattern.education.sonificationBody).toContain(
    "残響量は区間プロファイル",
  );
  expect(pattern.education.sonificationBody).not.toContain(
    "絶対値をアクセントと余韻",
  );
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

```bash
npx vitest run src/components/dataCanvasModel.test.ts src/patterns/registry.test.ts
```

Expected: FAIL because the labels and corrected stereo equation are absent.

- [ ] **Step 3: Add precise labels to the data model**

Return:

```ts
referenceLabel: "解析的スペクトルの周波数対応基準" as const,
amplitudeLabel: "片側正弦振幅 A_k" as const,
renderingLabel:
  "解析式から評価した標本点を結ぶ数値描画" as const,
```

from `createSpectrumLayout()`.

- [ ] **Step 4: Draw only analyser data in the audio-output canvas**

Remove these imports from `DataCanvas.tsx`:

```ts
RESIDUE_BLOOM_SERIES
evaluateSeries
```

Remove `phase` and the mathematical fallback.

When `getAudioWaveformMode(audio.initialized) === "waiting"`:

```ts
context.strokeStyle = "rgba(137, 240, 255, .28)";
context.lineWidth = 0.6;
context.beginPath();
context.moveTo(0, rect.height * 0.5);
context.lineTo(rect.width, rect.height * 0.5);
context.stroke();
context.fillStyle = "rgba(174, 207, 214, .46)";
context.font = '9px "Inter", sans-serif';
context.textAlign = "center";
context.fillText(
  "再生開始後に処理後の音響波形を表示",
  rect.width * 0.5,
  rect.height * 0.5 - 8,
);
return;
```

When initialized, draw only `getWaveformData()` values.

Remove the `playing` prop from `WaveformCanvas`, `DetailsPanelProps`, the `DetailsPanel` call in `App.tsx`, and related effect dependencies.

- [ ] **Step 5: Correct the UI equation and prose**

In `src/patterns/registry.ts`, replace `sonificationLatex` with:

```ts
sonificationLatex:
  "w_k=\\frac{A_k}{(k+1)^{1.4}},\\quad " +
  "f_{k,j}^{L/R}=n_k\\nu_j(1\\mp d),\\quad " +
  "g_{\\nu_j}^{L/R}(\\tau)=CG_eE_e(\\tau)" +
  "\\sum_{k\\in K(F_s)}w_kP_k^{L/R}" +
  "\\sin(2\\pi f_{k,j}^{L/R}\\tau)",
```

Replace the sonification body with:

```ts
"音声は級数そのものを55 Hzで無加工再生したものではありません。音楽形式は48小節で反復しますが、定位・明るさ・アクセント・減衰は各周回の絶対イベント時刻における z(0.31tₑ) から評価します。同じ調波指数を440 / 495 Hzへ移し、基礎知覚重み、左右デチューン後のナイキスト制約、equal-power定位を適用します。フェーザ半径はアクセントと減衰へ使い、残響量は区間プロファイルから得る音楽的ソニフィケーションです。"
```

In `DetailsPanel.tsx`, use:

```tsx
<dt>解析的スペクトルの周波数対応基準</dt>
<dd>{pattern.mathematics.spectrum.referenceFrequencyHz.toFixed(2)} Hz</dd>
```

```tsx
<dt>表示用の数学時刻</dt>
<dd>
  x(t) ={" "}
  {pattern.mathematics.visualTime.angularRateRadiansPerSecond.toFixed(2)}
  t rad（144秒で非リセット）
</dd>
```

```tsx
<dt>表示スペクトル</dt>
<dd>片側正弦振幅 Aₖ の解析値</dd>
```

```tsx
<dt>数学曲線の描画</dt>
<dd>解析式の標本点を結ぶ数値描画</dd>
```

Change the coefficient heading from `Aₙ` to `Aₖ (sin)`.

Replace the event mapping paragraph with wording that says:

- `p_x`: pan
- `p_y`: post-synthesis low-pass brightness
- `p_r`: accent and decay
- wet-send: section profile
- absolute event time does not wrap with the 144-second score

- [ ] **Step 6: Clarify main-screen frequency annotations**

In `src/App.tsx`, add a visually hidden or visible small heading inside
`.mathAnnotations`:

```tsx
<span className="annotationContext">
  ANALYTIC SPECTRUM MAPPING / 解析的周波数対応
</span>
```

Keep the existing `n` and Hz values unchanged.

Add CSS:

```css
.annotationContext {
  position: absolute;
  left: 0;
  top: -18px;
  color: rgba(176, 215, 222, 0.42);
  font-size: 7px;
  letter-spacing: 0.14em;
  white-space: nowrap;
}
```

- [ ] **Step 7: Run focused tests and typecheck**

```bash
npx vitest run src/components/dataCanvasModel.test.ts src/patterns/registry.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit the UI accuracy fixes**

```bash
git add src/components/DataCanvas.tsx src/components/dataCanvasModel.test.ts src/components/DetailsPanel.tsx src/patterns/registry.ts src/patterns/registry.test.ts src/App.tsx src/styles.css
git diff --cached --check
git commit -m "音響波形と数学用語の表示を是正"
```

---

### Task 7: Make repository rules and documentation enforce the corrected model

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/mathematical-model.md`
- Modify: `design-qa.md`

- [ ] **Step 1: Confirm the new constraints are absent**

Run:

```bash
rg -n "絶対イベント時刻|反復イベント表.*フェーザ|デチューン後|片側正弦振幅|標本点を結ぶ数値描画" AGENTS.md README.md docs/mathematical-model.md design-qa.md
```

Expected: one or more required concepts are absent or existing wording still assigns residual reverb to \(p_r\).

- [ ] **Step 2: Add permanent rules to `AGENTS.md`**

Add a subsection under the mathematical/audio invariants:

```markdown
### 時間と反復スコアの分離

- 数学表示の時刻は絶対transport時刻に対する`x(t)=0.31t`であり、
  音楽スコアの周期でリセットしない。
- 反復イベント表は区間、発音、carrier、基礎プロファイルだけを保持する。
- フェーザ座標、半径、フェーザ由来brightness・accentを反復イベントへ保存しない。
- フェーザ由来制御はイベントが実際に発生する絶対時刻から評価する。
- ループ直後の履歴イベントは前周回の絶対イベント時刻を使う。
```

Add:

```markdown
### スペクトルと音響周波数

- 解析的スペクトルの横軸と目盛は同一の座標関数を使う。
- `Residue Bloom`の片側表示振幅は正弦形式`A_k`であり、
  `|c_{\pm n_k}|=A_k/2`と混同しない。
- ステレオデチューンを使う場合、帯域条件は左右の実生成周波数の最大値へ適用する。
- 55 Hzは解析的スペクトルの周波数対応基準であり、表示フェーザの実時間回転数や
  音声イベントのcarrier周波数と呼ばない。
- 折れ線描画は解析式から得た厳密な標本値を結ぶ数値描画と説明し、
  有限線分が連続曲線そのものだと主張しない。
```

Extend the chapter checklist to require:

- absolute mathematical-time convention
- whether score time wraps independently
- spectrum amplitude convention and axis scale
- detune-aware band-limit test
- pattern-definition validation

- [ ] **Step 3: Correct `docs/mathematical-model.md`**

Add equations:

```math
t_{\mathrm{cycle}}=t\bmod 144
```

```math
t_e^{\mathrm{abs}}=m\cdot144+t_e^{\mathrm{local}}
```

```math
z_e=z(0.31t_e^{\mathrm{abs}})
```

State explicitly:

- musical form repeats at 144 seconds
- mathematical phase does not reset
- event table contains no phasor results
- \(p_x\) controls pan
- \(p_y\) controls the post-synthesis low-pass
- \(p_r\) controls accent and decay
- wet-send is a section profile, not a \(p_r\) mapping

Replace the mono sonification equation with the stereo equation from the design spec.

Correct the band-limit condition to:

```math
\max\left(
n_k\nu_j(1-d),
n_k\nu_j(1+d)
\right)<0.45F_s
```

Describe the displayed spectrum as one-sided sine amplitude \(A_k\), and the
epicycle/wave lines as sampled polylines with exact sample coordinates.

- [ ] **Step 4: Correct `README.md`**

Add a concise statement:

```markdown
48小節で反復するのは音楽形式だけです。数学表示は絶対transport時刻の
`x(t)=0.31t`を継続し、各周回の発音制御もその絶対イベント時刻の
フェーザから再評価します。
```

Clarify:

- 55 Hz is the analytic-spectrum frequency reference
- spectrum height is one-sided sine amplitude \(A_k\)
- the lines connect exact analytic samples
- the detune-aware guard applies after left/right frequency offsets

- [ ] **Step 5: Correct historical QA wording**

In `design-qa.md`:

- retain the observed successful 144-second musical-form loop
- remove any implication that the mathematical phase or phasor-derived controls repeat identically
- record the previously found defect as corrected
- keep headphone, Mac speaker, hidden-tab, fullscreen, and long-memory items at their actual verified status
- do not claim the new two-cycle browser QA until Task 8

- [ ] **Step 6: Verify documentation consistency**

Run:

```bash
rg -n "絶対イベント時刻|デチューン後|片側正弦振幅|標本点を結ぶ数値描画" AGENTS.md README.md docs/mathematical-model.md
rg -n "p_r.*残響|絶対値.*残響" README.md docs/mathematical-model.md src/patterns/registry.ts src/components/DetailsPanel.tsx
git diff --check
```

Expected: required terms are present; the second command prints no inaccurate \(p_r\)-to-reverb claim.

- [ ] **Step 7: Commit the permanent constraints and documentation**

```bash
git add AGENTS.md README.md docs/mathematical-model.md design-qa.md
git diff --cached --check
git commit -m "数学時刻と表示規約を文書へ固定"
```

---

### Task 8: Run final automated verification and two-cycle Chrome QA

**Files:**
- Modify: `design-qa.md`

- [ ] **Step 1: Run focused mathematical and score tests**

```bash
npx vitest run src/math/fourier.test.ts src/audio/musicalScore.test.ts src/patterns/validatePatternDefinition.test.ts src/patterns/registry.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused audio and worklet tests**

```bash
npx vitest run src/audio/synthesis.test.ts src/audio/workletContract.test.ts src/core/transport.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run focused UI-model and visual-response tests**

```bash
npx vitest run src/components/dataCanvasModel.test.ts src/patterns/residueBloomVisualResponse.test.ts src/patterns/residueBloomScoreOverlay.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run all repository checks**

```bash
npm run format
npm run check
git diff --check
```

Expected:

- Biome format check passes
- Oxlint passes with zero warnings
- all Vitest tests pass
- TypeScript build passes
- Vite production build passes
- no whitespace errors

- [ ] **Step 5: Inspect architectural constraints directly**

Run:

```bash
rg -n "normalizedPhasor|absoluteTimeSeconds|brightness|accent" src/audio/musicalScore.ts public/audio/fourier-worklet.js
rg -n "QUARTER_NOTES|EIGHTH_NOTES|TWELVE_NOTES|SIXTEENTH_NOTES|carrierMultipliers" public/audio/fourier-worklet.js
rg -n "evaluateSeries|RESIDUE_BLOOM_SERIES" src/components/DataCanvas.tsx
```

Confirm:

- evaluated fields occur only in evaluated-event paths, not event-table construction
- worklet has no musical masks or carrier sequence
- audio-output canvas has no mathematical fallback

- [ ] **Step 6: Start the fixed-seed app**

```bash
npm run dev
```

Open latest Chrome at:

```text
http://127.0.0.1:5173/?seed=qa&quality=high
```

- [ ] **Step 7: Verify first and second cycles in WebGPU**

Confirm:

1. the same musical section and carrier form repeat after 144 seconds
2. mathematical epicycles and primary waveform continue without resetting
3. at the second-cycle intro, burst origin and score-linked color/pan controls correspond to the current absolute-time phasor rather than the first-cycle position
4. no visual jump is introduced into the exact circles, endpoint, connector, or primary waveform
5. pause/resume across the second cycle preserves alignment
6. console warnings, errors, and unhandled rejections remain zero

Use a local diagnostic only if necessary. Do not commit diagnostic controls.

- [ ] **Step 8: Verify forced WebGL2**

Open:

```text
http://127.0.0.1:5173/?renderer=webgl&seed=qa&quality=high
```

Repeat entry, first-cycle/second-cycle comparison, pause/resume, details-panel spectrum inspection, and console inspection.

- [ ] **Step 9: Inspect the corrected detail panel**

Confirm visually:

- 55, 440, 1k, and final-frequency ticks sit at their logarithmic positions
- bar heights follow \(A_k/A_0\) without a fake minimum
- the spectrum says one-sided sine amplitude \(A_k\)
- the audio-output panel shows a waiting state before audio initialization
- after entry it shows analyser data
- stereo sonification and absolute event time are described
- sampled-polyline wording is present

- [ ] **Step 10: Recheck target layouts**

Check:

```text
1440 x 900
1600 x 900
2560 x 1080
3840 x 2160
```

Confirm the absolutely positioned spectrum labels do not overlap or clip.

- [ ] **Step 11: Record actual results**

Update `design-qa.md` with:

- date and Chrome version if available
- WebGPU and WebGL2 result
- first-cycle event position and second-cycle event position
- confirmation that the mathematical display did not reset
- confirmation that the musical form did repeat
- spectrum-axis observations
- waiting/analyser audio-output states
- console result
- any unresolved manual checks

Do not mark headphone, Mac speaker, hidden-tab, fullscreen, or memory checks complete unless actually performed.

- [ ] **Step 12: Re-run final verification after QA edits**

```bash
npm run check
git diff --check
git status --short --branch
```

Expected: checks pass and only intended `design-qa.md` changes remain.

- [ ] **Step 13: Commit QA evidence**

If `design-qa.md` changed:

```bash
git add design-qa.md
git diff --cached --check
git commit -m "数学的整合性のブラウザQA結果を記録"
```

---

## Completion Report Requirements

The final report must state:

- the 144-second musical form still repeats
- mathematical time remains absolute and unwrapped
- second-cycle phasor controls were evaluated from absolute event time
- repeat events no longer contain phasor results
- detune-aware band limiting is active
- spectrum bars and ticks share one logarithmic axis
- audio-output waiting state no longer displays the mathematical series
- future chapter definitions are validated
- exact automated command results
- WebGPU and forced WebGL2 results
- manual checks that remain incomplete

Do not claim unperformed listening, hidden-tab, fullscreen, or memory checks.
