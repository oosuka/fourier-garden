# Luna継続作業の台帳

2026年9月13日作成。最終更新: 2026年9月22日。実行手順と完了条件は
[引き継ぎプロンプト](luna-handoff.md) を使う。
V2は2026年9月22日時点の現状品質で完成扱い（ユーザー受入）。現行の配布メタデータはVersion 2.0.0。下の項目は客観的な測定状態を保持し、未測定を合格へ変更しない。

## 運用

- 1つのIDが1つの実行単位。別のCodexタスクをID数だけ自動生成しない。
- V＝表示・実験・reduced motion、P＝4K 60秒、T＝高DPI・全幕・連続動作・局所因果。
- G＝WebGPU、L＝WebGL2。M＝数学・主張。番号はレジストリ順。
- 状態は「未実施」「一部済」「実施中」「合格」「要修正」「要再計測」「証拠不足」で管理する。
  「既存証拠」は記載条件の証拠を再利用できる初期状態。G00で対象版と影響範囲を確認して合格へ移せる。
- 既存の未追跡実装と利用者の変更を保持する。証拠が必要なだけの項目を未実装として作り直さない。
- 合格時は日時、対象版、証拠ファイル、対象条件を追記する。影響する修正が入った時だけ合格を取り消す。
- 同じブラウザ試行が複数カードの条件を満たした場合、同じ証拠を参照してよい。測定していない条件へ拡張しない。

次の必須作業はなし（ユーザー受入で終了）。C00–C10cは実施記録済み。C11の初回試行はOSロック影響で不採用、今回の基準1440×900 CSS・DPR1再計測はT06-G/Lとも開始／終端窓に50ms超が残ったため「測定済み・不合格」とした。raw証拠と制約は[進捗記録](progress.md)、[C11計測JSON](c11-continuous-observation-2026-09-22.json)を参照する。C11の残りは任意の追加計測として保持する。
2026年9月21日のC08で全10章の数学主張・音響／視覚写像・有限計算の限界を台帳へ反映した。LissajousとPhase Torusの音高説明を現行スコアへ合わせ、対象テスト103件と型検査を確認。これは文書と有限回帰の同期確認であり、V2完成判定ではない。

## 共通作業

| ID | 推論 | 作業 | 初期状態 | 証拠・次の行動 |
| --- | --- | --- | --- | --- |
| G00 | high | 作業ツリー、版、正本、既存証拠の確認 | 合格 | 2026-09-22の作業開始時。`feat/renewal`、当時の版1.0.0、Volta Node 24.21.0 / npm 11.19.1、`@types/node` 24.13.6、commit `d7870da`を確認。現行版は2.0.0。既存変更を保持し、追加変更はこの記録後に検証する。巻き戻しなし |
| U01 | high | 音あり／なし入口・取消・初発音 | 合格 (C09) | 音なし入場・開始取消・audio init失敗/retry・scene recoveryと通常開始の状態回帰。初発音の実聴・物理AV遅延は未測定 |
| U02 | high | キーボード・focus・音量・fullscreen | 合格 (C09) | Space/D/F/Escape、focus復元、入力中Space、章目録矢印/Home/End、fullscreen失敗表示を確認。Chrome fullscreen自体は環境制限で開始せず |
| U03 | high | 全10章の移動・連続選択・ノート併用遷移 | 合格 (C09) | 10章を章目録から連続選択。ノートtab、Haar J=0、chapter change後のscroll resetはUI・回帰で確認。知覚残響はC10/C11に残す |
| U04 | high | reduced motion・contrast・支援技術の状態 | 一部済 | C06でOS設定（CSS）とscene用QA queryを分離し、reduced flagを7章×両rendererで確認。contrast・支援技術全体は未完 |
| L01 | xhigh | 音声／scene失敗・GPU復旧・非表示復帰 | 一部済 | 既存回帰はある。実操作と対象版の対応を確認 |
| L02 | xhigh | 両rendererで章を2巡し、所有資源と破棄を確認 | 証拠不足 | 実GPUメモリを測れない場合は区別して記録 |
| A01 | xhigh | 全周期レンダー・帯域・校正・参照／Worklet | 一部済 | [10章8kHz dry指標](audio-c12-anti-alias-2026-09-22.json)を再生成。全章×全サンプルレート×全周期の参照／Worklet網羅測定は未実施 |
| A02 | high | DSP性能・隣接章の音響差 | 一部済 | 2026-09-22の現行版で[`qa:audio-performance`](progress.md)75/75成功。Node VM代表block p95最大1.092 ms（Möbius、目標1.333 ms未満）。隣接章の知覚評価とブラウザ音声スレッドは未完 |
| R01 | xhigh | 最終の読み取り専用数学監査 | 合格 (C12監査) | Criticalなし。Besselは4096分割の独立比較、Haarはscaling＋63 waveletの全64×64内積を追加。Bessel関数・零点表自体の外部高精度照合は未実施 |
| R02 | xhigh | 最終の読み取り専用DSP監査 | 合格 (C12監査) | TS／WorkletのantiAliasRatio上限を0.9へ統一し、structured-clone境界とWorklet契約を回帰。全組合せA01網羅測定と物理出音は未測定 |
| R03 | xhigh | 最終の読み取り専用描画・性能・寿命監査 | 一部済 | 専用3章のWebGPU失敗時破棄／WebGLフォールバック、Residue dispose冪等化、sceneReady待機解決を実装確認。故障注入テスト、C11・L02・実GPUメモリは未完 |
| D01 | high | 正本・進捗・実装計画・31要件対応の同期 | 合格（受入） | 2026-09-22のskip解消・監査修正・`@types/node` 24.13.6への是正・T06基準viewport証拠・ユーザー受入による完成扱いを追記。未測定範囲は限界として保持 |
| F01 | high | 最終checkと証拠に基づく完成判定 | 受入完了（ユーザー判断） | 全体check・audio性能・文書監査を確認。C11の未測定は合格にせず、現状品質版として受入 |

