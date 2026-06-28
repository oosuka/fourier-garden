# 参照動画準拠サウンド抜本改善設計

## 文書の位置付け

- 作成日: 2026年6月28日
- 対象: Chapter 2 `Spectral Cathedral / スペクトルの聖堂`、Chapter 3 `Möbius Choir / メビウスの合唱`
- 状態: 実装前の承認済み設計
- 優先順位: `AGENTS.md`、`docs/mathematical-model.md`の数学的不変条件を常に優先する

本設計は、通常公開済みのChapter 2とChapter 3の音響を、数学的正確性を維持したまま
参照動画の「軽く、コミカルで、心地よい連続性」へ寄せる。対象はソニフィケーション層と
Web Audioグラフ、QA指標であり、厳密数学層、描画の数学座標、係数、固有値、境界条件、
絶対数学時刻は変更しない。

## 参照動画

参照元はMassimo / `@Rainmaker1973`の2026年5月15日投稿である。

- 投稿: <https://x.com/Rainmaker1973/status/2055220187184386556>
- 動画: <https://video.twimg.com/amplify_video/2055219255423991808/vid/avc1/720x420/YYb7NRCsogiD3sGC.mp4?tag=27>
- 長さ: 約29.05秒
- 音声: 44.1 kHz、ステレオAAC

`afconvert`で一時WAV化して計測した粗い特徴は次である。

| 指標 | 値 |
| --- | ---: |
| mono RMS | 0.1276 |
| mono peak | 0.3989 |
| 150 Hz未満の平均エネルギー比 | 0.00057 |
| 250 Hz未満の平均エネルギー比 | 0.00121 |
| 400 Hz未満の平均エネルギー比 | 0.0154 |
| spectral centroid中央値 | 約710 Hz |
| 400 Hz-3 kHz平均エネルギー比 | 0.963 |
| onset間隔中央値 | 約0.197秒 |
| RMS包絡の強い周期 | 約0.232秒 |

この参照から採用する性質は次である。

- 低域の量感ではなく、中域の短い粒を主役にする
- 各粒は短く減衰するが、粒列と残響で集合的な連続性を作る
- おおむね0.18-0.26秒間隔の軽い反復感を持つ
- 400 Hz-3 kHzの明瞭な帯域を中心にし、150 Hz未満をほぼ使わない
- 完全な無音ではなく、残響と次粒の重なりで聴感上の途切れを避ける
- 機械的な単一音色の連打ではなく、音高、定位、明度、残響量を小さく揺らす

採用しない性質は次である。

- 投稿本文の「Fast Fourier Analysis」という表現をFourier Gardenの説明へ移すこと
- Chapter 2やChapter 3をFFT可視化と呼ぶこと
- 数学対象そのものを参照動画の形へ変えること
- 録音済みサンプルや外部音声ファイルへ依存すること
- 全章を同じ木琴音色へ統一して章固有性を消すこと

## 現状の問題

### Chapter 2

現行の`Spectral Cathedral`は、固有モード由来の鐘音、木質アタック、5幕scoreを持つ。
しかし`registerMultiplier: 0.5`を持つ幕があり、最低基礎周波数は

```text
176 * sqrt(3 / 3) * 0.5 = 88 Hz
```

まで下がる。これは固有値比や係数比ではなく、ソニフィケーション層の移調設計である。
そのため数学的不変条件を保ったまま、低域の反復を減らせる。現行の`pulse`は
短い85 ms減衰と強めの木質成分で輪郭は出るが、低いregisterと組み合わさると
「ボボボ」という胴鳴りとして知覚されやすい。

### Chapter 3

現行の`Möbius Choir`は、絶対時刻carrier、母音formant、63イベント、5幕、
20 ms低RMS区間の上限テストを持つ。それでも参照動画の連続性とは違い、声部ごとの
粒が短音列として分離して聞こえやすい。原因は次の組み合わせである。

- onset密度が参照動画より疎い区間が多い
- 1.65-2.2秒級の包絡が、軽い粒列ではなく合唱の胴鳴りとして残る
- `u`や`o`のformantが低めの母音感を強調し、コミカルな軽さを削ぐ
- 参照動画の主帯域である400 Hz-3 kHzへ集中する品質指標がない

