# Fourier Garden V2 品質仕上げ Implementation Plan

> **For agentic workers:** 利用可能なら superpowers:executing-plans を使い、下のカードを単一エージェントで順に実行する。実装の並列委譲はしない。各チェックボックスを証拠付きで完了する。

**Goal:** V2の再構築済み基盤を保ち、確認済みの5つの欠落を直し、当初31要件に対する品質証拠と限界を揃える。

**Architecture:** 数学核・絶対transport・共通数学イベント・章固有の音響と局所座標を保つ。説明は実装の写像へ合わせる。共有UI、装飾のmotion方針、WebGL復帰を狭い責務で修正し、変更範囲に対応した証拠だけ再取得する。

**Tech Stack:** Node 24.21.0 / npm 11.19.1、React 19.3.0、TypeScript 7.0.2、Three.js 0.186.0、Vite 8.3.0、Vitest 5.0.1、Oxlint 1.85.0、Biome 2.5.14。Voltaと依存の固定版は`package.json`を正本とする。新規依存は原則不要。

**Spec:** [V2設計](../specs/2026-09-06-renewal-design.md)、[原依頼31要件](../../qa/renewal/renewal-request.md)、[今回の品質レビュー](../../qa/renewal/2026-09-21-quality-review.md)。この文書は追加の設計・実行指示で、原依頼の品質目標を下げない。

## この文書を渡されたLunaへの依頼

Fourier Garden V2の品質仕上げを実装してください。分析や計画だけで終了せず、以下の順序で修正と検証を行ってください。
参照時点は `feat/renewal`、HEAD `59e14dd1dd1e909417ffbfdf8bd23d20ff849606`。
`9202169` はV2実装とQA、`59e14dd` は文書同期です。大幅なリニューアルの基盤は既にあります。
全体を作り直さず、確認された欠落を修正し、未完の検証を終えてください。

推奨実行モデルは **gpt-5.6-luna**。通常カードは **high**、音響出力・描画復帰・数学照合・寿命は **xhigh**。
モデルや推論の変更は自動で行ったと主張せず、現在の実行設定を使ってください。
このプロンプトは同じリポジトリへアクセスできる新しいコンテキストでも実行できます。
別途渡されたレビュー文書は根拠、こちらが実行順と完了条件です。会話履歴の添付は不要です。

## 共通制約

- 最初にAGENTS.mdとそこから参照されるRTK手順を読む。シェルはすべて `rtk` で始める。
- 数学の正本は `docs/mathematical-model.md`。数学核の誤りと説明の古さを区別する。
- 数学時刻は絶対transport。スコア周回でリセットしない。数学線へ装飾ノイズを混ぜない。
- 音声はユーザー操作後に開始。同じepoch、sourceIndex、有限包絡を音と映像が共有する。
- デチューン・chirp・位相変調込みの実生成キャリアを `0.45 Fs` 未満にする。
- DSP変更はTypeScript参照実装と `public/audio/` のWorkletを同時に検証する。
- 標本ループで全イベント走査、ソート、一時配列・オブジェクト生成を追加しない。
- 描画負荷は装飾から削減。数学線・文字・UIの解像度と同期を保つ。
- strict TypeScript、Oxlint、Biomeを維持。型アサーション、規則無効化、テスト削除で通さない。
- 利用者の変更を保持。要求のないコミット、push、ブランチ作成、公開、依存更新はしない。
- 追加の利用者試聴を完了条件にしない。聞いていない音、観察していない時間を合格にしない。
- 今回の実装は単一エージェント。最終独立監査だけAGENTSの許す最大3体・読み取り専用を利用できる。
- QAの日時、版、renderer、CSS viewport、canvas寸法、DPR、quality、音声設定を残す。
  巨大な一時録画、秘密、ローカル絶対パスをリポジトリへ入れない。

## Review Focus

1. ノートを開いてstageが狭くなっても音量調整・focus・読取位置が使えること（C04/C05/C09）。
2. 数学係数の保存と音響への変換を混同しないこと（C01–C03/C08）。
3. reduced motionでも数学時計と局所因果を保ち、装飾拡大を抑えること（C06）。
4. low中のresize/DPR変更後にhighへ戻しても、最新ラスタで描画し、毎フレーム再確保しないこと（C07）。
5. pause、逆seek、周回、素早い章切替、非表示復帰で古い音・scene・通知が混入しないこと（C10/C11）。

