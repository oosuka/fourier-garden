# Fourier Garden — Full Renewal

このリポジトリの **Fourier Garden を大幅にフルリニューアルしてください。**

これは既存作品の小規模改善、UI刷新、リファクタリングではありません。

Fourier Gardenという作品のコンセプトと本質を維持したまま、グラフィック、サウンド、数学、UX、インタラクション、演出、技術基盤、品質管理まで含めて作品全体を再設計し、次世代版へ進化させてください。

目標は、

**「個人制作として非常によくできたWeb作品」ではなく、世界的なデザイン企業やデジタルアートスタジオが商業作品としてそのまま発表・販売できる品質**

です。

妥協した改善ではなく、完成度を大きく引き上げてください。

---

# 1. 最上位の目的

Fourier Gardenの核は維持してください。

この作品は、

* 数学
* 音
* 光
* 空間
* 時間
* インタラクション

を融合させ、数学的構造を「理解する」だけではなく、

**観察し、聴き、没入し、美しさを感じ、その背後にある数学をもっと知りたくなる**

体験を目指す作品です。

このコンセプトそのものは変更しないでください。

ただし、その実現方法は全面的に再検討してください。

既存コード、既存UI、既存グラフィック、既存サウンド、既存レイアウトを維持すること自体には価値を置きません。

「現在こう実装されているから」という理由だけで何かを残さないでください。

反対に、既存実装のうち優れているものを「フルリニューアルだから」という理由だけで捨てる必要もありません。

作品の品質を最大化する観点から、

* Preserve
* Refactor
* Rebuild
* Remove

を判断してください。

---

# 2. 商業作品レベルまで品質を引き上げる

最終成果物には、商業作品として販売・展示できる完成度を要求します。

評価基準を、

「動く」
「綺麗」
「技術的に面白い」

程度に置かないでください。

要求するのは、

* 世界観の完成度
* グラフィックの精度
* タイポグラフィ
* モーション
* サウンド
* インタラクション
* 数学的価値
* レスポンス
* パフォーマンス
* 細部
* 一貫性
* 長時間鑑賞したときの品質

まで含めた総合的なプロダクト品質です。

数秒のスクリーンショットだけが美しい作品ではなく、

**数分間実際に鑑賞することで価値が増す作品**

にしてください。

---

# 3. Art Direction

デザイン品質の基準として、Appleをはじめとする世界最高水準のデザイン企業が採用しても違和感がないレベルを目指してください。

ただし、Appleのデザインを模倣しないでください。

求めているのは、

* 圧倒的に整理された情報階層
* 精密な余白
* 美しいタイポグラフィ
* 微細なモーション
* 明確な視線誘導
* 一貫した物理感
* 細部まで意図されたインタラクション
* 過剰でない高級感
* 見えない部分まで設計されている感覚

です。

Fourier Garden固有のVisual Languageを新しく構築してください。

安易に、

* glassmorphism
* neon cyberpunk
* cyan + purple
* AI風グラデーション
* 大量のカードUI
* 一般的なdashboard
* SF HUD
* Three.js tech demo

へ寄せないでください。

「未来的」という単語だけでデザインを決めないでください。

数学をテーマとしながらも、

**静謐さ、精密さ、有機性、複雑さ、秩序、予測不能性**

が共存する世界を作ってください。

---

# 4. Graphics

グラフィックは現在より大幅に強化してください。

単純にparticle countやbloomを増やすことを「高品質化」としないでください。

重要なのは、

**繊細さ、緻密さ、階層、奥行き、時間変化、局所性**

です。

各Chapterには、

* foreground
* middle ground
* background
* atmospheric layer
* mathematical layer
* transient effects
* long-term motion

など複数レイヤーの奥行きを持たせてください。

一見静かに見える場面でも、注意深く見ると無数の小さな変化が存在する状態を目指してください。

例えば、

* 微細な粒子
* 非同期の輝度変化
* 局所的な波紋
* 微小な空間変形
* 光の散乱
* depthに応じた運動差
* 微細な色温度変化
* temporal noise
* 残光
* 位相差
* 被写界深度を意識した階層
* カメラの極微小な漂い
* 数学イベントに反応する局所的変化

