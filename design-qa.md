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

- date: `2026-06-12`
- fixed query parameters: `?seed=qa&quality=high`
- renderer: WebGPUと`?renderer=webgl`の両方で描画を確認
- viewport: `1440 x 900`（16:10）、`1600 x 900`（16:9）、
  `2560 x 1080`（ultrawide）、`3840 x 2160`
- tested score timestamps: `0.02`, `0.12`, `0.25`, `0.77`, `24.02`,
  `36.02`, `48.02`, `60.02`, `96.02`, `108.02`, `120.02`, `132.02`,
  `141.02`, `143.95`, `144.02`秒
- visual onset to halo: 先頭3秒の固定時刻比較で発音イベントに対応する拡縮を確認
- visual onset to burst particles: イベント時点の履歴フェーザ位置から金色粒子が広がることを確認
- visual onset to membrane and bloom: イベント強度に応じた膜、流線、ブルームの変化を確認
- phrase index 0 distinguishability: 先頭フレーズが次フレーズより強い視覚応答を確認
- exact epicycles, endpoint, connector, and primary waveform stability:
  スコア応答が詩的造形だけへ適用され、数学層が変形されないことをコードとテストで確認
- 144-second loop boundary:
  `143.95`秒と`144.02`秒の固定描画、スコア評価のmodulo単体テストに加え、
  実Chromeで`01:30`から`02:38`まで連続再生して境界通過後も再生継続を確認
- pause and resume:
  自動テストと実Chromeのボタン操作で停止・再開を確認。再開後の警告・エラーは0件
- tab visibility recovery: ブラウザ実動作は未確認
- console errors and unhandled rejections:
  WebGPU、forced WebGL2、全固定時刻、全対象アスペクト比で0件
- 3840 x 2160 bloom-section average FPS over 60 seconds:
  固定ブルームフレームで30標本すべて`60.0 fps`（平均、最小、最大ともに`60.0`）
- headphone listening: 未実施
- Mac built-in speaker listening: 未実施
- continuous listening duration: 0分
- playback observation:
  実Chromeでtransport累積`02:38`まで確認。再開後の`01:30`から`02:38`は
  seekなしで連続再生し、144秒境界を通過
- remaining risks:
  Codex内蔵ブラウザでは`AudioContext.resume()`が`suspended`のまま完了しなかったが、
  実Chromeでは音声開始、一時停止・再開、144秒境界通過まで動作した。
  自動操作では前面タブを切り替えられず、タブ非表示からの復帰は未確認。
  ヘッドホンとMac内蔵スピーカーによる実機試聴も未実施のため、
  音響品質を含む完了判定には手動QAが必要

**Math-Layer Score Linkage QA**

- date: `2026-06-13`
- implementation direction: B案。厳密な数学線は維持し、その上へ詩的な
  調波コロナ、14節点、履歴パルスを別オブジェクトとして重ねた
- user feedback before this pass:
  全体コンセプトと音楽変化は良好で、背景との連動は確認済み。左側の
  エピサイクルと右側の主波形は音楽連動が弱いという指摘を受けた
- shared score source:
  既存の直列化可能な48小節イベント表と`recentImpulses`だけを使用。
  AudioWorklet、音響DSP、イベント構成は変更していない
- strict math preservation:
  13円、スポーク、フェーザ終点、connector、主波形の式・位相・倍率を変更していない。
  既存の親groupによる主波形Yドリフトを検出し、主線は常に0、二次トレイルだけが
  詩的ドリフトを持つよう回帰テスト付きで修正
- harmonic corona:
  `A_k/(k+1)^1.4`を正規化した13重みを使用し、低次ほど強く発光。
  phrase index 0は後続フレーズより10%以上強い
- history pulse:
  最大4件、各64点の固定slot。各点は主波形と同じ
  `projectSeriesToVerticalAxis()`で計算し、144秒境界前後でも有限かつ一致
- Chrome WebGPU:
  `?seed=qa&quality=high`で開始後3秒以内のコロナ、節点、履歴パルスを確認。
  console warning/errorは0件
- Chrome forced WebGL2:
  `?renderer=webgl&seed=qa&quality=high`で同じ連動を確認。
  ブルームなしでも識別できるよう詩的overlayのopacityだけを1.32倍し、上限1へ制限。
  console warning/errorは0件
- automated focused verification:
  score overlay、visual response、registryの単体テスト、typecheck、production buildが成功
- listening status:
  音響実装は変更していない。ユーザーは変更前の音楽変化を心地よいと確認済みだが、
  ヘッドホンとMac内蔵スピーカーの機器別試聴は未確認
- final standard verification:
  `npm run check`成功。format、Oxlint、54 tests、typecheck、production buildが成功。
  `git diff --check`も成功
- final aspect-ratio QA:
  `1440 x 900`、`1600 x 900`、`2560 x 1080`、`3840 x 2160`で
  scene canvasがviewport全体へ一致し、documentのscroll width/heightもviewportと一致。
  水平・垂直overflowは0
- final 144-second loop QA:
  Chrome WebGPUでseekなしに`03:43`まで連続再生し、144秒境界通過後も
  一時停止表示、描画、音声transportが継続。warning/errorは0件
- final pause/resume QA:
  Chrome forced WebGL2で`00:00`停止、1.1秒後も`00:00`維持、再開1.1秒後に
  `00:01`へ進むことを確認。warning/errorは0件
- final tab visibility QA:
  Chrome拡張管理下のWebGPU/WebGL2両タブが同時に`visible`を返したため、
  実際のhidden状態とタブ復帰は自動確認できず未確認
- final 4K performance QA:
  内蔵Chrome runtime、WebGPU、`3840 x 2160`、`?seed=qa&quality=high`で
  60秒・30標本を計測。平均`59.95 fps`、最小`58.5 fps`、最大`60.0 fps`。
  warning/errorは0件。JS heapの長時間増加は今回の計測APIでは未測定

**Follow-up Polish**

- [P3] A future chapter can push the membrane topology closer to reference 03 without changing this chapter's residue-class identity.
- [P3] A production performance session on the exact MacBook Air M2 target should run for the full planned 60 seconds.

final result: automated and visual QA passed; manual audio QA remains incomplete
