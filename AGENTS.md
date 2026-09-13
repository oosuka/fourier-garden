# Fourier Garden 開発マップ

数学から音と光を生成するデスクトップ向け作品。現在は全10章を対象にVersion 2を制作中。
過去の完成宣言やQA結果を、変更後の品質証拠として使わない。

## 最初に読む文書

| 目的 | 正本・入口 |
| --- | --- |
| 作品と操作 | [README](README.md)、[作品の方針](docs/product-vision.md) |
| 現在の制作 | [V2設計](docs/superpowers/specs/2026-09-06-renewal-design.md)、[実装計画](docs/superpowers/plans/2026-09-06-renewal.md)、[進捗](docs/qa/renewal/progress.md) |
| 責務とライフサイクル | [アーキテクチャ](docs/architecture.md) |
| 定義・係数・位相・音響式 | [数学モデル](docs/mathematical-model.md) |
| 音響 | [音響設計](docs/audio-design.md) |
| 空間・材質・時間構成 | [視覚設計](docs/visual-design.md) |
| 数学から音と光への写像 | [因果対応表](docs/sound-shape-causality.md) |
| 章の比較と数学的主張 | [Chapter Atlas](docs/chapter-atlas.md)、[主張台帳](docs/chapter-claim-ledger.md) |
| QA・性能 | [QA手順](docs/qa-guide.md)、[性能](docs/performance.md)、[過去の実測](design-qa.md) |

## 守る境界

- 実行環境の指示、現在のユーザー依頼、このマップ、各正本、既存慣例の順に判断する。
- 数学は数学モデルを正本とする。不一致は数学を確認し、実装・テスト・UI・文書を一緒に修正する。
- 厳密数学、ソニフィケーション、詩的造形を区別する。数学線に装飾ノイズを混ぜず、音を元級数の無加工再生と呼ばない。
- 実施していないDFT／FFTを解析・推定・可視化したと説明しない。
- 数学時刻は絶対transport時刻。反復スコアの周回でリセットしない。
- 音声開始はユーザー操作後。音と光は同じ開始epochと局所数学イベントを共有する。
- デチューン、chirp、位相変調を含め実生成キャリア周波数を`0.45 Fs`未満にする。
- 有限包絡、クリックのない開始停止、穏やかな中域、比較可能な章間音量を保つ。
- 数学線・文字・UIの解像度と同期を優先し、負荷時は装飾から削減する。
- キーボード、フォーカス、音なし鑑賞、reduced motion、詳細パネルの選択状態を守る。
- scene、AudioNode、AudioContext、rAF、購読、タイマーを所有者が破棄する。古いsceneの通知を新しい世代へ混入させない。

## 実装の入口

- 登録は`src/patterns/registry.ts`、全章契約は`src/patterns/contracts.ts`。
- 章固有の数学・スコア・描画・説明は`src/patterns/<chapter-id>/`に置く。
- 共有実装から章実装、ある章から別の章をimportしない。
- 数学は純粋関数、音響はスコアとDSP、UIは表示と操作を担当する。
- DSP変更はTypeScript参照実装と`public/audio/`のWorkletを同時に検証する。
- 標本ループの全イベント走査、ソート、一時配列・オブジェクト生成を避ける。
- strict TypeScript、Oxlint、Biomeを維持する。型アサーションや規則無効化で問題を隠さない。

## 作業と検証

- 作業ツリーを確認し、利用者の変更を保持する。挙動の不具合は再現から始める。
- Node／npmは`package.json`のVolta固定値を使う。新規依存の前に既存APIを検討する。
- install scriptは版ごとに審査する。一括許可や別のランタイム管理設定を追加しない。
- シェルはすべて`rtk`で始める。開発は`rtk proxy npm run dev`。
- 整形は`rtk proxy npm run format`、一括検証は`rtk proxy npm run check`。
- 音響変更では`rtk proxy npm run qa:audio-performance`と決定的レンダー比較を行う。
- 描画・音響・UI変更はChromeで操作し、両rendererと対象比率を確認する。
- テスト・静止画・ベンチマークだけで完成を宣言しない。連続観察と音映像の因果を独立に評価する。
- 追加の利用者試聴を完了条件にしない。観察・測定できない事項は未検証として記録する。
- メイン実装は単一エージェント。完成前の独立監査に限り最大3体の読み取り専用エージェントで数学・DSP・GPU性能を分担できる。編集、再帰生成、重複調査は禁止。
- 文書は日本語を基本とし、現在の仕様・目標・実測・履歴を明記する。
- 要求のないコミット、プッシュ、ブランチ作成、公開をしない。依頼されたコミットメッセージは必ず日本語1行、本文なし。
- 外部通信・分析追跡・ユーザー識別を追加しない。秘密情報、ローカル絶対パス、巨大な一時録画を入れない。
- 音と映像は原則リアルタイム生成。フォント・アセットの権利を確認し、実行時CDNへ依存しない。

旧開発ガイドは[Version 1履歴](docs/history/version-1-development-guide.md)に保存する。
当時の色、粒子予算、演出値、完成宣言はV2への永続命令ではない。