などを活用できます。

ただし、それらを装飾としてランダムに追加しないでください。

数学、音、時間構造と可能な限り関係を持たせてください。

---

# 5. Chapterごとの独自性

すべてのChapterが、

「同じシーンの色違い」

に見えることを強く避けてください。

各Chapterについて、

* 空間構造
* 主役となる数学的形状
* motion vocabulary
* camera behavior
* material
* color relationship
* particle behavior
* density
* rhythm
* sound character

を独立して設計してください。

一方で作品全体としては、

**明確に同じFourier Gardenの世界**

だと分かる統一されたVisual / Audio Languageを持たせてください。

「統一感」と「Chapter固有性」を両立してください。

---

# 6. 時間演出

Fourier Gardenは静止画作品ではありません。

時間そのものを重要なデザイン材料として扱ってください。

各Chapterが開始から終了まで同じ状態の繰り返しにならないよう、

* introduction
* development
* expansion
* transformation
* quiet moment
* climax
* resolution

など、必要に応じて音楽的・映像的な構成を作ってください。

ただし数学的対象をストーリーの都合で偽らないでください。

数学そのものを変更するのではなく、

* 観察方法
* カメラ
* 強調する対象
* 密度
* ソニフィケーション
* 色
* 空間
* 補助表現

によって時間構成を作ってください。

ユーザーが60秒以上見ても、細かな発見が続く作品を目指してください。

---

# 7. Sound

サウンドも全面的にアップデートしてください。

Fourier Gardenらしい、

**反復する、規則的で、数学的構造を感じるサウンド**

という特徴は維持してください。

ただし単調なループにはしないでください。

反復の中に、

* 微細な変化
* 位相差
* 空間移動
* 音色変化
* 倍音変化
* intensity
* density
* decay
* resonance
* ambience
* micro timing
* 長周期変化

を導入し、

**規則性の中から複雑さが生まれる**

音響体験にしてください。

理想は、

「数学的な繰り返しを聴いているのに、ずっと聴いていられる」

状態です。

サウンド単体でも高品質である必要があります。

耳障りな高域、短すぎる発音、過度なクリック感、平坦な定位、過剰な反復、唐突な無音などを避けてください。

ヘッドフォンだけでなく、MacBookなど一般的な内蔵スピーカーでも心地よく成立させてください。

---

# 8. Sound × Visual Integration

今回のリニューアルでは、**サウンドとビジュアルの連動性を現在より大幅に強化してください。**

これは非常に重要な要件です。

映像と音がそれぞれ独立して動き、たまたま同じtransportを共有しているだけの状態にはしないでください。

また、

**映像にBGMを付ける**

という関係にも絶対にしないでください。

理想は、

**数学的構造から音と映像が同時に立ち上がり、互いの存在によって一つの現象として知覚される状態**

です。

基本的な因果構造は、

**Mathematics → Sound**
**Mathematics → Visual**

としてください。

そのうえで知覚上は、

**Sound ↔ Visual**

が強く結びついているよう設計してください。

例えば一つの数学イベントに対して、

* 点が発光すると同時に音が生まれる
* 位相が変化すると音像と視覚位置が同時に移動する
* 振幅が大きくなると視覚エネルギーと音響エネルギーが対応する
* 周波数帯によって空間的位置、粒子挙動、色温度、材質感が変化する
* coefficientの変化が音色と形状の両方へ反映される
* resonanceの成長が光の残響や空間的余韻にも反映される
* decayが音だけでなく残光や粒子寿命にも対応する
* phase interferenceが音響的干渉と視覚的干渉の両方へ現れる
* densityの変化が発音密度と空間密度の双方へ作用する

といった関係を積極的に設計してください。

ただし、

「音量に合わせて画面を光らせる」

だけの単純なaudio reactive visualizationにはしないでください。

FFT analyzerの値をそのままparticle scaleへ接続するような安易な連動も主軸にしないでください。

