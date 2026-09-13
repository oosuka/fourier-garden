# Luna継続作業の台帳

2026年9月13日作成。実行手順と完了条件は [引き継ぎプロンプト](luna-handoff.md) を使う。
V2は制作中。前タスクの終了は引き継ぎの完了を意味し、下の項目の合格を意味しない。

## 運用

- 1つのIDが1つの実行単位。別のCodexタスクをID数だけ自動生成しない。
- V＝表示・実験・reduced motion、P＝4K 60秒、T＝高DPI・全幕・連続動作・局所因果。
- G＝WebGPU、L＝WebGL2。M＝数学・主張。番号はレジストリ順。
- 状態は「未実施」「一部済」「実施中」「合格」「要修正」「要再計測」「証拠不足」で管理する。
  「既存証拠」は記載条件の証拠を再利用できる初期状態。G00で対象版と影響範囲を確認して合格へ移せる。
- 既存の未追跡実装と利用者の変更を保持する。証拠が必要なだけの項目を未実装として作り直さない。
- 合格時は日時、対象版、証拠ファイル、対象条件を追記する。影響する修正が入った時だけ合格を取り消す。
- 同じブラウザ試行が複数カードの条件を満たした場合、同じ証拠を参照してよい。測定していない条件へ拡張しない。

次の1件：**T06-G**。PrimeのWebGL2 4Kは再計測待ちとして残し、全章の時間・因果・高DPI・連続動作カードを進める。

## 共通作業

| ID | 推論 | 作業 | 初期状態 | 証拠・次の行動 |
| --- | --- | --- | --- | --- |
| G00 | high | 作業ツリー、版、正本、既存証拠の確認 | 合格 | 2026-09-13。`feat/renewal`、版1.0.0、Volta Node 24.19.0 / npm 11.19.0、大量の既存変更を確認。巻き戻しなし |
| U01 | high | 音あり／なし入口・取消・初発音 | 一部済 | App／AudioEngineの既存テストと過去操作あり。最終版で不足を補う |
| U02 | high | キーボード・focus・音量・fullscreen | 一部済 | 入力中Space、停止中消音解除、全画面失敗を含める |
| U03 | high | 全10章の移動・連続選択・ノート併用遷移 | 一部済 | 残像・残響、古い世代、実験値とタブの保持 |
| U04 | high | reduced motion・contrast・支援技術の状態 | 一部済 | scene用queryとOSのCSS設定を分けて記録 |
| L01 | xhigh | 音声／scene失敗・GPU復旧・非表示復帰 | 一部済 | 既存回帰はある。実操作と対象版の対応を確認 |
| L02 | xhigh | 両rendererで章を2巡し、所有資源と破棄を確認 | 証拠不足 | 実GPUメモリを測れない場合は区別して記録 |
| A01 | xhigh | 全周期レンダー・帯域・校正・参照／Worklet | 一部済 | 現行基準 `audio-residue-v2.json`。最終音響版で比較 |
| A02 | high | DSP性能・隣接章の音響差 | 一部済 | 最終DSP版で75テスト成功の履歴。最終版の値と評価を記録 |
| R01 | xhigh | 最終の読み取り専用数学監査 | 未実施 | M01〜M10を根拠に、独立して1章ずつ確認 |
| R02 | xhigh | 最終の読み取り専用DSP監査 | 未実施 | A01/A02、音源・Worklet・時計 |
| R03 | xhigh | 最終の読み取り専用描画・性能・寿命監査 | 未実施 | V/P/T、共有rendering、L01/L02 |
| D01 | high | 正本・進捗・実装計画・31要件対応の同期 | 未実施 | 下の31要件表へ具体的な証拠を記入 |
| F01 | high | 最終checkと証拠に基づく完成判定 | 未実施 | 全必須カード、FIX、残る未測定を確認 |

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
| 06 Lissajous | WebGPU | V06-G 合格 | P06-G 合格 | T06-G 証拠不足 | V06-Gの表示・操作に加え、2026-09-13の4K・DPR1・high・seed=qa・通常motion・48kHz・音量35%・ノート閉でcomplete、60.0168秒、3601フレーム、50ms超0回。[JSON](luna-lissajous-orchard-webgpu-4k-01.json) |
| 06 Lissajous | WebGL2 | V06-L 合格 | P06-L 合格 | T06-L 証拠不足 | V06-Lの表示・操作に加え、2026-09-13の4K・DPR1・high・seed=qa・通常motion・48kHz・音量35%・ノート閉でcomplete、60.0002秒、3600フレーム、50ms超0回。[JSON](luna-lissajous-orchard-webgl-4k-01.json) |
| 07 Dirichlet | WebGPU | V07-G 合格 | P07-G 合格 | T07-G 証拠不足 | 2026-09-13。V07-Gの表示・操作に加え、4K・DPR1・high・seed=qa・通常motion・48kHz・音量35%・ノート閉でcomplete、60.0169秒、3601フレーム、50ms超0回。[JSON](luna-dirichlet-lanterns-webgpu-4k-01.json) |
| 07 Dirichlet | WebGL2 | V07-L 合格 | P07-L 合格 | T07-L 証拠不足 | 2026-09-13。V07-Lの表示・操作に加え、4K・DPR1・high・seed=qa・通常motion・48kHz・音量35%・ノート閉でcomplete、60.0002秒、3600フレーム、50ms超0回。[JSON](luna-dirichlet-lanterns-webgl-4k-01.json) |
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
| M01 | Residue | 一部済 | 4k+1、係数、フェーザ、投影、144秒周回、ソニフィケーションの重み |
| M02 | Cathedral | 一部済 | 固有モード、境界、λ、音響モード利得と局所光 |
| M03 | Prime | 一部済 | 素数集合、位相、有限計算、点とpan |
| M04 | Möbius | 一部済 | 継ぎ目の符号、許容モード、埋め込み、位相 |
| M05 | Bessel | 一部済 | 根、節径・節円、発音モード、境界 |
| M06 | Lissajous | 一部済 | 周波数比、位相、平面、句の選択 |
| M07 | Dirichlet | 一部済 | 核、有限部分和、Gibbs、Fejérの重み、固定倍率 |
| M08 | Haar | 一部済 | 平均、63係数、64半開区間、射影と積分 |
| M09 | Riemann | 一部済 | n²と1/n²、有限／無限、滑らかさの主張 |
| M10 | Torus | 一部済 | 共通変換、有理比の帰還、無理比の非帰還、有限図の限界 |