## 全章・両renderer

下のV/P/Tは、それぞれ独立したカード。1行を一括の巨大な実装タスクにしない。
Tの連続10分は今回提案する観察窓で、元依頼が指定した時間や無期限保証ではない。

| 章 | renderer | V：表示と操作 | P：4K | T：時間・因果・高DPI | 引き継いだ証拠・注意 |
| --- | --- | --- | --- | --- | --- |
| 01 Residue | WebGPU | V01-G 合格 | P01-G 合格 | T01-G 合格 | 2026-09-13。V01-G/P01-Gに加え、実ブラウザ639×789 CSS・DPR2・canvas CSS1024×789／実ラスタ2048×1578で約10分・4周回の前景連続観察、開始／終盤60秒計測、pause/resume、8945.448秒への長い絶対seek、143.9→144秒の逆seek／周回境界、局所発光と波形先端の追従を確認。[開始](luna-residue-bloom-webgpu-dpr2-t01-start.json)／[終盤](luna-residue-bloom-webgpu-dpr2-t01-end.json)。音色の知覚評価、物理AV遅延、実GPU完了時間は未測定 |
| 01 Residue | WebGL2 | V01-L 合格 | P01-L 合格 | T01-L 合格 | 2026-09-13。V01-L/P01-Lに加え、実ブラウザ639×789 CSS・DPR2・canvas CSS1024×789／実ラスタ2048×1578で約10分・4周回の前景連続観察、開始／終盤60秒計測、pause/resume、8945.448秒への長い絶対seek、143.9→144秒の逆seek／周回境界、局所発光と波形先端の追従を確認。[開始](luna-residue-bloom-webgl-dpr2-t01-start.json)／[終盤](luna-residue-bloom-webgl-dpr2-t01-end.json)。音色の知覚評価、物理AV遅延、実GPU完了時間は未測定 |
| 02 Cathedral | WebGPU | V02-G 合格 | P02-G 既存証拠 | T02-G 合格 | 2026-09-13。V02-Gの表示条件に加え、実ブラウザ639×789 CSS・DPR2・canvas CSS1024×789／実ラスタ2048×1578で10分超・8周回以上の前景連続観察、開始／終盤60秒計測、pause/resume、8945.448秒への長い絶対seek、74.9→75秒の逆seek／周回境界、波面・節線と柱の局所impactの追従を確認。[開始](luna-spectral-cathedral-webgpu-dpr2-t02-start.json)／[終盤](luna-spectral-cathedral-webgpu-dpr2-t02-end.json)。音色の知覚評価、物理AV遅延、実GPU完了時間は未測定 |
| 02 Cathedral | WebGL2 | V02-L 合格 | P02-L 既存証拠 | T02-L 合格 | 2026-09-13。V02-Lの表示条件に加え、実ブラウザ639×789 CSS・DPR2・canvas CSS1024×789／実ラスタ2048×1578で10分超・8周回以上の前景連続観察、開始／終盤60秒計測、pause/resume、8945.448秒への長い絶対seek、74.9→75秒の逆seek／周回境界、波面・節線と柱の局所impactの追従を確認。[開始](luna-spectral-cathedral-webgl-dpr2-t02-start.json)／[終盤](luna-spectral-cathedral-webgl-dpr2-t02-end.json)。音色の知覚評価、物理AV遅延、実GPU完了時間は未測定 |
| 03 Prime | WebGPU | V03-G 合格 | P03-G 合格 | T03-G 合格 | 2026-09-13。V03-G/P03-Gの表示条件に加え、実ブラウザ639×789 CSS・DPR2・canvas CSS1024×789／実ラスタ2048×1578で10分超・10周回以上の前景連続観察、開始／終盤60秒計測、pause/resume、8945.448秒への長い絶対seek、59.9→60秒の逆seek／周回境界、素数点・24リンク・局所ハイライトの追従を確認。[開始](luna-prime-constellation-webgpu-dpr2-t03-start.json)／[終盤](luna-prime-constellation-webgpu-dpr2-t03-end.json)。音色の知覚評価、物理AV遅延、実GPU完了時間は未測定 |
| 03 Prime | WebGL2 | V03-L 合格 | P03-L 要再計測 | T03-L 合格 | 2026-09-14。V03-L/P03-Lの表示条件に加え、実ブラウザ639×789 CSS・DPR2・canvas CSS1024×789／実ラスタ2048×1578で約745秒・12周回以上の前景連続観察、開始／終盤60秒計測、pause/resume、8945.448秒への長い絶対seek、59.9→60秒の逆seek／周回境界、25素数点・24リンク・局所ハイライトの追従を確認。[開始](luna-prime-constellation-webgl-dpr2-t03-start.json)／[終盤](luna-prime-constellation-webgl-dpr2-t03-end.json)。4Kは初回[luna-prime-constellation-webgl-4k-01.json](luna-prime-constellation-webgl-4k-01.json)と再計測[luna-prime-constellation-webgl-4k-02.json](luna-prime-constellation-webgl-4k-02.json)を保存したが、各1回の50ms超過あり。音色の知覚評価、物理AV遅延、実GPU完了時間は未測定 |
| 04 Möbius | WebGPU | V04-G 合格 | P04-G 既存証拠 | T04-G 合格 | 2026-09-14。V04-Gの表示条件に加え、実ブラウザ639×789 CSS・DPR2・canvas CSS1024×789／実ラスタ2048×1578で約604秒・10周回以上の前景連続観察、開始／終盤60秒計測、pause/resume、8945.448秒への長い絶対seek、56.4→56.5秒の逆seek／周回境界、帯の進行波・節線・声部リボン・局所発光の追従を確認。[開始](luna-mobius-choir-webgpu-dpr2-t04-start.json)／[終盤](luna-mobius-choir-webgpu-dpr2-t04-end.json)。音色の知覚評価、物理AV遅延、実GPU完了時間は未測定 |
| 04 Möbius | WebGL2 | V04-L 合格 | P04-L 既存証拠 | T04-L 合格 | 2026-09-14。V04-Lの表示条件に加え、実ブラウザ639×789 CSS・DPR2・canvas CSS1024×789／実ラスタ2048×1578で約615秒・10周回以上の前景連続観察、開始／終盤60秒計測、pause/resume、8945.448秒への長い絶対seek、56.4→56.5秒の逆seek／周回境界、帯の進行波・節線・声部リボン・局所発光の追従を確認。[開始](luna-mobius-choir-webgl-dpr2-t04-start.json)／[終盤](luna-mobius-choir-webgl-dpr2-t04-end.json)。音色の知覚評価、物理AV遅延、実GPU完了時間は未測定 |
| 05 Bessel | WebGPU | V05-G 合格 | P05-G 合格 | T05-G 合格 | 2026-09-14。V05-G/P05-Gの表示条件に加え、実ブラウザ639×789 CSS・DPR2・canvas CSS1024×789／実ラスタ2048×1578で約614秒・8周回以上の前景連続観察、開始／終盤60秒計測、pause/resume、8945.448秒への長い絶対seek、71.9→72秒の逆seek／周回境界、円盤の節円・節径・中心明暗・局所共鳴の追従を確認。[開始](luna-bessel-tide-webgpu-dpr2-t05-start.json)／[終盤](luna-bessel-tide-webgpu-dpr2-t05-end.json)。音色の知覚評価、物理AV遅延、実GPU完了時間は未測定 |
| 05 Bessel | WebGL2 | V05-L 合格 | P05-L 合格 | T05-L 合格 | 2026-09-14。V05-L/P05-Lの表示条件に加え、実ブラウザ639×789 CSS・DPR2・canvas CSS1024×789／実ラスタ2048×1578で約630秒・8周回以上の前景連続観察、開始／終盤60秒計測、pause/resume、8945.448秒への長い絶対seek、71.9→72秒の逆seek／周回境界、円盤の節円・節径・中心明暗・局所共鳴の追従を確認。[開始](luna-bessel-tide-webgl-dpr2-t05-start.json)／[終盤](luna-bessel-tide-webgl-dpr2-t05-end.json)。音色の知覚評価、物理AV遅延、実GPU完了時間は未測定 |
| 06 Lissajous | WebGPU | V06-G 合格 | P06-G 合格 | T06-G 要再計測 | 初回はOSロック影響で不採用。再計測は1440×900 CSS・DPR1で約10分観察、開始59.7666fps（50ms超2回、最大66.2ms）、終端59.8655fps（50ms超2回、最大52.1ms）。基準条件のraw証拠は[C11記録](c11-continuous-observation-2026-09-22.json)内の`T06-G-webgpu-*-target` |
| 06 Lissajous | WebGL2 | V06-L 合格 | P06-L 合格 | T06-L 要再計測 | 初回はOSロック影響で不採用。再計測は1440×900 CSS・DPR1で約10分観察、開始59.8995fps（50ms超1回、最大51.0ms）、終端59.8832fps（50ms超1回、最大50.1ms）。基準条件のraw証拠は[C11記録](c11-continuous-observation-2026-09-22.json)内の`T06-L-webgl-*-target` |
| 07 Dirichlet | WebGPU | V07-G 合格 | P07-G 合格 | T07-G 要再計測 | 2026-09-22に10分超観察・seek等を試行。終盤60秒49.8fps、最大600ms、50ms超65回（記録外33回）。直後にMacロックを確認。原因は未確定、合格に数えず[C11記録](c11-continuous-observation-2026-09-22.json) |
| 07 Dirichlet | WebGL2 | V07-L 合格 | P07-L 合格 | T07-L 証拠不足 | 連続観察は未実施。4K P07-Lの証拠は[luna-dirichlet-lanterns-webgl-4k-01.json](luna-dirichlet-lanterns-webgl-4k-01.json) |
| 08 Haar | WebGPU | V08-G 合格 | P08-G 合格 | T08-G 証拠不足 | 2026-09-13。3比率の全景／ノート、J=0/3/6、reduced motion、KaTeX幅を実画面で確認。4Kは[luna-wavelet-rain-webgpu-4k-01.json](luna-wavelet-rain-webgpu-4k-01.json) |
| 08 Haar | WebGL2 | V08-L 合格 | P08-L 合格 | T08-L 証拠不足 | 2026-09-13。3比率の全景／ノート、reduced motion、KaTeX幅を実画面で確認。4Kは[luna-wavelet-rain-webgl-4k-01.json](luna-wavelet-rain-webgl-4k-01.json) |
| 09 Riemann | WebGPU | V09-G 合格 | P09-G 合格 | T09-G 証拠不足 | 2026-09-13。3比率の全景／ノート、M=12→96→48、数学詳細、reduced motion、0／16／32／48／64／80秒の5幕境界、WebGPUのerror／warnログ空を確認。4K記録は[luna-riemann-veil-webgpu-4k-01.json](luna-riemann-veil-webgpu-4k-01.json) |
| 09 Riemann | WebGL2 | V09-L 合格 | P09-L 合格 | T09-L 証拠不足 | 2026-09-13。3比率の全景／ノート、M=12→96→48、数学詳細、reduced motion、0／16／32／48／64／80秒の5幕境界、WebGL2のerror／warnログ空を確認。4K記録は[luna-riemann-veil-webgl-4k-01.json](luna-riemann-veil-webgl-4k-01.json) |
| 10 Torus | WebGPU | V10-G 合格 | P10-G 合格 | T10-G 一部済 | 2026-09-13。3比率の全景／ノート、1／3/2／√2、数学詳細、reduced motion、0／12／30／54／72／84秒の5幕境界、WebGPUのerror／warnログ空を確認。4K記録は[luna-phase-torus-webgpu-4k-01.json](luna-phase-torus-webgpu-4k-01.json) |
| 10 Torus | WebGL2 | V10-L 合格 | P10-L 合格 | T10-L 証拠不足 | 2026-09-13。3比率の全景／ノート、1／3/2／√2、数学詳細、reduced motion、0／12／30／54／72／84秒の5幕境界、WebGL2のerror／warnログ空を確認。4K記録は[luna-phase-torus-webgl-4k-01.json](luna-phase-torus-webgl-4k-01.json) |