Fourier Gardenでは、

**音と映像の双方が、同じ数学的原因を共有している**

ことが重要です。

---

# 9. Audio-Visual Causality

サウンドとビジュアルの対応関係は、Chapterごとに設計してください。

例えば、

* pitch ↔ spatial height
* phase ↔ angular position
* amplitude ↔ luminous intensity
* coefficient magnitude ↔ scale / particle density
* sign ↔ direction / polarity
* harmonic index ↔ radius / layer
* eigenmode ↔ spatial region
* local energy ↔ material excitation
* approximation error ↔ visual residue / tension
* convergence ↔ visual stabilization
* interference ↔ spatial and acoustic beating

などが候補になります。

ただし固定ルールを全Chapterへ機械的に適用しないでください。

各Chapterの数学的意味に最適なmappingを設計してください。

重要なのは、

**ユーザーが音を聴いた瞬間に、どの視覚現象と結びついているか感覚的に理解できること**

です。

そして逆に、

**視覚現象を見たときに、その構造を音として予測できる**

程度まで一貫性を高めてください。

---

# 10. Synchronization Quality

Audio / Visual synchronizationは商業作品レベルで精密にしてください。

以下を確認してください。

* transport synchronization
* audiovisual event timing
* frame/audio scheduling difference
* animation latency
* AudioContext timing
* visual interpolation
* Chapter switching
* pause / resume
* seek / deterministic QA
* long-running drift

サウンドイベントと視覚イベントが数フレームずれて「なんとなく同期している」状態を完成としないでください。

AudioContextの高精度クロックを基準とするか、既存transport architectureを改善するなどして、長時間動作しても音と映像の関係が崩れない設計にしてください。

ただし映像を音声sample単位で無理に追従させる必要はありません。

人間の知覚上、

**一つの現象として自然に感じられる精度**

を目指してください。

---

# 11. Cross-Modal Design

Sound × Visualの関係は、単なる同期だけではなくcross-modalな感覚設計まで踏み込んでください。

例えば、

高い音だから上、
低い音だから下、

という単純な対応だけではなく、

* 音の硬さ ↔ material
* 音の広がり ↔ spatial diffusion
* transient ↔ visual impulse
* resonance ↔ luminous persistence
* spectral brightness ↔ visual sharpness
* stereo width ↔ spatial spread
* modulation ↔ local deformation
* phase motion ↔ orbital motion
* reverberation ↔ atmospheric depth

など、人間の知覚上自然に対応する組み合わせを検討してください。

サウンドをミュートしても映像として成立し、

画面を見なくてもサウンドとして成立し、

**両方を同時に体験したときには、それぞれ単体より明確に価値が上がる**

状態を目標にしてください。

---

# 12. 数学を大幅に強化する

数学部分は現状維持ではありません。

ここもVersion 2としてアップデートしてください。

まず現在の全Chapterについて数学的監査を行い、

* 数式
* 定義
* 用語
* 可視化
* 数値計算
* 境界条件
* 係数
* 位相
* 周波数
* 説明
* ソニフィケーションとの対応
* ビジュアルとの対応

が正確であるか改めて検証してください。

誤り、曖昧な表現、数学的に弱い説明があれば改善してください。

---

# 13. 「正しい」だけではなく知的に面白い数学へ

数学について最も重要なのは、

**正確性だけで終わらないこと**

です。

Fourier Gardenを鑑賞した人が、

「これは何だろう？」
「なぜこの形になる？」
「別のパラメータならどうなる？」
「この現象には名前があるのか？」
「このChapter同士にはどんな関係がある？」
「今聴こえた音と、この動きはなぜ対応している？」

と思うような体験を作ってください。

各Chapterについて、

数学初心者には直感的な入口を、

数学に詳しい人には深く掘れる情報を用意してください。

例えば情報構造を、

1. 感覚的な説明
2. 現象の説明
3. 数学的定義
4. 数式
5. 音・映像へのmapping
6. さらに深い背景
7. 他Chapterとの関連

のように段階化することも検討してください。