## 作業の進め方と記録

1カードずつ「再現→原因→最小変更→対象回帰→Chrome確認→記録」で進める。
同じ原因に対する失敗した修正を3回重ねたら、変更を増やさず再現条件と責務を再確認する。
未検証は未検証として残し、独立して進められる次カードへ進む。
既存台帳 `docs/qa/renewal/luna-task-board.md` と `progress.md` にC番号と対応する旧IDを記録する。
新しい巨大な台帳を並立させない。

各カード終了時は次の形で追記する。

```text
C番号／旧ID:
日時／対象commit／未コミット変更:
再現と原因:
変更ファイル:
検証コマンドと結果:
Chrome条件と観察:
証拠ファイル:
無効になった旧証拠／未検証:
次の1件:
```

## C00 現在地の確認（high）

- [x] `rtk git status --short` と `rtk git log -5 --oneline` を実行。HEADが違えば対象差分を確認し、既に解消された指摘は再修正しない。
- [x] V2設計、レビュー、台帳、進捗末尾、今回触る責務の正本を読む。全リポジトリの初期調査からやり直さない。
- [x] 既存725成功・1skipは9月14日の同一HEADの結果と記録。変更後の証拠へ流用しない。
- [x] この計画のC01から実行する。旧台帳の「次はT06-G」より先に既知の不具合を解決する。

## C01 Haarの説明を現在の写像へ同期（high、旧M08）

対象: `src/patterns/wavelet-rain/details/WaveletRainDetails.tsx`、同章 `audio/score.ts`、
`src/patterns/newChapterDetails.test.tsx`、`docs/sound-shape-causality.md`、必要なら数学モデルの音響写像節。

- [x] 詳細の `440+96j` とスコアの `420+62j`、支持開始と支持中心を照合する。
- [x] 詳細を次の意味へ修正する。基準音高 `f_j=420+62j Hz (j=0…5)`、基準panは
  `1.6(start+2^(-j-1))-0.8`。係数の符号は開始位相0/π、係数絶対値と実出力gainの変換を区別する。
- [x] 色の説明をsceneの現在の正負表現と照合し、色だけで符号を伝えない。音高は変調前の基準値と明記する。
- [x] 既存テストに、旧式が出ないことと新しい写像説明を加える。数値についてはスコア全イベントを確認する。

```ts
for (const event of WAVELET_RAIN_SCORE.events) {
  const j = HAAR_COEFFICIENTS[event.sourceIndex % 63]!.j;
  expect(event.frequencyHz).toBeCloseTo(420 + 62 * j, 10);
}
```

実際のイベント型を読んでフィールドを照合してから追加する。スコアを変更して説明へ合わせない。
既存の章詳細テストと該当スコア回帰を実行し、Chromeの数学詳細で式と改行を確認する。

## C02 Lissajousの説明を現在の写像へ同期（high、旧M06）

対象: `src/patterns/lissajous-orchard/details/LissajousOrchardDetails.tsx`、同章 `audio/score.ts`、
`src/patterns/newChapterDetails.test.tsx`、因果対応表。

- [x] 「左右声部の発音分割比」「整数和a+b→500–890Hz」を削除し、9比・各32点・60秒288発音の関係を書く。
- [x] `getLissajousAudioMapping(index)` を説明の根拠にし、基準音高を
  `440+12r+90(x+1)+50(y+1)` Hzと記す。比は曲線の巻回と座標を決め、発音間隔そのものは等間隔と説明する。
- [x] panの基準と時間変調を区別する。旧説明のために二声ポリリズムを新設しない。
- [x] 全イベントの間隔60/288、ratioIndexごとの32点、座標からの音高を既存mapping経由で検証する。
  UI回帰では旧主張が表示されず、新しい対応が読めることを確認する。
- [x] 対象テストとChrome数学詳細を確認。閉軌道・Farey列の数学的説明は変更しない。

