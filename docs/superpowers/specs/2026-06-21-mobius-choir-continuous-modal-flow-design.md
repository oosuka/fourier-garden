# Möbius Choir 連続モード流・幕対比再設計

> 状態: 2026年6月21日承認・実装・ブラウザQA・実機試聴・通常公開済みの現行仕様。
> flat Möbius quotient、6許容モード、固有値、係数、絶対数学時刻、厳密描画、
> DSP複雑度上限、全画面粒子構成は変更しない。本書は音響の時間写像、5幕score、
> 音響と映像の連続制御だけを置き換える。

## 1. 再設計理由

現行DSPはリアルタイム音切れと過大音量を解消したが、各発音の数学位相をイベント開始時
`t_e`で固定し、carrierをevent ageから再始動する。イベント中は固定された母音と部分音を
減衰させるため、連続な波動場`u_M(x,y,t)`に対して音声は短音列のままである。

全16小節が同じslot`[0,3,6,7]`の4イベントで、幕間差はgain、wet、spread、registerの
小さい変更に限られる。これが「途中の変化へ気づきにくい」直接原因であり、数学的限界
ではない。

## 2. 数学的不変条件

- `m+n`奇数、`lambda<=13`の6モード、`b_mn=C_M/(1+lambda_mn)`を維持する。
- 固有振動数比`sqrt(lambda_mn/lambda_10)`、係数基礎振幅比、`n>0`quadrature pairを
  維持する。
- 数学時刻は絶対transport時刻であり、score周期でリセットしない。
- strict surface、境界、同一視辺、節線、parameter gridを演出で変形しない。
- DFT、FFT、数値Laplace–Beltrami解析を導入しない。

## 3. 連続数学制御

モード`(m,n)`の観察laneを`y_i=(i-1)pi/6`とし、絶対時刻`t`で

```math
phi_i(t)=n y_i-0.14\sqrt{lambda_i}t,
\quad d_i(t)=|\cos phi_i(t)|,
\quad v_i(t)=|\sin phi_i(t)|
```

を標本ごとに評価する。`d_i`と`v_i`はflat quotientのモード位相から得る連続制御で、
数学面そのものの変更ではない。

各carrier部分音はevent ageではなく絶対時刻で

```math
cos(2 pi f_{i,r,L/R} t+r(theta_i(t)+q pi/2))
```

を評価する。`q=0,-1`がquadrature voiceである。同じmode、registerの重複grainは
絶対時刻で位相整合し、呼吸包絡を跨いでもcarrierの進行がリセットされない。

音楽的変換は次に固定する。

- amplitude: `1-depth_a/2+depth_a*d_i(t)`
- partial brightness: 高次部分音ほど`v_i(t)-0.5`を`depth_b`倍して連続変化
- pan: 事前計算したbase panへ`signed sin(phi_i(t))*panMotion`を加える
- formant: event ageによる母音morphを維持し、数学速度によるbrightnessと併用する

係数比は各modeの`normalizedGain`へ先に適用し、上記は局所数学量による表現制御として
後段へ適用する。

## 4. 63イベント・5幕score

68 BPM、16小節、周期`960/17`秒を維持し、幕ごとの密度とslotを変える。

| 幕 | 小節 | slot/小節 | 合計 | 部分音 | 主な知覚変化 |
| --- | ---: | --- | ---: | ---: | --- |
| Breath | 0–2 | `[0,3,6]` | 9 | 3 | 狭い定位、`u→o`、低register |
| Antiphon | 3–5 | `[0,3,6,7]` | 12 | 4 | 左右応答、degenerate pair、`o→e` |
| Inversion | 6–9 | `[0,2,5,7]` | 16 | 5 | rhythm反転、3/2 register、`e→u/a` |
| Interweave | 10–13 | `[0,1,3,5,7]` | 20 | 6 | 単一modeの高速交差、最大定位、`a→e` |
| Confluence | 14–15 | `[0,3,6]` | 6 | 4 | 1:3対への収束、広い残響、`a→u` |

合計63イベントとする。3モード以上の同時発音と異固有値の濁った和音は禁止し、
`[2,3]`、`[5,6]`、`[1,4]`だけを同時発音として許す。Interweaveは単一modeを時間差で
編み、密度を上げても和音を濁らせない。

幕ごとの`partialCount`をeventへ保存する。振幅運動depth、brightness depth、pan motionも
section profileから決定的に保存し、数学値そのものは保存しない。

## 5. 響きと負荷

- 個々のgrainは1.65–2.20秒で必ずゼロへ閉じる。
- 20 ms低RMS区間は90 ms以下とし、無限sustainや単一droneを使わない。
- 全周期raw stereo RMSをChapter 2比`0.90..1.05`、28–38秒代表区間を`0.90..1.10`
  とする。
- peak `<=-1 dBFS`、DC絶対値`<1e-3`、全周波数`<0.45Fs`を維持する。
- 最大同時oscillator寄与は96以下、48 kHz・128標本の参照blockは1.33 ms以下を目標とする。
- Worklet標本ループでevent全走査、mode探索、sort、一時配列・object生成を行わない。
- TypeScript参照DSPとAudioWorkletを44.1/48/96 kHzで`1e-7`以内に一致させる。

## 6. 音響と映像

`src/math/mobiusChoir.ts`へmode kinematics純粋関数を置き、音響とvisual responseが同じ
`phi_i(t),d_i(t),v_i(t)`を使う。mode別particle flow、ribbon幅、halo、panorama流速、
seam cyan残光を音響の連続amplitude・brightnessと同期させる。全画面一斉点滅は使わない。

## 7. 完了条件

- 63イベント、幕別密度・slot・partial・register・vowel・space差をテストする。
- carrierの絶対時刻連続性を、同一modeの重複event境界とscore周期境界で検証する。
- 数学kinematics、参照DSP、Worklet、visual responseの連続制御が一致する。
- RMS、連続性、帯域、peak、DC、複雑度、実行時間の回帰を通す。
- WebGPU／WebGL2、16:10／16:9／21:9、章切替、pause/resumeを確認する。
- ヘッドホンとMac内蔵スピーカーの人間試聴後に通常公開する。