最初から長い説明を表示するのではなく、

**美しい → 気になる → 理解する → さらに知りたくなる**

という順序を作ってください。

---

# 14. 数学と演出をより密接に結びつける

グラフィックやサウンドのパラメータをランダムな演出値だけで決めないでください。

可能な限り、

* coefficient
* amplitude
* frequency
* phase
* eigenvalue
* local energy
* nodal structure
* scale
* approximation error
* convergence
* symmetry
* arithmetic structure

などChapterの数学的構造から導いてください。

可能であれば同じ数学量から、

**audio parameter**
と
**visual parameter**

を別々に導き、

それらが知覚上自然に対応するよう設計してください。

すべてを数学に拘束する必要はありません。

詩的な造形は許容します。

ただし、

* mathematical truth
* sonification
* visualization
* artistic interpretation

の境界を明確にしてください。

そしてその境界自体もFourier Gardenの知的魅力にしてください。

---

# 15. UI / UXをゼロベースで再設計する

既存のUI配置を前提にしないでください。

以下をすべて再評価してください。

* Entry screen
* Main experience
* Chapter navigation
* Chapter transition
* Controls
* Details
* Formula display
* Mathematical annotations
* Title
* Chapter number
* Progress
* Volume
* Fullscreen
* Keyboard interaction
* help
* loading
* error state

UIは作品の上に載った操作パネルではなく、

**作品世界の一部**

として設計してください。

鑑賞中はUIの存在感を最小化し、必要になった瞬間には迷わず操作できる状態が理想です。

「説明するために映像を隠すUI」も避けてください。

---

# 16. Opening Experience

ENTER FOURIER GARDENから最初のChapterへ入る体験を再設計してください。

ここは作品の重要な第一印象です。

単なるloading screen + buttonではなく、

Fourier Gardenという世界へ入る感覚を作ってください。

特に、

**最初に音が生まれる瞬間と、最初の数学的ビジュアルが立ち上がる瞬間**

を一体として丁寧に設計してください。

音が先に流れてから画面が動く、あるいは映像だけ始まり後から音が付く、といった分離感を避けてください。

ただし長すぎるintroやskipしたくなる演出にはしないでください。

入力に対するレスポンスと、音と光が始まる瞬間を非常に丁寧に設計してください。

---

# 17. Chapter Transition

Chapter切替を重要な演出として再設計してください。

単なるfade out / title / fade inではなく、

前Chapterから次Chapterへ数学的世界が変化する感覚を作ってください。

サウンドと映像のtransitionも別々に処理するのではなく、

一つの遷移体験として設計してください。

例えば、

* 音響的な余韻が次Chapterの空間へ変換される
* 視覚的構造の崩壊と音響的decayが一致する
* 次Chapterの最初の数学イベントを音と光で同時に予告する

なども検討してください。

ただし毎回長い演出を強制しないよう、テンポにも配慮してください。

必要なら前後Chapterの数学的関係を短く示すことも検討してください。

---

# 18. Discoverability

現在ユーザーが気づきにくい機能や情報があれば改善してください。

ただし説明UIを増やすだけでは解決しないでください。

affordance、motion、timing、contextual hintなどを使い、

説明書を読まなくても自然に、

* Chapterを移動できる
* 詳細を見られる
* 音を操作できる
* fullscreenにできる
* 数学を深掘りできる

ようにしてください。

---

# 19. Micro Interaction

商業作品としての品質は細部で決まります。

以下のような要素にも意図を持ってください。

* hover
* focus
* press
* release
* cursor
* drag
* keyboard
* loading
* transition
* disabled
* error
* volume change
* fullscreen transition
* Details open / close

100〜500ms程度の小さな動きまで品質管理してください。

UI操作に音を付ける場合も、無意味な効果音を追加するのではなく、Fourier Gardenの音響世界と整合するものにしてください。

ただし動きを増やすこと自体を目的にはしないでください。

---

# 20. Camera

カメラは単なるscene viewerではなく演出装置として扱ってください。

必要に応じて、

