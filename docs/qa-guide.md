# QA手順

2026年9月14日確認。現在の検証手順。結果と未検証は[作業記録](qa/renewal/progress.md)へ保存する。
自動テスト、静止画、音響指標、同時体験、実機性能を別の証拠として扱う。

## 自動検証

```bash
rtk proxy npm run format
rtk proxy npm run check
rtk proxy npm run qa:audio-performance
```

全周期dry音響レポートは次で作る。出力は`docs/qa/renewal/audio-<name>.json`。

```bash
rtk proxy env FOURIER_GARDEN_RENEWAL_AUDIO_REPORT=review npx vitest run src/audio/renewalAudioReport.test.ts
```

数学の境界・係数・位相、TypeScriptとWorkletの一致、周回、開始epoch、pause/resume、
周波数上限、有限包絡、全周期校正、隣接章の差、エラー復旧を確認する。

## ブラウザと固定比較

通常入口は`/?seed=qa&quality=high`。
章別入口は`/<chapter-id>-qa.html?seed=qa&quality=high&time=30`。
chapter-idはレジストリのIDを使う。`renderer=webgl`でWebGL2を強制し、
`poetic=off`で詩的造形を除いて数学層を比較する。`chapters=preview`は通常の10章と同じ互換入口。

通常体験を任意の絶対時刻から検証する場合は
`/?qa=1&chapter=phase-torus&time=31.27&seed=qa&quality=high`を使う。
右上のQAを展開し、時刻へ移動または60秒を記録する。音声は通常の入口操作後にのみ始まる。
記録はrAF間隔、CPU送出時間、Worklet標本位置からの同期推定を含む。
50 ms超の間隔は最初の32件まで、記録開始からの経過秒・間隔・そのフレームのCPU送出時間を
slowFramesへ時系列で保存する。残りの件数はslowFramesOmittedと総件数へ残す。
これは長い間隔の発生位置を照合するための情報であり、CPU時間だけからGPUやOSの原因を確定しない。
章・renderer・画面寸法・音声sample rateと、開始時の音量・消音・motionを固定して保存する。
`clock=performance`は音なし鑑賞、`audio-presentation-estimate`はAudioContextの出力時刻と
推定6 msのcompressor先読みを補償する時計。物理出音・画面走査遅延は測定していない。
開始時設定の記録は、測定途中に設定を変更していないことの証明ではない。比較中は設定を保つ。
遅れて届く別世代の音声位置を完了レポートへ追加せず、保存ファイル名も記録された章へ固定する。
非表示、手動停止、章変更、再生停止を含む試行はinterruptedとして保存する。
QAは明示的な`qa=1`でのみ有効。通常体験にseek操作や計測表示を出さない。

通常体験のQAで`motion=reduced`を加えると、OS設定を変えずにscene側のreduced motionを
確認できる。UIのCSSはOSの`prefers-reduced-motion`に従うため、別に確認する。
`post=direct`は`qa=1`と併用した場合のみpost処理を外す負荷比較用の指定。
`poetic=off`は造形オブジェクトを除く指定で、Bloomも除く場合は両方を指定する。
比較時は同じ絶対時刻へseekし、viewport・DPR・実ラスタ・前景状態を揃える。
記録中の画像取得やbuild・テストを避ける。4Kで間隔が乱れる場合は、同じ区間で
他作業を止めた試行も分けて残す。通常設定でもWebGL2は600万pixel超でBloomを省くため、
postProcessing=defaultを常にBloomありという意味で扱わない。
9月12日のCathedral比較では、アクセシビリティ状態の読み取りを開始直後から58秒後へ
移すと、50 ms超の間隔も0.45秒から58.48秒付近へ移った。記録終了まで読み取りを
行わなかった試行は50 ms超0回だった。性能の記録中はDOM／AXの取得も避け、
開始操作後は60秒の記録終了を待ってから状態とJSONを読む。見た目や操作の観察は別の試行で行う。
この比較は観測操作の影響を示すもので、過去の全フレーム欠落の原因を証明するものではない。

各章を少なくとも序盤・中盤・静かな幕・周回境界で比較し、60秒以上の連続変化も観察する。
16:10、16:9、21:9、高DPI、4Kを確認する。代表時刻の選択は章の幕境界と発音イベントに基づく。
静止画だけで運動・音色・時間構成の合格を決めない。

入口の音あり／なし、M、Space、C、D、F、Escape、focus移動、音量復元、
Detailsの選択維持、章移動、タブ非表示復帰、scene/audio失敗と再試行を操作する。
console errorと未処理Promise rejectionを確認する。

## 音映像の独立評価

音だけ、映像だけ、同時再生を比較する。発音sourceIndex、絶対イベント時刻、有限包絡、
pan、接触音の減衰が局所の材質・位置・余韻へ対応するか確認する。
出力時計、Worklet標本位置、描画時刻を別々に記録し、同期推定の誤差と限界を明記する。
画面走査や物理出音を測っていない場合、sample単位の知覚同期を実証したと主張しない。

追加の利用者試聴を要求しない。旧Mac内蔵スピーカー試聴は感性基準であり、
現行版の音色・同期を直接測った新規証拠ではない。

## 記録

日時、対象版、URL、seed、絶対時刻、幕、ブラウザ、実ラスタ、renderer、音声sample rate、
操作、観察、測定、未検証、修正後の再確認を残す。
[過去のQA](../design-qa.md)は履歴。巨大な録画や一時パスだけを恒久証拠にしない。
