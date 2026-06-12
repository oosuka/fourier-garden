# Fourier Garden

Fourier Gardenは、**有限フーリエ級数の合成**と、**複素指数関数・フェーザによるフーリエ級数の幾何学的可視化**を中核に、そこから導いた映像と音楽的ソニフィケーションを奏でるデスクトップ向けWeb作品です。

これはFFT（高速フーリエ変換）の計算過程を可視化する作品ではありません。`Residue Bloom`では係数が解析的に既知であり、未知の標本列からDFT係数を推定していません。

初期章は **Residue Bloom / 剰余の花**。厳密な数学層は次の有限フーリエ級数からリアルタイム生成されます。

```math
f(x)=5\sum_{k=0}^{12}\frac{1}{k+1}\sin((4k+1)x)
```

複素フェーザを

```math
z(x)=\sum_{k=0}^{12}A_k e^{in_kx},
\qquad
A_k=\frac{5}{k+1},
\quad
n_k=4k+1
```

と置くと、円の連鎖の終点は`z(x)`であり、主波形はその虚部
`f(x) = Im z(x)`です。詳細な規約は
[`docs/mathematical-model.md`](docs/mathematical-model.md)に記載しています。

画面上の運動は構造を目で追えるよう`x(t) = 0.31t`へ減速しています。画面の55Hz表記は解析的スペクトルを音響周波数へ対応させた値であり、円が実時間で毎秒55回転するという意味ではありません。

## Representation Layers

- **厳密な数学層**: エピサイクル、接続ベクトル、主履歴波形、解析的係数スペクトル
- **ソニフィケーション層**: 同じ調波指数を、移調、知覚補正、帯域制限、エンベロープを伴って音楽的に発音
- **詩的な造形層**: 粒子、光の膜、星雲、ブルーム、二次トレイル。音声と共有スコアへ反応するが、級数そのもののグラフではない

円、フェーザ終点、connector、主波形は常に`x(t) = 0.31t`の厳密な級数だけから
計算されます。発音イベントはこれらの座標、半径、線幅を変形しません。

## Audiovisual Score

音声と詩的な造形は、80 BPM、4/4、48小節、合計144秒の決定的なイベント表を
共有します。構成は`導入 → 成長 → 開花 → 静寂 → 再開`で、最後の小節から
導入へ連続的に戻ります。

イベント表はアプリ起動時に解析的フーリエ級数から一度だけ生成されます。
AudioWorkletは渡された表をサンプル精度で読み、描画側は同じ表をフレーム時刻から
再構成します。Worklet内で区間、発音マスク、carrier列を再定義しません。

各発音時刻`tₑ`では`z(0.31tₑ)`を`ΣAₖ`で正規化し、実部を定位、虚部を
後段low-passの明るさ、絶対値をアクセントと余韻へ有界に写像します。粒子のburstは
その履歴終点を起点にしますが、現在の厳密な終点座標は変更しません。

## Requirements

- macOS最新版
- Chrome最新版
- [Volta](https://volta.sh/)
- Node.js `24.16.0`
- npm `11.17.0`

Node.jsとnpmは `package.json` の `volta` フィールドでプロジェクト単位に固定しています。
Voltaを導入した状態でこのディレクトリへ移動すると、固定バージョンが使用されます。

## Development

```bash
node --version
npm --version
npm install
npm run dev
```

依存パッケージのinstall scriptはバージョン単位で審査し、未審査のものは
インストール時に拒否します。審査が必要な場合は
`npm approve-scripts --allow-scripts-pending` で対象を確認してください。

すべての品質検証:

```bash
npm run check
```

個別のコマンド:

```bash
npm run format
npm run format:check
npm run lint
npm run lint:fix
npm run typecheck
npm test
npm run build
```

コード整形はBiome、静的解析はOxlint、型検査はTypeScriptが担当します。
Biomeのlinterは無効化し、規則の二重管理を避けています。

## Controls

- `Space`: 再生 / 一時停止
- `D`: 詳細パネル
- `F`: 全画面
- UI: 音量、詳細、全画面

音声はブラウザの自動再生制限に従い、`ENTER FOURIER GARDEN`を押した後に開始します。初期音量は35%で、変更値はローカル保存されます。

音響は共有スコアの有効イベントで短く発音します。発音中心は基準周波数
`f₀ = 55 Hz`の8倍・9倍（440 / 495 Hz）です。同じ調波指数
`nₖ = 4k+1`を使いますが、高次成分には`(k+1)^-1.4`の知覚補正を加え、
ナイキスト周波数を越える成分を除外します。したがって、音声は表示級数の
無加工再生ではなく、明示的に定義されたソニフィケーションです。
外部音源ファイルは使用せず、音声、残響インパルス、映像を実行時に生成します。

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

`src/patterns/registry.ts`が章レジストリです。各章は数式、数学的来歴、音響プリセット、
共有イベントスコア、解説、遅延ロードされるシーンをまとめて登録します。
`operation`、係数の由来、フェーザ投影軸、FFT使用有無、音声が
ソニフィケーションであることを構造化データとして保持します。

`src/audio/musicalScore.ts`は48小節のイベント表を構築し、
`CanvasStage`と`AudioEngine`が同一プログラムを参照します。映像とAudioWorkletは
共通の`Transport`を使い、音声開始後は`AudioContext.currentTime`へ同期します。
AudioWorkletは受け取ったイベントをサンプル精度で評価し、描画側は同じ時刻の
ハロー、burst、膜、flow、bloomを決定的に再構成します。

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