* breathing
* orbital drift
* parallax
* slow push
* local focus
* event reaction

などを導入してください。

場合によっては音響空間の移動とカメラ挙動を緩やかに連携させることも検討してください。

例えば視点がある構造へ近づくと、その数学的成分の音響的存在感がわずかに増すなどです。

ただしゲーム的な3Dオーディオにはしないでください。

酔いや過剰演出につながらないよう非常に慎重に設計してください。

ユーザーが数学構造を観察できることを最優先してください。

---

# 21. Performance

グラフィックを高品質化してもパフォーマンスを犠牲にしないでください。

特に、

* WebGPU
* WebGL2 fallback
* high-DPI
* 4K
* ultra-wide
* long-running sessions
* Chapter switching
* GPU memory
* garbage collection
* shader compile
* buffer allocation
* React rerender
* AudioWorklet
* audiovisual synchronization overhead

を確認してください。

品質を落とす場合は、

数学的に重要な要素やAudio-Visual synchronizationより、

装飾レイヤーから段階的に落としてください。

adaptive qualityも必要であれば設計してください。

---

# 22. Accessibility

アート作品だからという理由でアクセシビリティを無視しないでください。

少なくとも、

* keyboard
* focus state
* reduced motion
* readable contrast
* semantic controls
* screen reader向け最低限の情報
* audio on/off
* volume

を適切に設計してください。

音をオフにした場合でも主要な数学的体験が成立するようにしてください。

逆に視覚情報を十分に得られないユーザーについても、可能な範囲で音響から構造を理解できる設計を検討してください。

ただしアクセシビリティ対応によって通常体験の美観を崩す必要はありません。

---

# 23. Architecture

今回のリニューアルに合わせてアーキテクチャも再評価してください。

特に、

* mathematical model
* simulation
* transport
* audio
* rendering
* scene
* audiovisual mapping
* dramaturgy
* presentation
* UI
* state
* chapter lifecycle
* QA

の責務を明確にしてください。

特にAudioとVisualが別々に数学値を再計算して微妙に異なる結果を使う構造は避けてください。

必要であれば、

**共通のmathematical event / state model**

を作り、

そこからaudioとvisualへ決定的にmappingする設計を検討してください。

これにより、

* synchronization
* reproducibility
* deterministic QA
* mathematical causality

を強化してください。

既存構造が優れていれば維持してください。

改善余地が大きいなら、大胆に整理してください。

過剰な抽象化は避けてください。

---

# 24. AGENTS.md / Documentation

現在のAGENTS.mdやdocsも監査してください。

過去の実装判断やQA履歴が今後のエージェントに対する永続的な命令になっている場合は整理してください。

理想的には、

`AGENTS.md`

は巨大な仕様書ではなく、

**このリポジトリを正しく理解するための短いmap**

にしてください。

詳細は目的別にdocsへ分離してください。

例えば、

* product vision
* architecture
* mathematical model
* audio design
* visual design
* audiovisual mapping
* chapter specification
* QA
* performance

などです。

各Chapterについて、

「どの数学量が、どの音響パラメータとどの視覚パラメータへ対応するか」

も必要に応じて文書化してください。

---

# 25. QA

テストが通るだけでは完成ではありません。

自動テストに加え、

実際にブラウザで作品を起動し、各Chapterを観察してください。

代表的な複数時刻を確認し、

* composition
* motion
* temporal variation
* visual hierarchy
* mathematics
* sound
* audiovisual synchronization
* audiovisual causality
* interaction
* transition
* readability
* performance

を評価してください。

静止画だけで品質判定しないでください。

可能であればChapter間比較も行ってください。

---

# 26. Audio-Visual QA

今回のリニューアルでは、Audio-Visual integrationを独立した品質項目としてQAしてください。

各Chapterについて、

* 発音と発光・運動のタイミングが自然か
* 音の位置と視覚的位置が整合しているか
* 音色変化とmaterial / color / motionが自然に対応するか
* density変化が音と映像の双方で同じ構造として感じられるか
* climaxが単に音量とbrightnessを同時に上げただけになっていないか
* 静かな場面でも音と映像の関係が維持されているか
* 長時間動作でsync driftが発生しないか
* pause / resume後に関係が崩れないか
* Chapter transitionで音と映像が分離しないか