## C03 Riemannの数学係数と可聴gainを分ける（high、旧M09）

対象: `src/patterns/riemann-veil/details/RiemannVeilDetails.tsx`、同章 `audio/score.ts`、
`src/patterns/newChapterDetails.test.tsx`、因果対応表、主張台帳。

- [x] 数学層の係数1/n²を保持し、実音の振幅そのものとは呼ばない。
- [x] 音高を「主発音460–700Hz、応答は0.875/0.75倍、380Hzを下限」に更新する。
  実応答の基準音高範囲は380–612.5Hz。変調前の値と明記する。
- [x] 主発音gainのn^-0.7、応答gain、発音間隔による補正、幕と長周期アクセント、最終校正を短く説明する。
  区分を単に全部「保持」にせず、保持する数学量と圧縮・演出する出力を別文で示す。
- [x] `getRiemannEventMapping` で主発音と応答を分類し、基準音高の上下限と数学gainを検証。
  「460–1,020 Hz」の旧表示が消えたことをUI回帰で確認する。
- [x] 対象テストとChrome数学詳細を確認。無限級数に対する数学的主張を有限描画から強めない。

## C04 因果説明をノート幅で読める構造にする（high、旧U04/V）

対象: `src/components/AnalyticPatternDetails.tsx`、`src/styles/details.css`、
`src/patterns/newChapterDetails.test.tsx`。必要なUIテストはこの既存ファイルへ追加する。

入力は既存の `AnalyticCausalityRow` のまま。共有コンポーネントから章をimportしない。
数学量を見出し、区分・局所映像・音響写像を縦に読む。装飾カードの乱立は避け、細い区切りだけで整理する。

```tsx
<div className="causalityEntries">
  {causality.map((row) => (
    <section className="causalityEntry" key={row.id}>
      <h3>{row.quantity}</h3>
      <dl>
        <div><dt>区分</dt><dd>{row.status}</dd></div>
        <div><dt>局所映像</dt><dd>{row.visual}</dd></div>
        <div><dt>音響写像</dt><dd>{row.audio}</dd></div>
      </dl>
    </section>
  ))}
</div>
```

- [x] 因果部分だけを上の構造へ変更。数値データ表の横スクロールは保持する。
- [x] `.causalityEntry` 内の文字は折り返し、子要素に `min-width:0` を設定。
  h3を13–14px、本文を13px程度、line-heightを1.8程度から調整。パラメータ名の16px継承を明示的なサイズへ変更。
  数式は縮小だけで収めず、意味の切れ目でaligned改行する。
- [x] 意味のある見出し、dlのラベル、全rowの本文がDOMに残ることを検証する。
  CSS文字列だけで可読性合格にしない。
- [x] Chromeで1440×900、1920×1080、2560×1080のノートを開く。
  因果部分に横スクロール・列重なり・文字欠落がなく、本文と数式の階層が整うことを確認する。
- [x] 元の全10章の数学タブを一巡。残る3章の独自詳細も文字サイズの共通CSSによる退行を確認する。

## C05 ノート併用中も音量rangeを残す（high、旧U02）

対象: `src/styles/control-bar.css`、`src/components/ControlBar.tsx`、
`src/components/ControlBar.test.tsx`、`src/components/controlBarStyles.test.ts`。

- [x] 1440×900で音あり入場→ノートを開き、音量rangeの非表示を再現する。
- [x] 950px以下のcontainerでinputを隠す指定を除き、狭いstageではrangeを56px程度まで縮める。
  音量の数値outputや経過時刻など二次表示を先に省略する。

```css
@container (max-width: 950px) {
  .volumeControl input { width: 56px; min-width: 48px; flex-shrink: 0; }
  .volumeControl output,
  .timeDisplay { display: none; }
}
```

- [x] 既存rangeのaccessible name、キーボード矢印、muteとvolumeの状態連携を維持する。
  新しいポップアップや独自スライダーは不要。既存回帰が非表示仕様を固定していたら動作要件に更新する。
- [x] Chromeで1440×900と最小デスクトップ1024×640のノート開閉を確認。
  連続調整、Tab、矢印、停止中のmute解除、フォーカス表示、隣接ボタンとの非重複を検証する。