P02-G/Lの根拠は `cathedral-dpr-webgpu-4k.json`／`cathedral-dpr-webgl-4k.json`。
P04-G/Lは `mobius-dpr-webgpu-4k.json`／`mobius-dpr-webgl-4k.json`。
ノートを閉じた記録であり、その後のノートの改行だけを理由に再計測しない。
対象描画・音声・時計の変更があれば、影響を確認して再計測する。

## 1章ずつの数学と主張

すべてxhigh推奨。既存の数学実装やテストを作り直すカードではなく、現行の主張との照合。

| ID | 章 | 状態 | 主な確認点 |
| --- | --- | --- | --- |
| M01 | Residue | 合格 (C08) | 13項、4k+1、係数、フェーザ、投影、有限包絡を照合。`chapter-claim-ledger.md` C08表 |
| M02 | Cathedral | 合格 (C08) | 境界、λ、12モード、係数正規化と光柱の演出境界を照合。C08表 |
| M03 | Prime | 合格 (C08) | 25素数、位相、正規化有限和、音高圧縮、点とpanを照合。C08表 |
| M04 | Möbius | 合格 (C08) | 継ぎ目符号、6許容モード、平坦商空間と3D埋め込みの差を照合。C08表 |
| M05 | Bessel | 合格 (C08/C12監査) | Dirichlet根、10 radial class、17実モード、節線、64点求積を照合。4096分割中点積分による係数比較を追加。Bessel関数・零点表自体の外部高精度照合は未実施 |
| M06 | Lissajous | 合格 (C08) | 閉軌道、9×32点、288等間隔イベント、現行音高式を照合。詳細回帰で288件とブラウザ表示を確認 |
| M07 | Dirichlet | 合格 (C08) | 有限核、D_N(0)、奇数支持、Fejér重みと主張範囲を照合。C08表 |
| M08 | Haar | 合格 (C08/C12監査) | 63 wavelet＋scaling、V₆の64半開区間、支持・積分と利得分離を照合。全64基底の単位ノルム・相互直交を64セル中点で追加確認 |
| M09 | Riemann | 合格 (C08) | n²／1/n²、有限部分和、音高・数学gain分離、無限極限の限界を照合。詳細回帰で285件 |
| M10 | Torus | 合格 (C08) | 24指標、√2流、有理比較、現行音高式と有限履歴の限界を照合。詳細回帰で420件とブラウザ表示を確認 |