## 設計目標

1. 参照動画を恒久的な音響QA基準として扱う
2. Chapter 2のガラス鐘と木質アタックを残しつつ、低域反復を除去する
3. Chapter 3の母音状の合唱を残しつつ、中域粒状フレーズへ寄せる
4. 各章の数学的不変条件、絶対数学時刻、係数比、固有振動数比、帯域制限を維持する
5. 参照動画に近い0.18-0.26秒周期の小粒連続性を、各章のscoreとDSPで作る
6. 自動指標で低域量、連続性、onset密度、章間RMS、peak、DC、Worklet一致を検証する
7. 実装後に参照動画、Chapter 1、Chapter 2、Chapter 3を実機試聴で比較する

## 非目標

- 厳密数学層、係数、固有値、境界条件、位相規約、投影規約の変更
- Chapter 1の音響を抜本変更すること
- 新しい外部音声ライブラリ、サンプル音源、録音素材の追加
- AudioWorklet標本ループ内の全イベント走査、探索、sort、一時配列生成の増加
- 自動テストだけで「心地よい」と断定すること

## 共通音響QA指標

`src/audio/audioMetrics.ts`に、参照動画と章レンダリングの粗い波形指標を比較できる
純粋関数を追加する。外部メディアファイルをリポジトリへ追加せず、
参照値はこの設計で計測した固定値としてテストに埋め込む。

追加する指標は次である。

- `getStereoRms()`: stereo RMS、peak、mean
- `getBandEnergyRatios()`: 150 Hz未満、250 Hz未満、400 Hz未満、400 Hz-3 kHz、
  3 kHz-10 kHzの比率
- `getFrameRmsContinuity()`: 20 ms窓の低RMS連続時間
- `estimateOnsetSpacing()`: spectral fluxからonset間隔を推定
- `getReferenceLikePulseScore()`: 0.18-0.26秒周期の包絡自己相関

テストの合格範囲は章ごとに固定する。参照動画の低域比そのものを完全コピーせず、
Fourier Gardenの音量、残響、章アイデンティティに合わせて許容範囲を置く。

共通の初期しきい値は次を基準とする。

| 指標 | Chapter 2目標 | Chapter 3目標 |
| --- | ---: | ---: |
| 150 Hz未満平均エネルギー比 | 0.03以下 | 0.02以下 |
| 250 Hz未満平均エネルギー比 | 0.08以下 | 0.06以下 |
| 400 Hz未満平均エネルギー比 | 0.22以下 | 0.18以下 |
| 400 Hz-3 kHz平均エネルギー比 | 0.55以上 | 0.60以上 |
| onset間隔中央値 | 0.18-0.34秒 | 0.16-0.30秒 |
| 20 ms低RMS最大連続時間 | 0.12秒以下 | 0.10秒以下 |
| peak | -1 dBFS以下 | -1 dBFS以下 |
| DC絶対値 | 1e-3未満 | 1e-3未満 |

Chapter 2は鐘の低次部分音を残すため、Chapter 3より低域許容量を広くする。
ただし88 Hz近辺の反復的な主成分は許容しない。

## Chapter 2設計

### 数学的不変条件

次は変更しない。

- 長方形Dirichlet領域、12固有モード、固有値、係数
- `f_mn = 176 * sqrt(lambda_mn / 3)`による固有振動数比
- `g_mn = |a_mn| / max|a|`による係数絶対値比
- 符号を開始位相0またはpiへ写すこと
- 数学時刻が75秒score周期でリセットしないこと
- 左右デチューン後の全生成周波数が`0.45 Fs`未満であること

### Score

75秒、72 BPM、5/4、18小節、95イベント、5幕は維持する。変更するのは
イベントの音響プロファイルである。

`registerMultiplier`は次へ変更する。

| 幕 | 現行 | 改善後 |
| --- | --- | --- |
| illumination | 0.5 | 1 |
| procession | 1 | 1 |
| ascent | 1 | 1.5 |
| resonance | 2 | 2 |
| afterglow | 0.5 | 1 |