## C06 reduced motionを局所装飾へ伝える（high、旧U04/V）

対象: `src/rendering/analytic/eventResonance.ts`、7章の `scene/scene.ts`、
新規 `src/rendering/analytic/eventResonance.test.ts`。
7章はprime-constellation、bessel-tide、lissajous-orchard、dirichlet-lanterns、wavelet-rain、riemann-veil、phase-torus。

インターフェースを `update(time: number, reducedMotion: boolean)` にする。引数を必須にして呼び忘れを型検査で検出する。
各sceneが既に受け取っているreducedMotionを渡す。Math時刻やscoreを変更しない。

```ts
const age = voice.ageSeconds;
const motionAge = reducedMotion ? 0 : age;
const radius = reducedMotion
  ? 0.06
  : 0.06 + age * (0.35 + voice.event.frequencyHz / 1800) + voice.contact * 0.12;
transform.scale.setScalar(reducedMotion ? 0.045 : 0.02 + 0.05 * Math.sqrt(voice.envelope));
// rippleの装飾的な位相にだけmotionAgeを使う。
// design.locate(voice,time,anchor)、field.sample(time)、包絡明度は現在のtimeを使い続ける。
```

- [x] reduced時に固定anchorの同じvoiceを2時刻で読み、strokeの相対形状とcoreの大きさが変わらない回帰を加える。
  通常時は相対形状が変化し、どちらも有限包絡で消えることを確認する。
- [x] 7call siteへflagを伝播。ほかの3章は既存の専用装飾のreduced経路を確認し、問題がある場合だけ別FIXにする。
- [x] ChromeのOS設定に対応するCSS reduced motionと、QA queryのscene制御を区別して検証する。
  両rendererで7章の発音直後と余韻を確認。時計・局所の明度・音なし鑑賞が続き、装飾が伸長しないこと。
- [x] 対象回帰と `src/patterns/newChapterScenes.test.ts` を実行する。

## C07 WebGL composerを復帰前に最新サイズへ合わせる（xhigh、旧L01/R03）

対象: `src/rendering/cinematic/postProcessing.ts` と同名 `.test.ts`。

- [x] 既存の実passを利用するテストの作り方を使い、次の失敗回帰を先に追加する。

```ts
processor.resize(1440, 900, 1);
processor.setQuality("low");
processor.resize(1024, 640, 2);
processor.setQuality("high");
// UnrealBloomPass.setSizeの最後の呼び出しが物理ラスタ2048×1280になること。
expect(resizeBloom.mock.calls.at(-1)).toEqual([2048, 1280]);
```

- [x] WebGlクラスでcomposerに適用済みのwidth/height/DPRを保持する。
  `syncComposerViewport()` を追加し、bloomモードかつ未同期の時だけ `setPixelRatio` と `setSize` を呼ぶ。
  resize後と `override setQuality` の `super.setQuality(level)` 後に呼ぶ。
  `applyProfile` はsetEnergyでも実行されるため、そこへ無条件resizeを入れない。
- [x] 初回low→high、DPRのみ変更、4K direct→通常bloom、同サイズのsetQuality反復を回帰に含める。
  setEnergy反復ではsetSize呼び出し数が増えないことを検証する。
- [x] Chrome WebGL2でノート開閉とサイズ変更、利用可能な正規QA操作でquality切替を確認。
  操作口がなければ無理に隠れたアプリ状態を操作せず、単体回帰と通常resizeの確認範囲を区別する。

## C08 全10章の説明と主張を照合（xhigh、旧M01–M10）

対象: 各章のmath/audio/scene/details、`docs/mathematical-model.md`、
`docs/chapter-claim-ledger.md`、`docs/sound-shape-causality.md`。

これは1章ずつの10実行単位。C01–C03の証拠は再利用し、重複調査しない。

- [x] 章ごとに「主張／数学の根拠／音への変換／光への変換／保持・圧縮・演出／有限計算の限界」を1行ずつ記録する。
- [x] Residueは4k+1と係数、Cathedralは境界と固有モード、Primeは素数集合と位相、Möbiusは継ぎ目符号、
  Besselは根と節、Lissajousは閉軌道、Dirichletは有限核とGibbs/Fejér、Haarは64半開区間と63係数、
  Riemannはn²/1/n²と有限・無限、Torusは有理帰還と無理非帰還を確認する。