## 不具合カード

この表が不具合ゼロの証明ではない。未検証のカードが残っている。
前タスクで直したノート値保持、読取位置、DPR、Möbius式幅は既存実装として保持する。

| ID | 発見元 | 再現・原因 | 最小修正と対象 | 回帰・実画面 | 無効になった証拠 | 状態 |
| --- | --- | --- | --- | --- | --- | --- |
| FIX-001 | V06-G | 1440×900でLissajousの第1恒等式がclientWidth=361px／scrollWidth=364px。長い単一行が原因 | `aligned`の2行へ整理。`src/patterns/newChapterDetails.test.tsx`へ行構造の回帰を追加 | 対象回帰15件成功、build成功。修正後3比率の式幅超過なし | 修正前のV06-G式幅観察 | 解決 |
| FIX-002 | V07-G | 1440×900でDirichletの第1恒等式がclientWidth=361px／scrollWidth=369px。長い単一行が原因 | `aligned`の2行へ整理。`src/patterns/newChapterDetails.test.tsx`へ行構造の回帰を追加 | 対象回帰16件成功、build成功。修正後3比率の数学詳細4件に幅超過なし | 修正前のV07-G式幅観察 | 解決 |
| FIX-003 | C04 / Q3 | 1440×900の詳細幅361pxで共有因果表が列幅不足となり本文が切れていた。共有の数式縮小でWavelet Rainの恒等式に5pxの横溢れも発生 | 因果説明を縦積みの見出し＋ラベル付きdlへ変更し、数値表の横スクロールは維持。文字を折り返し、Wavelet式を意味単位で2行に整理。詳細回帰を追加 | 詳細テスト27/27成功。Chromeで全10章と1440×900・1920×1080・2560×1080を確認。数式・因果欄の横溢れなし | 修正前の因果表とWavelet式の幅観察 | 解決 |
| FIX-004 | C05 / U02 | 1440×900で観察ノートを開くと、950px以下のcontainer規則が音量rangeを非表示にしていた | rangeを56px（最小48px）で残し、数値output・時刻を先に省略。native rangeとmuteのARIA状態を維持 | 回帰11/11成功。Chrome 1440×900・1024×640でrange表示、キーボード増減・Tab focus・停止中muteを確認。1024幅で隣接操作と重ならない | 修正前のrange非表示状態 | 解決 |
| FIX-005 | C06 / Q4 | 共通event-resonanceが全motion modeでvoice ageを波紋半径と位相、core拡大に使い、reduced時も装飾が伸長していた | 必須reduced flagを7sceneから渡し、波紋だけ固定。絶対時刻・局所位置・数学場・有限包絡明度を維持 | 単体＋7scene回帰39/39成功。WebGPU/WebGL2の7章を各0.020s/0.600s、1440×900・DPR1・QA reducedで確認。OS CSS設定も別経路で確認 | reduced motionの装飾に対する旧挙動 | 解決 |
| FIX-006 | C07 / L01/R03 | lowまたは4K direct中のresize/DPR更新後、highでbloomへ戻ってもEffectComposer/UnrealBloomPassが旧viewport寸法のまま残った | 適用済みwidth/height/DPRを追跡し、bloom modeでviewportが変わる時だけcomposerを同期。`setEnergy`からは再確保しない | 修正前回帰2件RED。修正後postProcessing 9/9、typecheck成功。初回low→high、1024×640 DPR2、DPRのみ、4K direct→bloom、反復quality/energyを実passで確認。WebGL2 resize確認済み | low→highまたはdirect→bloom復帰後の旧size | 解決 |
| FIX-007 | C12 / R02 | Cathedral／Möbiusのstructured-clone入力がantiAliasRatio=1を受け入れ、Nyquist近傍まで拡張できる | TS validatorとAudioWorklet validatorを0.9以下へ統一。境界値1の回帰とWorklet契約検査を追加 | 対象3ファイル52/52成功、全体check 760/760成功、audio-performance 75/75成功 | 外部programの過大ratio受入 | 解決 |
| FIX-008 | C12 / R03 | 専用3章のWebGPU init／scene／post初期化失敗時にrenderer破棄とWebGL再試行がなく、Residue disposeも非冪等だった | 3章にbackend単位のtry/catch、失敗時dispose、WebGL fallbackを追加。Residue disposeへガードを追加 | typecheck、lint、format、全体check成功。故障注入テストは未実施 | 実GPU初期化失敗・部分post初期化の実測 | 実装確認済み・故障注入未実施 |
| FIX-009 | C12 / R03 | アンマウント中に章切替がsceneReadyを待つとresolverが残り、非同期処理が解決しない | controller disposerでpending resolverをfalse解決・消去し、既存世代無効化と同時に破棄 | typecheck、lint、format、全体check成功。Reactアンマウント故障注入は未実施 | sceneReady待機中のアンマウント実測 | 実装確認済み・故障注入未実施 |