## 不具合カード

この表が不具合ゼロの証明ではない。未検証のカードが残っている。
前タスクで直したノート値保持、読取位置、DPR、Möbius式幅は既存実装として保持する。

| ID | 発見元 | 再現・原因 | 最小修正と対象 | 回帰・実画面 | 無効になった証拠 | 状態 |
| --- | --- | --- | --- | --- | --- | --- |
| FIX-001 | V06-G | 1440×900でLissajousの第1恒等式がclientWidth=361px／scrollWidth=364px。長い単一行が原因 | `aligned`の2行へ整理。`src/patterns/newChapterDetails.test.tsx`へ行構造の回帰を追加 | 対象回帰15件成功、build成功。修正後3比率の式幅超過なし | 修正前のV06-G式幅観察 | 解決 |
| FIX-002 | V07-G | 1440×900でDirichletの第1恒等式がclientWidth=361px／scrollWidth=369px。長い単一行が原因 | `aligned`の2行へ整理。`src/patterns/newChapterDetails.test.tsx`へ行構造の回帰を追加 | 対象回帰16件成功、build成功。修正後3比率の数学詳細4件に幅超過なし | 修正前のV07-G式幅観察 | 解決 |

## 元の31要件への対応

「主な担当」は検証の入口。D01で具体的な成果物・測定・観察へ結び付ける。
カードの名前があるだけで要件が満たされたと扱わない。

| 要件 | 主な担当・既存設計 | 最終の証拠／限界 |
| --- | --- | --- |
| 01 最上位の目的 | V/T/M、product vision | 未整理 |
| 02 商業作品の総合品質 | V/T/U、R、F01 | 未整理 |
| 03 Art Direction | V/T、visual design | 未整理 |
| 04 Graphics | V/T、R03 | 未整理 |
| 05 Chapter固有性 | V/T、A02、Atlas | 未整理 |
| 06 時間演出 | T全章、dramaturgy | 未整理 |
| 07 Sound | A01/A02、T、audio design | 未整理 |
| 08 Sound × Visual | T/M、因果対応表 | 未整理 |
| 09 Audio-Visual Causality | T/M、R01/R02 | 未整理 |
| 10 Synchronization | T、U01/U03、L01、R02 | 未整理 |
| 11 Cross-Modal Design | T、A02、visual/audio design | 未整理 |
| 12 数学の強化と監査 | M全章、R01 | 未整理 |
| 13 知的に面白い数学 | V/M、数学実験と関連章 | 未整理 |
| 14 数学と演出 | M/T、因果対応表 | 未整理 |
| 15 UI / UX | U01〜U04、V | 未整理 |
| 16 Opening Experience | U01、Tの開始、同期回帰 | 未整理 |
| 17 Chapter Transition | U03、L01/L02、残像・残響 | 未整理 |
| 18 Discoverability | U01〜U03、V | 未整理 |
| 19 Micro Interaction | U02/U04、V | 未整理 |
| 20 Camera | V/T、R03 | 未整理 |
| 21 Performance | P/T、A02、L02、R03 | 未整理 |
| 22 Accessibility | U02/U04、V | 未整理 |
| 23 Architecture | L01/L02、R、architecture | 未整理 |
| 24 AGENTS / Documentation | D01、既存の文書再編 | 未整理 |
| 25 QA | V/P/T/M/U/L/A、F01 | 未整理 |
| 26 Audio-Visual QA | T、A01/A02、R01/R02 | 未整理 |
| 27 自発的な改善 | 既存改善と根拠のあるFIX | 未整理 |
| 28 禁止された完成状態の排除 | R、D01、F01 | 未整理 |
| 29 調査と方向決定 | 9月6日V2設計、既存実装 | 初期調査は実施済み。全面調査からやり直さない |
| 30 段階的実装・検証 | progress、FIX、各カード | 未整理 |
| 31 最終完成条件 | 全カード、D01、F01 | 未完了 |

## 次回への短い記録

```text
実施日時:
現在の版／作業ツリー:
終えたID:
新しい証拠:
未解決FIX:
次の1件:
```