- [x] 誤った実装が見つかった場合のみ、その数学命題を小さな独立回帰にして修正する。
  UIが古いだけならDSPや数学を作り直さない。数式文字列の一致だけを数学の証明にしない。
- [x] 全章が照合済みになったらM表へ証拠を反映する。

## C09 共通UIの最終操作（high、旧U01–U04）

- [x] C04/C05の後、音あり・音なし入場、取消、初描画から初発音、loading/失敗表示を確認する。
- [x] Space/D/F/Escape、入力中Space、章目録の矢印/Home/End、focus復元、全画面失敗を確認する。
- [x] ノートの章別実験値、タブ、読取位置が意図通り保持され、章移動後は正しい場所に戻ることを確認する。
- [x] 全10章を直接選択し、連続選択とノート併用でも古いタイトル・残像・音声が残らないことを確認する。
- [x] 3比率と両rendererを対象に、共有CSSの変更点を確認する。viewportよりcanvasが大きい試行を全景合格に使わない。

## C10 最終音響出力と音映像因果（xhigh、旧A01/A02/T）

まず計測を追加し、結果を見て必要な場合だけ音を修正する。以下は別々に完了できる3段階。

### C10a 最終出力の計測を成立させる

入口: `src/audio/AudioEngine.ts`、`src/test-support/chapterReferenceRender.ts`、
`src/audio/chapterLongListening.test.ts`、`src/audio/renewalAudioReport.test.ts`、`src/qa/chapterAudioAbModel.ts`。

- [x] 現行dry参照と実際のEQ/convolver/compressor/limiter/volumeの順序、係数、IRを読み取る。
- [x] ChromeのOfflineAudioContextまたは既存QAレンダー経路で、48kHz stereoの実出力graphを通す。
  既存のgraph構築関数を共有できれば利用。テスト専用に数値を手書きコピーしない。
  抽出が必要ならAudioEngineの接続と破棄の回帰を保ちながら、graph生成だけを同じaudio責務内へ分ける。
- [x] score/DSPの決定的出力をgraphへ供給し、IRのseed、volume、レンダー開始時刻、前ロールを固定する。
  AudioWorkletの実時間性能とoffline出力品質は別の証拠として記録する。
- [x] finite、sample peak、1秒RMS、stereo/mono RMS、開始停止の差分、残響尾をJSONで出力する。
  sample peakをtrue peak、RMSをLUFSと呼ばない。巨大なWAVは保存せず、代表短尺か再生成手順を残す。

### C10b 1章ずつ最終出力を比較する

- [x] 10章それぞれ導入・密集・静寂・周回境界を、同じ音量と48kHzでレンダーする。
  章の全周期と残響尾を含む比較を作る。途中窓はIRの過渡が比較を汚さないよう前ロールを取る。
- [x] hard failureはNaN/Inf、意図しない無音、クリッピング、有限包絡外の発音。
  隣接章の全周期RMS差3dB超、mono低下6dB超は今回の「要調査」目安とし、既存の合格基準と偽らない。
  静寂や位相の意味を調べず均一化しない。dry校正0.023±0.05dBは別に維持する。
- [x] 確認した出力問題だけを1章単位で修正。DSP変更時は参照/Worklet、校正、
  `rtk proxy npm run qa:audio-performance` と決定的比較を実施する。

### C10c 局所因果を独立評価する

- [x] 各章の導入・密集・静寂から1イベントずつ選ぶ。sourceIndex、絶対onset、包絡、pan、
  視覚の局所座標、装飾の余韻と数学層の区別を表にする。
- [x] onset直前・直後・減衰途中をChromeで確認し、同じイベントが同じ場所で反応することを記録する。
  共有時計の一致、ブラウザの描画観測、実際の知覚評価は列を分ける。
- [x] 可能な音声/映像観察手段で同時体験を評価する。実際に聴けなければ未観察と明記し、
  「心地よい」「単体より価値が増す」をテスト成功から断言しない。追加の利用者試聴は要求しない。