## 元の31要件への対応

現在参照できる根拠と限界を列挙する。仕様文書は意図の根拠であり、実測や完成証明ではない。
各要件の最終評価はC11の完了、独立監査、C12での全証拠確認後に行う。

| 要件 | 主な担当・既存設計 | 現行の根拠／限界 |
| --- | --- | --- |
| 01 最上位の目的 | V/T/M、product vision | `docs/product-vision.md`「品質の判断」「制作範囲」は方針を定義。利用者による体験価値評価ではない。 |
| 02 商業作品の総合品質 | V/T/U、R、F01 | 品質レビュー「完成判定を支える証拠の不足」とprogress C01–C11に現状を記録。客観的な未測定を残した現状品質版として、ユーザー受入済み。 |
| 03 Art Direction | V/T、visual design | `docs/visual-design.md`「共通言語」「章の素材と運動」と一部表示観察。全章・長時間での一貫性は未証明。 |
| 04 Graphics | V/T、R03 | `docs/visual-design.md`「厳密表示」、performance T01–T05とV01/V02/V04記録。T06-G/L終盤は外れ値、T07-Gはロック疑いで再計測。全章合格ではない。 |
| 05 Chapter固有性 | V/T、A02、Atlas | `docs/chapter-atlas.md`、`docs/audio-design.md`「聴感の基準」、claim ledgerに章別差を記載。設計・一部観察であり、設定差は聴感上の個性を証明しない。 |
| 06 時間演出 | T全章、dramaturgy | Atlasの章別「音楽形式」「観察から実験へ」とT01–T05の複数周回記録。T06–T10連続観察は未完。 |
| 07 Sound | A01/A02、T、audio design | `docs/audio-design.md`「聴感の基準」「回帰条件」、C10a–bの[`final-audio-output-2026-09-21.json`](final-audio-output-2026-09-21.json)。Offline出力の有限性・レベルを測定。ブラウザ実音、スピーカー、快適さは未評価。 |
| 08 Sound × Visual | T/M、因果対応表 | `docs/architecture.md`「イベントと状態」、因果表とC10c記録。共有時計・イベント設計と画面状態を記録したが、同時知覚評価ではない。 |
| 09 Audio-Visual Causality | T/M、R01/R02 | `docs/sound-shape-causality.md`、claim ledger、C10c JSONの10章×3イベント・90状態。無音QA観察のため物理音・知覚上の一体感は未評価。 |
| 10 Synchronization | T、U01/U03、L01、R02 | `docs/architecture.md`「音と光の時計」、T01–T05のpause/resume/seek/wrap、C10cのQA時計照合。物理出音／画面走査遅延は未測定。C11再実施が必要。 |
| 11 Cross-Modal Design | T、A02、visual/audio design | `docs/audio-design.md`の材質・局所共鳴、`docs/visual-design.md`の章素材、因果表。意図と写像はあるが、両感覚の価値向上を示す知覚証拠はない。 |
| 12 数学の強化と監査 | M全章、R01 | `docs/mathematical-model.md`、claim ledger C08、M01–M10合格。7 files／103 testsで有限モデルを照合。一般定理や無限極限を有限テストが証明するものではない。 |
| 13 知的に面白い数学 | V/M、数学実験と関連章 | Atlas「観察から実験へ」、`docs/mathematical-exploration.md`、C04全章タブとC08のLissajous/Torus操作。学習効果・初心者の理解度は未調査。 |
| 14 数学と演出 | M/T、因果対応表 | 数学正本の「詩的な造形層／正確性の不変条件」、claim ledger、C08。保持・圧縮・演出を区分。全装飾が数学的に必然とは主張しない。 |
| 15 UI / UX | U01〜U04、V | progress C04/C05/C09、詳細・音量・App等の回帰と10章の実操作。共通操作の確認であり、独立ユーザビリティ評価・全体アクセシビリティ監査ではない。 |
| 16 Opening Experience | U01、Tの開始、同期回帰 | C09で音なし入場・取消・audio init失敗/retryの回帰を確認。音あり初発の聴感・物理AV遅延は未測定。 |
| 17 Chapter Transition | U03、L01/L02、残像・残響 | `docs/architecture.md`「イベントと状態」、C09の連続選択・旧scene通知回帰。知覚残響、全故障経路、寿命監査L01/L02は未完。 |
| 18 Discoverability | U01〜U03、V | C09で章目録・詳細・操作を実使用し、`docs/qa-guide.md`に入口を記載。説明なしで機能に気づくかの評価はない。 |
| 19 Micro Interaction | U02/U04、V | C05/C09で音量range、Arrow操作、Tab/focus、Space/D/F/Escape、Home/End、1024×640を確認。hover/press時間などの全項目は未測定。 |
| 20 Camera | V/T、R03 | `docs/visual-design.md`の章別素材・運動と表示記録。カメラ全動作、酔い、観察妨害を評価した記録は不足し、合格扱いしない。 |
| 21 Performance | P/T、A02、L02、R03 | `docs/performance.md`の4K/T01–T05 DPR2連続観察とC11 raw captures。T06終盤に50ms超、T07-Gはロック直後に重大な停止。T07-L–T10、P03-L、L02は未完。GPU完了時間・メモリは未測定。 |
| 22 Accessibility | U02/U04、V | C06で7章×2rendererのreduced motionとOS `matchMedia`、C09でkeyboard/range確認。U04一部済。contrast・screen reader等の監査は未完。 |
| 23 Architecture | L01/L02、R、architecture | `docs/architecture.md`各節、C09の世代通知・失敗回帰。L01/L02の全故障経路・2巡資源寿命監査は未完。 |
| 24 AGENTS / Documentation | D01、既存の文書再編 | `AGENTS.md`の開発マップと目的別正本、claim ledger、今回の31行対応表。D01は一部済で、C12の独立監査・最終同期が残る。 |
| 25 QA | V/P/T/M/U/L/A、F01 | `docs/qa-guide.md`、progress、task boardに条件と測定結果を保存。全章両rendererのT、共通L/R/D/Fは未完。 |
| 26 Audio-Visual QA | T、A01/A02、R01/R02 | T01–T05の局所応答観察とC10cの90 visual states、別系統のC10a音声出力。音映像同時評価・物理遅延は未測定。 |
| 27 自発的な改善 | 既存改善と根拠のあるFIX | 品質レビューQ1–Q5からC01–C07の修正、C08–C10cを実施。改善記録はあるが、品質目標全体の達成ではない。 |
| 28 禁止された完成状態の排除 | R、D01、F01 | 品質レビュー「完成判定を支える証拠の不足」、C11 raw captures、C12未完記録。ユーザー受入による完成扱いと、未測定を合格としない客観記録を分けている。 |
| 29 調査と方向決定 | 9月6日V2設計、既存実装 | 初期調査は実施済み。全面調査からやり直さない |
| 30 段階的実装・検証 | progress、FIX、各カード | 品質仕上げ計画とprogress C01–C10cを逐次実施・検証。C11の未測定は限界として記録し、現状品質版をユーザー受入で終了。 |
| 31 最終完成条件 | 全カード、D01、F01 | 現状品質版として受入完了。C11残項目、物理AV遅延、実GPUメモリ、知覚評価は未測定のまま明記。 |

## 2026年9月14日の引き継ぎ記録（履歴）

```text
当時の版／作業ツリー: feat/renewal / commit 9202169 / clean
当時の次の1件: T06-G
```

現行状態はこの文書冒頭と[2026-09-22進捗記録](progress.md)を参照する。
