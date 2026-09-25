# V2 作業・検証記録

2026年9月25日更新。**V2は2026年9月22日に現状品質で完成扱い（ユーザー受入）。**
客観的な未測定範囲は合格へ書き換えず、受入時点の限界として保持する。

継続用の[引き継ぎプロンプト](luna-handoff.md)、[作業台帳](luna-task-board.md)、
[元の全31項目の依頼](renewal-request.md)を保存している。この記録は、実装・検証・未測定範囲と、
現状品質での受入判断を分けて記録する。

## 現在の状態（2026年9月25日）

- `package.json`と`package-lock.json`のルート版は2.0.0。Version 1の履歴資料と、更新前の開始状態を記録したQA履歴には1.0.0の表記を保持する。
- 品質仕上げ計画のC00–C10cは実施・記録済み。C11は初回T06-G/L・T07-Gを画面ロック影響で不採用とし、ロック解除後のT06-L補助観察も基準viewport外だった。2026年9月22日にT06-G/Lを1440×900 CSS・DPR1で再計測したが、開始／終端窓に50ms超の間隔が残ったため、証拠は保存しつつ合格へ拡張していない。詳細は[C11記録](c11-continuous-observation-2026-09-22.json)を参照。
- V2受入時に追加の必須品質作業は設定しなかった。T06-G/Lの50ms級停止、T07-G/L〜T10-L、P03-L、L02などの未測定範囲は、現状品質での受入後も限界として記録している。
- Node.js 24.21.0／npm 11.19.1へ更新し、`@types/node`はランタイムに合わせて24.13.6へ固定した。`npm ls`は整合し、auditの脆弱性は0件。実際の固定値は`package.json`のVolta欄を参照する。

## 2026年9月25日 UI責務・品質契約・文書の整理

- 再生コントローラーから詳細・目録・ヒント・自動非表示・全画面のUI状態を`useGardenInterface`へ分離した。音響DSPとscene描画式は変更していない。
- 10章に重複していた品質契約を`createPatternQualityContract`へ集約した。呼び出しごとに独立した同じ値のオブジェクトを作る。
- 進捗と性能の入口を短くし、日付付きの実測・作業履歴を同じ階層の履歴文書に保存した。ローカルリンク423件の参照先はすべて存在する。
- `rtk proxy npm run check`は104テストファイル・764テスト成功、整形・Oxlint・strict TypeScript・production buildも成功した。大容量chunk警告は残る。
- ChromeではWebGPUで入場、詳細・目録切替、章遷移を、WebGL2で1440×900と1280×720の入場、目録、Escape、詳細を操作し、console errorは確認されなかった。これは連続性能、実音声、物理AV遅延の再測定ではない。

## 2026年9月22日 文書監査・全体check

- リポジトリ内の追跡対象27件のMarkdown文書を確認し、現行のREADME、仕様、計画、進捗、台帳、引き継ぎ、性能記録を同期した。READMEと現行計画のNode/npmおよび依存版をpackage.jsonに合わせ、ルート版を2.0.0へ同期した。歴史記録は当時の記録として保持し、日付のある過去の「次作業」は現行指示と誤読しないよう履歴と明記した。
- luna-task-boardの31要件すべてに現行の根拠と確認限界を記入した。未測定を合格へ拡張せず、ユーザー受入による現状品質版の完成扱いを追記した。
- Markdown内の417件のローカルリンクを検査し、欠落0件。renewal QAの96件のJSONを構文検査し、すべて有効。
- `rtk proxy npm run check`は成功。Biome整形確認、Oxlint、strict TypeScript、production buildが成功し、Vitestは102ファイル成功・760 tests成功・skip 0件。production buildの大容量chunk警告は残る。
- skipの原因は、レポート名がない通常実行で`renewalAudioReport.test.ts`全体を無効化する`describe.skipIf`だった。10章dry指標の検証を常時実行する`renewalAudioReportModel.test.ts`へ分離し、JSON出力だけを`FOURIER_GARDEN_RENEWAL_AUDIO_REPORT`指定時に行うよう整理した。通常checkの検証範囲を増やし、明示的なレポート生成手順は維持している。
- 最新Oxlintで依存更新後に見つかった17件の問題を、規則無効化なしで修正した。修正後の全体checkに含めて確認。
- `rtk proxy npm run qa:audio-performance`は75/75成功。48kHz・128標本のNode VM代表block p95最大はMöbiusの1.092ms（目標1.333ms未満）。[10章8kHz dry指標](audio-c12-anti-alias-2026-09-22.json)も再生成した。
- C12の独立数学監査はCriticalなし、Besselの高精度数値比較とHaar全基底直交性を追加してImportantを解消。DSP監査はantiAliasRatioの上限をTS／Workletとも0.9へ統一し、境界回帰を追加。描画・寿命監査の指摘（専用3章のWebGPU失敗時フォールバック、Residue dispose冪等化、sceneReady待機解決）も実装し、故障注入テストは未実施として記録する。A01の全章×全サンプルレート×全周期の参照／Worklet網羅測定は未実施。
- `rtk git diff --check`成功。T06-G、T07-G、T07-L〜T10、P03-L、L02の再計測・寿命証拠、C11全項目は未完として限界を残す。ユーザー判断により、これを現状品質でのV2完成扱いとした。

## 2026年9月22日 ユーザー受入による完成扱い

- ユーザー判断により、Node.js 24.21.0／npm 11.19.1、`@types/node` 24.13.6、全体check 760 tests・skip 0、audio-performance 75/75を満たす現行版をV2完成扱いとした。
- T06-G/Lの基準viewport再計測で50ms超が残ったこと、T07以降・P03-L・L02・物理AV遅延・実GPUメモリ・知覚評価が未測定であることは、完成扱いによって合格へ変更しない。
- 追加の計測・監査は任意の継続作業とし、この受入判断をもって今回の品質仕上げタスクを終了する。

## 2026年9月22日 C11基準viewport再計測

- Chromeのviewport capabilityで1440×900 CSS、DPR1、実ラスタ1440×900を設定し、high・seed=qa・標準post-processing・無音入場・performance clockで計測した。`caffeinate -dims`をQA窓だけで有効にし、前景観察中にmacOSロックは確認されなかった。
- T06-Lは絶対150秒へseek後に約10分観察。開始は59.8995fps、間隔p95 17.7ms、最大51.0ms、50ms超1回。終端は59.8832fps、p95 18.3ms、最大50.1ms、50ms超1回。[開始](c11-browser-captures/T06-L-webgl-start-target-2026-09-22.json)／[終端](c11-browser-captures/T06-L-webgl-end-target-2026-09-22.json)。
- T06-Gは同条件で約10分観察。開始は59.7666fps、間隔p95 18.6ms、最大66.2ms、50ms超2回。終端は59.8655fps、p95 18.7ms、最大52.1ms、50ms超2回。[開始](c11-browser-captures/T06-G-webgpu-start-target-2026-09-22.json)／[終端](c11-browser-captures/T06-G-webgpu-end-target-2026-09-22.json)。
- 4窓ともraw captureを保持し、外れ値の除去や合格窓だけの選択はしていない。基準viewportの実測は進んだが、50ms超条件によりT06-G/Lは「測定済み・不合格」。pause/resumeは初回raw試行にあり、今回の再計測では繰り返していない。T07-G/L〜T10-L、P03-L、L02は未完。

## 作業履歴

9月14日以前の更新、章別の観察と測定、C01–C11の経過は[作業・検証履歴](progress-history.md)に保存する。
