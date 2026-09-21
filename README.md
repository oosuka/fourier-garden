# Fourier Garden

数がめぐり、音が生まれ、光の庭がひらく。

Fourier Gardenは、数学的構造から音と光をリアルタイムに生成する、デスクトップ向けの
オーディオビジュアル作品です。円の重なりから、波、素数、無限の気配へ。十の風景を
見て、聴いて、観察ノートから数学をほどいていきます。

**このブランチではVersion 2を制作中です。** 入口、鑑賞UI、出力時計による同期、
局所的な音と光の応答、章別の材質と音色を再構築しています。
全章の連続観察、音映像QA、4K性能を含む完成監査は進行中です。
[作業・検証記録](docs/qa/renewal/progress.md)と[QA台帳](docs/qa/renewal/luna-task-board.md)に、
実装済み・検証済み・未検証を分けて記載しています。

## 鑑賞する

音とともに入る入口と、音なしで入る入口があります。音声は操作後にのみ始まります。
初期音量は35%。変更した音量はこのブラウザに保存されます。全画面化は独立した操作です。

| 操作 | キー |
| --- | --- |
| 再生／一時停止、開始の取り消し | Space |
| 観察ノート | D |
| 十の章から選ぶ | C |
| 消音／音をオンにする | M |
| 全画面／解除 | F |
| ノート・章目録を閉じる | Escape |

観察ノートは映像に余白を譲って横に開きます。「やさしい説明」と「数学の詳細」の
選択は章を移っても維持されます。関連章から数学的なつながりをたどれます。
「やさしい説明」の小さな実験では、項数、位相、モードなどを動かして図を比較できます。
本編を鑑賞しながら、その形が生まれる理由を確かめられます。

## 十の数理風景

| 章 | 数学の入口 |
| --- | --- |
| 01 · Residue Bloom／剰余の花 | `4k+1`の13調波、有限フーリエ級数と円鎖 |
| 02 · Spectral Cathedral／スペクトルの聖堂 | 長方形に立つDirichlet固有モード |
| 03 · Prime Constellation／素数星座 | 97以下の25素数が進める位相と間隔 |
| 04 · Möbius Choir／メビウスの合唱 | 平坦なMöbius商空間の進行波と同一視 |
| 05 · Bessel Tide／ベッセルの潮 | 円板のFourier–Besselモード、節円と節径 |
| 06 · Lissajous Orchard／リサージュの果樹園 | 有理比の閉じる軌道とFarey列 |
| 07 · Dirichlet Lanterns／ディリクレの灯 | 有限和、Gibbs現象とFejér平均 |
| 08 · Wavelet Rain／ウェーブレットの雨 | Haar基底が捉える場所とスケール |
| 09 · Riemann Veil／リーマンの帳 | 平方数周波数による有限部分和 |
| 10 · Phase Torus／位相トーラス | 無理比で進むトーラス流とFourier文字 |

厳密な数学表示、聴覚へ写すソニフィケーション、詩的な造形を区別しています。
解析的な係数をFFT推定値と呼びません。音は元の級数の無加工再生ではありません。
定義と対応は[数学モデル](docs/mathematical-model.md)と[音と光の因果](docs/sound-shape-causality.md)へ。

## ローカルで起動する

最新版macOS／デスクトップChromeを対象に、WebGPUを通常経路、WebGL2をフォールバックに使います。
Node.js `24.21.0`、npm `11.19.1`をVoltaで固定しています。

```bash
rtk proxy npm install
rtk proxy npm run dev
```

[ローカルの作品を開く](http://127.0.0.1:5173/)。音、残響、映像は生成され、フォントは
セルフホストされます。実行時に外部音源・画像・CDN・分析通信を使いません。

```bash
rtk proxy npm run check
rtk proxy npm run qa:audio-performance
```

固定比較には`?seed=qa&quality=high`、WebGL2の確認には`renderer=webgl`を指定します。
品質を省略すると適応制御が働きます。章別の固定時刻、数学層だけの比較、音響レンダーは
[QA手順](docs/qa-guide.md)を参照してください。

## 制作の文書

- [開発マップ](AGENTS.md) · [作品の方針](docs/product-vision.md) · [アーキテクチャ](docs/architecture.md)
- [視覚設計](docs/visual-design.md) · [音響設計](docs/audio-design.md) · [性能](docs/performance.md)
- [数学モデル](docs/mathematical-model.md) · [章の比較](docs/chapter-atlas.md) · [主張台帳](docs/chapter-claim-ledger.md)
- [数学の探索](docs/mathematical-exploration.md)
- [V2設計](docs/superpowers/specs/2026-09-06-renewal-design.md) · [現在の進捗](docs/qa/renewal/progress.md)

[Version 1の概要](docs/history/version-1-overview.md)と[過去のQA](design-qa.md)は履歴として保存しています。
