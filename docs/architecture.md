# アーキテクチャ

V2現状品質版の現行構造。数学を原因として音響・視覚へ写し、共有transportで絶対時刻を渡す。

| 責務 | 所有する場所 |
| --- | --- |
| 章登録・契約 | `src/patterns/registry.ts`、`contracts.ts` |
| 純粋数学 | 章の`math/`、意味が共通の演算は`src/math/` |
| スコア・数学写像・参照DSP | 章の`audio/`、共有ピコは`src/audio/pikoProgram.ts` |
| 標本生成 | `public/audio/fourier-worklet.js`と`chapters/` |
| 音声グラフ・出力時計 | `AudioEngine.ts`、`presentationClock.ts` |
| 共有イベントの視覚評価 | `src/experience/pikoEventField.ts` |
| 章の空間・厳密描画 | 章の`scene/` |
| 共有の局所共鳴・大気 | `src/rendering/analytic/`、`cinematic/` |
| 再生・遷移・可視性・エラー | `src/app/useFourierGardenController.ts` |
| 詳細・目録・ヒント・自動非表示・全画面のUI状態 | `src/app/useGardenInterface.ts` |
| scene初期化・復旧・rAF | `src/components/CanvasStage.tsx` |
| 観察の入口 | 各章の`observation.ts`、`DetailsPanel.tsx` |
| 操作する数学比較 | 各章の`study.ts`、`MathematicalStudy.tsx` |
| 章を渡る残像 | `chapterEcho.ts`、`ChapterAfterimage.tsx` |

## 音と光の時計

音声開始はAudioContext上の未来epochへ予約する。Workletは位置とepochを原子的に受け、
予約標本より前は無音、遅延受信では絶対時刻へ追い付く。
Transportは同じepochを使い、予約前は開始位置を保持する。

描画用時計は`getOutputTimestamp()`を優先し、デバイス出力位置をperformance時計で外挿する。
使えない場合はcurrentTimeからbase/output latencyを引く。共通コンプレッサーの
lookahead推定6 msも補償する。これは出力時計の推定であり、画面走査・物理音響までの
測定結果ではない。実測QAで限界を記録する。

音なし入口はAudioContextを作らずperformance時計を使う。音を有効にすると保持位置から
音声時計へ切り替える。一時停止中の消音解除だけでは再生しない。

## イベントと状態

共有ピコ7章の視覚サンプラーは音声と同じイベント表・有限包絡・絶対時刻panを使う。
二分探索と固定プールで活動中の声部のみ評価し、音色の初期接触成分も局所材質応答へ渡す。
残光は有限発音後の詩的な余韻として別に扱う。数学座標は章内の純粋関数から導く。

再生要求は世代番号で取り消す。章切替は旧sceneの最後の描画直後に一枚の残像を保存し、
旧音声を止めて残響グラフを0.5〜0.85秒で減衰させる。残像のopacityは同じmaster包絡を
デバイス出力時計で評価する。残像は詩的な記憶であり、次章の数学表示ではない。
旧数学時刻は次章導入時に0へ戻す。新sceneの初回描画後に音声を予約し、
新masterの立ち上がりを旧章の残る減衰時間以上にする。固定の最低待機時間は設けない。
旧sceneの遅延通知は無視する。
GPU復旧中は音も止め、準備後に保持位置から再開する。恒久エラーでは明示的な再試行を提供する。

Workletのprogramエラーとブラウザの`processorerror`はAudioEngineが一度だけ通知し、
masterを閉じてTransportも停止する。再試行・再生操作では失敗したグラフを破棄し、
保持位置と音量から新しいAudioEngineを作る。古いグラフの遅延通知を新しい再生へ混ぜない。
音なしの継続は別の時計で成立させ、音声へ戻す操作時に新しいグラフを初期化する。

残像は最大約1,048,576画素／長辺2048画素の2D canvasに制限する。captureは次の描画を待ち、
80 ms以内に得られなければ残像なしで進む。二つの3D sceneは同時に動かさない。
旧音声グラフは最大一つまで残し、速い連続切替、非表示、unmountで破棄する。
残像の所有者はcontrollerで、effectの再マウントで早期破棄しない。
サイズ0の一時的なResizeObserver通知をカメラへ渡さない。

## 資源と境界

sceneはgeometry/material/textureと購読を、CanvasStageはrAFとDOMイベントを、AudioEngineは
AudioNodeとAudioContextを所有する。失敗したWebGPU初期化も破棄してWebGL2へ再試行する。
共有コードから章実装、章から別章をimportしない。標本ループの一時割り当てを避ける。