TypeScript型は`0.5 | 1 | 2`から`1 | 1.5 | 2`へ更新する。
`0.5`は原則禁止し、最低基礎周波数を176 Hz以上へ上げる。
固有振動数比は共通register倍率を掛けるだけなので維持される。

`pulse`と`cascade`は参照動画の粒状感を担う。scoreのイベント数は95のまま、
隣接イベントの実質onsetを0.18-0.26秒へ寄せるため、短い遅延サブ粒をDSP側で加える。
サブ粒はイベント表へ別イベントとして保存せず、gesture定義の中で決定的に展開する。

### DSP

鐘身は維持するが、低域の胴鳴りを減らす。

- `maximumPartials`: 8を維持
- `partialDamping`: 1.65から1.85へ上げ、高次だけでなく中域中心に整理する
- `toll`と`choir`: 長い残響は残すが、dry成分の主減衰を短くする
- `pulse`: 鐘身より700-2,800 Hzの木質粒を主役にする
- `cascade`: 0.18-0.26秒間隔の2-3個の軽いサブ粒を持つ
- `woodAttackSeconds`: 20 msから40 msへ伸ばし、クリックではなく丸い粒にする
- `woodMinimumHz`: 700 Hz維持
- `woodMaximumHz`: 2,800 Hzから3,600 Hzへ拡張し、軽さを足す
- `woodAttackGain`: `pulse`と`cascade`を増やし、`toll`と`choir`は控えめにする

Chapter 2の発音定数は次に固定する。

| gesture | attack | decay | fadeStart | end | woodAttackGain | subgrain offsets | subgrain gains |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| toll | 0.003 | 0.32 | 1.77 | 1.80 | 0.045 | `[0]` | `[1]` |
| answer | 0.0025 | 0.18 | 0.87 | 0.90 | 0.06 | `[0]` | `[1]` |
| cascade | 0.002 | 0.09 | 0.53 | 0.56 | 0.16 | `[0, 0.19, 0.38]` | `[1, 0.76, 0.58]` |
| pulse | 0.0015 | 0.065 | 0.34 | 0.37 | 0.22 | `[0, 0.21]` | `[1, 0.72]` |
| choir | 0.005 | 0.40 | 2.17 | 2.20 | 0.04 | `[0]` | `[1]` |

サブ粒の位相、周波数、ゲインは絶対イベント番号、モードID、サブ粒番号から決定的に作る。
同じseekでは完全に再現し、別周回では現行の木質アタックと同様に変奏してよい。
これは追加固有モードではなく、ソニフィケーション層の奏法である。

### Web Audioグラフ

- `dryHighPassHz`: 90 Hzから160 Hzへ上げる
- `wetHighPassHz`: 160 Hzから240 Hzへ上げる
- `dryHighShelfHz`: 4,200 Hzから3,600 Hzへ下げ、軽い粒を少し持ち上げる
- `dryHighShelfGainDb`: -1 dBから1 dBへ上げる
- `dryLowPassHz`: 8,500 Hz維持
- `wetGain`: 現行0.12を0.16へ上げ、短粒を残響で接着する
- limiter ceilingは-1 dBFS維持

## Chapter 3設計

### 数学的不変条件

次は変更しない。

- flat Möbius quotient、Dirichlet境界、同一視辺
- `m+n`奇数、`lambda<=13`の6モード
- 係数`b_mn = C_M / (1 + lambda_mn)`
- `f_mn = 196 * sqrt(lambda_mn)`による固有振動数比
- `n>0`のquadrature pair
- carrierと局所制御を絶対transport時刻で評価すること
- 同時発音集合を単一モード、同一固有値対、または`[1,4]`へ限定すること
- 左右デチューン後の全生成周波数が`0.45 Fs`未満であること

### Score

16小節、68 BPM、5幕、周期`960/17`秒は維持する。イベント数は63から78へ増やし、
参照動画に近い粒状連続性を作る。ただし同時発音複雑度を96 oscillator以下へ維持する。