を確認してください。

音だけを評価するQAと、映像だけを評価するQAに加えて、

**両方を同時に体験したときの品質**

を必ず評価してください。

---

# 27. あなた自身から改善を提案する

ここまで書かれていないことで、

Fourier Gardenをさらに優れた作品にできるアイデアがあれば積極的に採用してください。

今回の指示を単なるチェックリストとして扱わず、

**creative director

* interaction designer
* graphics engineer
* audio designer
* audiovisual artist
* mathematician
* frontend architect**

として作品全体を評価してください。

ユーザーの指示通りに直すだけではなく、

「この作品にはこれが必要だ」

と思う改善を自分から発見してください。

ただし機能を増やすことを目的にしないでください。

作品体験を強化しない機能は追加しないでください。

---

# 28. 禁止事項

以下の状態を完成としないでください。

* 既存UIの見た目を少し変えただけ
* particle数を増やしただけ
* bloomを強くしただけ
* 色を派手にしただけ
* shaderを複雑にしただけ
* BGMを豪華にしただけ
* 数学説明を長くしただけ
* glass panelを増やしただけ
* screenshotでは綺麗だが動くと単調
* 全Chapterが似ている
* UIだけが高品質で本体が変わっていない
* 音と映像が別々に高品質なだけ
* 音量に合わせて画面を光らせるだけのaudio reactive表現
* 音と映像が同じtransportに乗っているだけ
* buildが通っただけ
* benchmarkだけ良い
* 自動テストだけ通った

---

# 29. 実装前

まずリポジトリ全体を十分に調査してください。

特に、

* README
* AGENTS.md
* docs
* src
* tests
* QA assets

を確認してください。

可能であれば現在版をブラウザで実際に操作してください。

その上で短く、

* 現在版の優れた点
* 現在版の限界
* Version 2のArt Direction
* Sound Direction
* Audio-Visual Direction
* Mathematical Direction
* Preserve / Refactor / Rebuild / Remove
* 実装Phase

を整理してください。

ただし、分析だけで作業を終了しないでください。

十分に理解したらそのまま実装へ進んでください。

---

# 30. Implementation

大規模変更なので、段階的に実装してください。

各Phaseで、

1. implementation
2. typecheck
3. lint
4. tests
5. build
6. browser QA
7. visual QA
8. audio QA
9. audiovisual QA

を実施してください。

問題を見つけたら次へ進む前に修正してください。

既存テストが旧UIを固定しているだけの場合は、旧実装を守るのではなくVersion 2で守るべきbehaviorへテストを更新してください。

---

# 31. 最終完成条件

最終成果物は、

**Fourier Gardenという同じ作品だと分かるのに、体験すると完全に別次元へ進化している**

状態を目標にしてください。

具体的には、

* 世界観が明確
* 商業品質
* グラフィックが繊細かつ緻密
* 長時間見ても変化と発見がある
* サウンドが数学的かつ心地よい
* 音と映像が強く連動している
* 音と映像が同じ数学的原因から生まれている
* 発音と視覚イベントの因果が感覚的に理解できる
* 音だけ・映像だけより、同時体験で明確に価値が上がる
* Chapterごとの個性が強い
* 数学的正確性が高い
* 数学をもっと知りたくなる
* 初見でも楽しめる
* 詳細を知りたい人には十分深い
* UIが邪魔しない
* Interactionが精密
* Chapter transitionも作品の一部になっている
* 高品質でも安定して動作する
* 長時間動作してもAudio / Visual syncが崩れない
* コードとドキュメントが整理されている

ことを要求します。

「改善したVersion 1」ではなく、

**Fourier Gardenの決定版**

を作るつもりで取り組んでください。

必要な変更範囲に制限はありません。

Fourier Gardenのコンセプトを守りながら、最高の作品にしてください。
