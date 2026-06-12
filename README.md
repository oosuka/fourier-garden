# Fourier Garden

フーリエ級数を、エピサイクル、履歴波形、粒子場、有機的な光の膜、音響として同時に観測するデスクトップ向けWeb作品です。

初期章は **Residue Bloom / 剰余の花**。映像と音色は次の有限フーリエ級数からリアルタイム生成されます。

```math
f(x)=5\sum_{k=0}^{12}\frac{1}{k+1}\sin((4k+1)x)
```

## Requirements

- macOS最新版
- Chrome最新版
- Node.js 24以降

## Development

```bash
npm install
npm run dev
```

production build:

```bash
npm run typecheck
npm test
npm run build
```

## Controls

- `Space`: 再生 / 一時停止
- `D`: 詳細パネル
- `F`: 全画面
- UI: 音量、詳細、全画面

音声はブラウザの自動再生制限に従い、`ENTER FOURIER GARDEN`を押した後に開始します。初期音量は35%で、変更値はローカル保存されます。

音響は数式の13係数を音色として保ちつつ、80 BPMの16分音符パルスで短く発音します。発音中心は基準周波数`f₀ = 55 Hz`の8倍・9倍（440 / 495 Hz）で、低い持続音にならない構成です。

## Rendering

- 通常: Three.js `WebGPURenderer`、TSL、Bloom
- WebGPU非対応時: Three.js `WebGLRenderer`
- WebGL2強制確認: `?renderer=webgl`
- 固定QAシード: `?seed=qa`
- 高品質固定: `?quality=high`

例:

```text
http://localhost:5173/?seed=qa&quality=high
```

## Architecture

`src/patterns/registry.ts`が章レジストリです。各章は数式、音響プリセット、解説、遅延ロードされるシーンをまとめて登録します。映像とAudioWorkletは共通の`Transport`を使い、音声開始後は`AudioContext.currentTime`へ同期します。

## Future Chapters

1. Residue Bloom / 剰余の花
2. Spectral Cathedral / スペクトルの聖堂
3. Möbius Choir / メビウスの合唱
4. Prime Constellation / 素数星座
5. Bessel Tide / ベッセルの潮
6. Lissajous Orchard / リサージュの果樹園
7. Dirichlet Lanterns / ディリクレの灯
8. Wavelet Rain / ウェーブレットの雨
9. Riemann Veil / リーマンの帳
10. Phase Torus / 位相トーラス