| 幕 | 小節 | slot/小節 | 合計 | 役割 |
| --- | ---: | --- | ---: | --- |
| breath | 0-2 | `[0, 3, 5, 6]` | 12 | 軽い息粒、低密度導入 |
| antiphon | 3-5 | `[0, 2, 3, 6, 7]` | 15 | 左右応答、短いcall/answer |
| inversion | 6-9 | `[0, 1, 3, 4, 6]` | 20 | 反転リズム、中域粒 |
| interweave | 10-13 | `[0, 1, 2, 4, 5, 7]` | 24 | 最大密度、単一modeの編み込み |
| confluence | 14 | `[0, 3, 6]` | 3 | 密度を落として残響へ入る |
| confluence | 15 | `[0, 2, 5, 7]` | 4 | 次周期へ軽く戻る |

合計は78イベントである。0.18-0.26秒周期の軽さはslot数だけに依存させず、
`call`、`answer`、`turn`、`braid`に小さい二次moraを持たせて作る。二次moraは
carrierを再始動せず、絶対時刻carrierへ掛ける短い振幅・formant・breath包絡として扱う。

### DSP

合唱感は残すが、低い胴鳴りを抑えて中域の粒立ちを優先する。

- `maximumPartials`: 6を維持
- `partialDamping`: 1.72から1.55へ下げ、中域倍音を少し前へ出す
- `formantFloor`: 0.1から0.16へ上げ、特定母音だけに暗く寄らないようにする
- `u`と`o`の第1 formantを弱め、`e`と`a`の中域formantを主役にする
- `breathSeconds`: 0.28から0.20へ短くし、息を尾ではなく粒の輪郭へ使う
- `breathMinimumHz`: 1,200 Hz維持
- `breathMaximumHz`: 6,500 Hzから5,000 Hzへ下げ、耳障りな高域を避ける
- `breathGain`: 全体に控えめにし、`braid`と`turn`だけ輪郭を強める
- envelopeは`converge`以外を1.1-1.7秒へ短縮し、`converge`だけ2.1秒を残す

Chapter 3の発音定数は次に固定する。

| gesture | attack | decay | fadeStart | end | breathGain | mora offsets | mora gains |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| breath | 0.055 | 0.95 | 1.18 | 1.35 | 0.022 | `[0]` | `[1]` |
| call | 0.035 | 0.72 | 1.05 | 1.20 | 0.024 | `[0, 0.21]` | `[1, 0.66]` |
| answer | 0.04 | 0.76 | 1.12 | 1.30 | 0.024 | `[0, 0.22]` | `[1, 0.62]` |
| turn | 0.03 | 0.62 | 0.92 | 1.08 | 0.03 | `[0, 0.19]` | `[1, 0.58]` |
| braid | 0.032 | 0.66 | 0.98 | 1.16 | 0.032 | `[0, 0.18, 0.36]` | `[1, 0.66, 0.46]` |
| converge | 0.07 | 1.18 | 1.86 | 2.10 | 0.026 | `[0, 0.24]` | `[1, 0.50]` |

carrierは絶対時刻で評価し続ける。新しい粒感はevent ageでcarrierを再始動するのではなく、
包絡、formant morph、短いbreath component、定位の変化で作る。

### Web Audioグラフ

- `dryHighPassHz`: 95 Hzから155 Hzへ上げる
- `wetHighPassHz`: 180 Hzから260 Hzへ上げる
- `dryHighShelfGainDb`: -3 dBから-1 dBへ上げる
- `dryLowPassHz`: 8,200 Hzから7,600 Hzへ下げる
- `wetGain`: 0.2から0.22へ上げ、短い粒を残響でつなぐ
- `roomSeconds`: 2.6秒維持
- compressor thresholdとratioは現行値を維持する

## Workletと性能

Chapter 2とChapter 3はTypeScript参照DSPと`public/audio/chapters/*.js`に同じ変更を入れる。
参照実装だけ、またはWorkletだけを変更してはならない。

標本ループの制約は次である。

