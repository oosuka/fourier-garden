# 性能目標と測定

目標と実測を分ける。V1の結果はV2の合格証拠として流用しない。
2026年9月22日時点の現状品質版はユーザー受入済みである。未測定の物理AV遅延、実GPU完了時間、
実GPUメモリ、知覚評価は合格へ拡張せず、下記の実測限界として保持する。

## 対象

macOS、デスクトップChrome、基準機MacBook Air M2／10-core GPU／16 GB RAM。
2880×1864で60 fps、3840×2160固定viewportで60秒の平均60 fpsを目標とする。
CSS viewport、devicePixelRatio、canvas実ラスタ、renderer、quality、seedを必ず併記する。

数学線・文字・UI・同期を保ち、負荷時は粒子、膜の内部解像度、Bloom、残光から削減する。
実装上のWebGL大ラスタ条件などはコードを確認し、目標値で実測を置き換えない。

## 測る項目

rAF間隔、平均fps、p95フレーム間隔、長い欠落、CPU送出時間、実ラスタ、品質遷移を記録する。
CPU送出時間はGPU完了時間ではない。GPU負荷は別の証拠がなければ未測定とする。
章切替と長時間再生でgeometry、texture、AudioContext、timer、イベントの残留を確認する。
非表示や別タブ操作を含む試行はforegroundの性能試行と分ける。

## 2026年9月22日 C10後のDSP再確認

2026年9月22日時点の版では`rtk proxy npm run qa:audio-performance`が75テスト成功。48 kHz／128標本のNode VM代表block p95最大はMöbiusの1.092 msで、目標1.333 ms未満だった。`npm run check`は102テストファイル・760テスト成功・0スキップで、production buildのpostProcessing chunkは約1.1 MBの警告が残る。実行条件と限界は[進捗記録](qa/renewal/progress.md)に記載した。ブラウザの実時間音声スレッド、章切替中の二重graph、聴感上の章間比較を測定した結果ではない。

## 測定履歴

各章・renderer・画面比率の測定条件と結果、過去のDSP比較は[性能の測定履歴](performance-history.md)に保存する。
