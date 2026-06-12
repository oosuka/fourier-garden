# Fourier Mathematical Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the phasor geometry, waveform, coefficient conventions, audio
sonification, UI copy, and documentation mathematically consistent.

**Architecture:** Keep the finite Fourier series as the single mathematical
source. Use an explicitly named sine phase whose phasor imaginary projection
reconstructs the series. Treat audio as a separate, documented transformation
that preserves harmonic indices while applying declared weighting and
band-limiting.

**Tech Stack:** TypeScript 6, React 19, Three.js, KaTeX, AudioWorklet, Vitest.

---

### Task 1: Establish the phasor and complex-coefficient convention

**Files:**
- Modify: `src/math/fourier.ts`
- Modify: `src/math/fourier.test.ts`

- [ ] Add failing tests requiring every source term to have zero sine phase.
- [ ] Add a failing test requiring the raw epicycle endpoint's imaginary
  coordinate to equal direct series evaluation.
- [ ] Add failing tests for
  \(c_n=A(\sin\phi-i\cos\phi)/2\) and \(c_{-n}=\overline{c_n}\).
- [ ] Rename the ambiguous `phase` field to `sinePhase`.
- [ ] Make `evaluateEpicycle` return the unmodified complex endpoint.
- [ ] Implement two-sided complex coefficient generation.
- [ ] Run `npm test -- --run src/math/fourier.test.ts`.

### Task 2: Make the primary history waveform an exact projection

**Files:**
- Modify: `src/math/fourier.ts`
- Modify: `src/math/fourier.test.ts`
- Modify: `src/patterns/residueBloomScene.ts`

- [ ] Add a failing test for a reusable series-to-screen projection helper.
- [ ] Implement the helper as `centerY + scale * evaluateSeries(series, angle)`.
- [ ] Pass the epicycle center and scale into waveform rendering.
- [ ] Use the exact helper for the primary trail and reserve perturbation for
  secondary artistic trails.
- [ ] Run the focused math tests.

### Task 3: Formalize the sonification transform

**Files:**
- Modify: `src/audio/synthesis.ts`
- Modify: `src/audio/synthesis.test.ts`
- Modify: `public/audio/fourier-worklet.js`

- [ ] Add failing tests requiring sine synthesis, source amplitudes matching
  the analytic series up to a common normalization, and explicit Nyquist
  exclusion metadata.
- [ ] Rename audio phase and gain fields so source coefficients and perceptual
  weighting cannot be confused.
- [ ] Centralize the anti-alias ratio and damping exponent in the rhythm preset.
- [ ] Use `sin` in offline and AudioWorklet synthesis.
- [ ] Run `npm test -- --run src/audio/synthesis.test.ts`.

### Task 4: Correct the educational UI

**Files:**
- Modify: `src/patterns/types.ts`
- Modify: `src/patterns/registry.ts`
- Modify: `src/components/DetailsPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] Add pattern-level phasor and sonification equations.
- [ ] State explicitly that this chapter is synthesis, not FFT analysis.
- [ ] Show \(f=\operatorname{Im}z\), the two-sided complex coefficients, the
  sine phase convention, and the declared sonification transform.
- [ ] Replace claims that every visual layer or audible ratio is a literal
  rendering of the source coefficients.
- [ ] Keep the current composition and interaction model unchanged.

### Task 5: Update project documentation

**Files:**
- Modify: `README.md`
- Modify: `design-qa.md`
- Create: `docs/mathematical-model.md`

- [ ] Put the product definition near the top of the README.
- [ ] Document the exact, sonification, and poetic layers.
- [ ] Record the corrected phase convention and complex coefficients.
- [ ] Record the QA criterion that the primary waveform is exact while
  decorative layers are interpretive.

### Task 6: Verify the complete change

**Files:**
- Verify all modified files.

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Open the fixed-seed local site in Chrome.
- [ ] Verify the mathematical explanation and coefficient table.
- [ ] Verify play, pause, and details interactions.
- [ ] Inspect Chrome errors and warnings.
- [ ] Run `git diff --check`.