- 時間窓内のeventだけを評価する
- mode ID探索を標本ループで行わない
- 周波数、定位、部分音重み、formant重み、サブ粒定義は設定時に事前計算する
- 標本ループで配列、object、sort、filterを作らない
- 48 kHz、128標本blockの処理時間はAudioWorklet期限の50%以下を目標にする
- 最大同時oscillator寄与はChapter 2とChapter 3とも96以下を原則とする

Chapter 2は現状Worklet内で`program.modes.find()`をイベントごとに使う。
今回のサブ粒化で複雑度が増えるため、Chapter 2にもChapter 3同様のruntime事前計算を
導入し、標本ループからmode探索を外す。

## テスト計画

### 共通

- 参照動画由来の固定目標値を説明するテスト名を追加する
- 章ごとの全周期、代表区間、最密幕区間でRMS、peak、DC、低域比を検証する
- onset間隔中央値と0.18-0.26秒周期の包絡自己相関を検証する
- 20 ms低RMS最大連続時間を検証する
- TypeScript参照DSPとAudioWorklet出力を44.1/48/96 kHzで比較する
- `0.45 Fs`帯域制限をデチューン後周波数で検証する
- 最大同時oscillator数を検証する

### Chapter 2

- scoreから`registerMultiplier: 0.5`が消えたことを検証する
- 最低基礎周波数が176 Hz以上であることを検証する
- `pulse`と`cascade`が決定的なサブ粒を持つことを検証する
- サブ粒の周波数が700-3,600 Hz範囲に入ることを検証する
- 150 Hz未満、250 Hz未満、400 Hz未満のエネルギー比が上限以内であることを検証する
- Chapter 1とのRMS比較で聞こえすぎ、聞こえなさすぎの両方を防ぐ

### Chapter 3

- scoreイベント数が78と一致することを検証する
- 各幕のslot、gesture、部分音数、母音、register、定位幅が3軸以上変化することを検証する
- carrierが絶対時刻で連続する既存テストを維持する
- 400 Hz-3 kHz帯域が主成分であることを検証する
- 低RMS連続区間が0.10秒以下であることを検証する
- 最大同時oscillator寄与が96以下であることを検証する

## ブラウザQAと実機試聴

実装後は`npm run check`に加えて、Chromeで次を確認する。

- 通常URLでChapter 1、2、3を順に再生する
- Chapter 2/3で開始、一時停止、再開、音量変更、詳細パネル、全画面を確認する
- `?renderer=webgl`でWebGL2経路を確認する
- `?seed=qa&quality=high`で固定QA状態を確認する
- 16:10、16:9、ウルトラワイドを確認する
- コンソールエラーと未処理Promise rejectionがないことを確認する

実機試聴は次の順で行う。

1. 参照動画を通常音量で聴く
2. Chapter 1を聴き、基準音量と疲労感を確認する
3. Chapter 2を最低2周期聴き、低音の「ボボボ」が残っていないことを確認する
4. Chapter 3を最低2周期聴き、短音列ではなく連続する粒状フレーズとして聞こえることを確認する
5. ヘッドホンとMac内蔵スピーカーの両方で確認する

結果は`design-qa.md`へ、参照動画のURL、計測値、試聴環境、残課題とともに記録する。

## ドキュメント同期

変更後に更新する文書は次である。

- `docs/mathematical-model.md`: Chapter 2/3のソニフィケーション、Web Audioグラフ、
  score数、QA指標
- `README.md`: 章一覧の音響説明
- `design-qa.md`: 参照動画準拠サウンド改善QA
- `docs/chapter-atlas.md`: Chapter 2/3の音響記述が現行仕様とずれる場合のみ更新

## 完了条件

- Chapter 2の低域反復が自動指標と実機試聴の両方で解消される
- Chapter 3が参照動画に近い中域粒状連続性を持つ
- どちらの章も数学的不変条件、絶対数学時刻、係数比、固有振動数比を維持する
- TypeScript参照DSPとAudioWorkletが一致する
- `npm run check`が通る
- ChromeのWebGPU/WebGL2 QAを通る
- ヘッドホンとMac内蔵スピーカーで試聴し、結果を`design-qa.md`へ記録する
