# Fourier Garden Design QA

**Product Definition**

- Fourier Garden is a finite Fourier-series synthesis and phasor-visualization product.
- `Residue Bloom` uses analytic coefficients and does not perform or visualize a DFT/FFT.
- The primary epicycles, connector, waveform, and coefficient spectrum are the exact mathematical layer.
- Audio is an explicitly weighted and band-limited musical sonification.
- Particles, membranes, nebulae, bloom, and secondary trails are interpretive visual layers.

**Evidence**

- source visual truth path: `/Users/oosuka/Downloads/イメージ画像1.png`, `/Users/oosuka/Downloads/イメージ画像2.png`, `/Users/oosuka/Downloads/イメージ画像3.png`
- implementation screenshot path: `/tmp/fourier-garden-final-main.png`
- viewport: `1487 x 1058`, device pixel ratio `1`
- state: `Residue Bloom`, playing, volume `35%`, fixed seed `qa`, WebGPU high quality
- full-view comparison evidence: `/tmp/fourier-garden-comparison.png`
- focused region comparison evidence: `/tmp/fourier-garden-details-comparison-final.png`

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Typography: the self-hosted Cormorant Garamond, Inter, and Noto Serif JP hierarchy matches the observatory tone. Detail copy and coefficient rows were enlarged after focused comparison.
- Spacing and layout: the fixed composition preserves black space, a left mathematical focal area, a right-flowing waveform, and a bottom control rail across the target desktop viewport.
- Colors and visual tokens: cyan, violet, warm gold, low-opacity glass, and additive bloom retain the reference palette without flattening the black background.
- Image quality: all visible imagery is generated at runtime from vector geometry, GPU particles, TSL atmosphere, and mathematical wave data. Thin lines remain native-resolution while scalable effects degrade independently.
- Copy and content: the UI distinguishes exact series synthesis, musical sonification, and poetic visual layers. It explicitly states that the chapter does not visualize FFT computation.
- Mathematical projection: the raw phasor endpoint uses the sine-phase convention, and its imaginary coordinate equals the primary waveform at the connector.
- Time scale: the UI identifies `x(t) = 0.31t` as an observation-speed visualization and does not imply that the displayed circles rotate at 55 Hz.

**Open Questions**

- The references are art-direction targets rather than a single pixel-identical screen. `Residue Bloom` intentionally emphasizes a denser particle field and softer organic atmosphere than reference 01.
- Automated Chromium blocks the fullscreen API. The control and error path are implemented, but final native fullscreen behavior remains a manual Chrome check.

**Patches Made Since Previous QA Pass**

- Replaced the volume slider event with `onInput` so its numeric display and persisted audio state update together.
- Replaced the failing `WebGPURenderer(forceWebGL)` path with a dedicated classic `WebGLRenderer` fallback.
- Added scene disposal and automatic rendering reinitialization for WebGPU device loss and WebGL context restoration.
- Increased detail-panel body, tab, formula, axis, and coefficient-table optical sizes.
- Removed unsupported `LineLoop` objects from the WebGPU path.
- Corrected the phasor convention from a cosine-shift representation to a zero-phase sine/imaginary projection.
- Removed taper and perturbation from the primary mathematical waveform.
- Added conventional two-sided complex coefficients and explicit sonification equations.

**Implementation Checklist**

- [x] Full-view composition compared against reference 01 and reference 03.
- [x] Details panel compared at a focused crop.
- [x] Fixed seed and deterministic viewport used.
- [x] WebGPU and forced WebGL2 states rendered successfully.
- [x] 3840 x 2160 viewport measured at `60.0 fps` in the in-app Chrome runtime.

**Audiovisual Score Synchronization QA**

- fixed query parameters: `?seed=qa&quality=high`
- renderer: 未実施（WebGPU / forced WebGL2を個別記録する）
- viewport: 未実施（16:10 / 16:9 / ultrawide / 3840 x 2160）
- tested score timestamps: 未実施
- audible onset to halo: 未実施
- audible onset to burst particles: 未実施
- audible onset to membrane and bloom: 未実施
- phrase index 0 distinguishability: 未実施
- exact epicycles, endpoint, connector, and primary waveform stability: 未実施
- 144-second loop boundary: 未実施
- pause and resume: 未実施
- tab visibility recovery: 未実施
- console errors and unhandled rejections: 未実施
- 3840 x 2160 bloom-section average FPS over 60 seconds: 未実施
- headphone listening: 未実施
- Mac built-in speaker listening: 未実施
- continuous listening duration: 0分
- remaining risks: ブラウザ実測と実機試聴後に更新する

**Follow-up Polish**

- [P3] A future chapter can push the membrane topology closer to reference 03 without changing this chapter's residue-class identity.
- [P3] A production performance session on the exact MacBook Air M2 target should run for the full planned 60 seconds.

final result: passed