## C11 残る連続観察・性能・寿命（high、寿命はxhigh、旧T/P/L）

- [ ] T06–T10両rendererの未完10件を1章×1rendererずつ進める。
  既存台帳の10分は提案された観察窓。採用している以上、短いseekを10分連続観察と書かない。
  前景で開始から終盤まで変化・静寂・局所応答を確認し、開始/終盤の計測、pause/resume、
  長い絶対seek、逆seek、周回境界を記録する。
- [ ] 既存T01–T05のラスタ・時計証拠を活用し、足りない全景/局所因果だけ補う。
  全ての10分観察を理由なくやり直さない。
- [ ] P03-Lは元の50ms超フレームを含む結果を保存したまま条件を揃えて再測定。
  出る原因をwarmup、GC、shader、外部負荷と切り分ける。合格が出るまで結果を選別しない。
  P02/P04の既存4件は対象コードへの変更影響を確認して採用可否を決める。
- [ ] 両rendererで章を2巡。scene、AudioNode/Context、rAF、購読、timerの生成破棄を追い、
  基準数へ戻るか確認する。取得できない実GPUメモリは未測定とする。
- [ ] 非表示復帰、音声初期化失敗、scene失敗、GPU復旧を既存の正規QA経路と回帰で確認する。
  古い世代の通知、二重音声、不要な資源増加があれば1件ずつFIXを作る。

## C12 最終監査・文書・完成判定（high、独立監査はxhigh）

- [x] R01数学、R02DSP、R03描画/性能/寿命を対象版に対して独立に確認する。
  読み取り専用監査でR01/R02のImportantを回帰追加と実測で解消し、R03のWebGPU失敗経路・dispose・sceneReady待機を実装確認した。故障注入テスト、全C11条件、A01の全組合せ測定は未完として残す。
- [x] `luna-task-board.md` の31要件表へ現行の根拠と確認限界を記入。最終評価はC11と独立監査後に行う。
  要件名とカード名だけの対応表で終えない。README/正本/進捗/計画の現在形を揃える。
- [x] `rtk proxy npm run check` を2026-09-22の現行ソース版で実施。format/lint/strict TypeScript/build成功、Vitest 102 files passed / 760 tests passed / 0 skipped。レポート生成専用の環境変数ゲートは維持し、通常回帰からskipを除去した。audio-performanceは75/75成功、p95最大1.269ms（Möbius）。
  音響変更があればaudio-performanceと変更後レンダー、描画変更があれば影響する両rendererのQAを追加する。
- [x] `rtk git diff --check` と変更一覧を確認。Markdownリンクとrenewal QA JSONも検査し、無関係な変更・巨大な一時成果物・秘密がないことを確認する。
- [x] 最終回答に修正内容、対象版、検証結果、残る未測定、完了/未完の判定を簡潔に記す。
  必須カードが未完なら「V2完成」としない。一方、測定不可能な聴感を理由に同じ作業を無期限反復しない。
  実装と測定可能なQAが完了していても知覚評価に限界があれば、その範囲を分けて報告する。

## 変更による証拠の再取得範囲

| 変更 | 再確認 | その変更だけでは再取得不要 |
| --- | --- | --- |
| C01–C03 説明だけ | 対象章の数学詳細、主張、改行 | 全周期DSP性能、4K負荷 |
| C04/C05 共有UI | 全章ノート、3比率、両rendererの操作 | ノート閉の音響レンダー |
| C06 局所装飾 | 7章の通常/reduced、因果、描画負荷 | DSPの数値校正 |
| C07 composer | WebGL quality/resize/DPR、代表負荷 | WebGPUの無関係な数学回帰 |
| DSP変更 | 該当章参照/Worklet、全周期校正、最終出力、因果 | 無関係な文言だけのUI確認 |
| 共通時計/寿命変更 | 全章の開始/切替、両renderer、連続同期 | 影響分析なしの旧結果流用は禁止 |

実行を開始してください。最初の成果物はC01の修正と証拠です。全体の再提案や追加承認待ちで終了しないでください。
