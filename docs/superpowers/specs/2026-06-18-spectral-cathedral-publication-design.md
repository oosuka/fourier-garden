# Spectral Cathedral 通常公開設計

## 状態

- 実施結果: 2026年6月19日に通常公開済み
- 対象: Chapter 2 `Spectral Cathedral / スペクトルの聖堂`
- 目的: クエリなしの通常URLでChapter 1とChapter 2を切り替え可能にする
- 前提: 数学、DSP、厳密描画、詩的造形、詳細UI、章切替基盤は実装済み
- 非自動条件: ヘッドホンとMac内蔵スピーカーによる主観的な最終試聴
- 後続変更: 音響・詩的造形・総合演出は2026年6月20日の動勢再設計で更新

## 方針

Chapter 2を通常公開レジストリへ昇格し、`publication`を`published`へ変更する。
既存のpreviewレジストリと`?chapters=preview`は、過去のQA URLと将来の未公開章を
扱う入口として残す。現時点では通常レジストリとpreviewレジストリが同じ2章を返す。

実機試聴が未完了である事実は文書から削除しない。ただし、通常URLから章を選べない
公開制限は解除し、自動検証済みの実装と主観的な音響確認を別の完了条件として記録する。

## 変更範囲

### レジストリと公開メタデータ

- `patternRegistry`へ`residueBloomPattern`と`spectralCathedralPattern`を順番に登録する
- `spectralCathedralPattern.publication`を`published`へ変更する
- `patternPreviewRegistry`と`getPatternRegistry(search)`の契約を維持する
- 通常URLと`?chapters=preview`の両方で同じ2章を取得できるようにする
- Chapter 2の`PREVIEW`表示を解除する

### 維持する実装

次は変更しない。

- Dirichletラプラシアン固有モードの数学定義と12モード
- 絶対transport時刻と反復スコアの分離
- 鐘状ソニフィケーション、帯域制限、リミッター、AudioWorklet
- WebGPU/WebGL2のシーン実装
- 固定格子面、境界、節線、固有値解析表示
- 詩的造形層と厳密数学層の分離
- 章切替時のAudioContext、scene、transportの破棄と再初期化

## データフロー

通常起動時に`getPatternRegistry(window.location.search)`が2章を返す。`App`は現在章を
同じ既存フローで選び、`ControlBar`が前後移動ボタンを表示する。章切替時は既存どおり
旧AudioEngineを停止・破棄し、transportを0秒へ戻してから新しいsceneとaudio programを
選択する。previewクエリでも同じ処理を使い、特別なChapter 2分岐は追加しない。

## エラー処理

既存のscene初期化エラー、音声初期化エラー、非同期章切替の世代管理を維持する。
公開昇格のための新しい例外処理やフォールバックは追加しない。

## テスト

実装前に次の期待へテストを変更し、現行実装で失敗することを確認する。

- 通常レジストリがChapter 1とChapter 2を返す
- クエリなしの`getPatternRegistry("")`が2章を返す
- Chapter 2の公開状態が`published`である
- 通常URL相当のApp契約でChapter 2が利用可能である
- Chapter 2では`PREVIEW`表示を出さない

最小実装後に対象テスト、`npm run check`、`git diff --check`を実行する。

## ブラウザQA

最新版Chromeで次を確認する。

- `http://127.0.0.1:5173/`でChapter 2への移動ボタンが表示される
- Chapter 1からChapter 2、Chapter 2からChapter 1へ移動できる
- 再生中と一時停止中の章切替
- Chapter 2の詳細パネル、音量、全画面
- WebGPU通常経路
- `?renderer=webgl&seed=qa&quality=high`のWebGL2経路
- console error、未処理Promise rejection、不要なcanvas残留がない

## 文書同期

`README.md`、`docs/mathematical-model.md`、`design-qa.md`、既存の統合計画を、
通常公開済みの状態へ更新する。`?chapters=preview`は将来の未公開章と過去QA URLの
互換入口として説明する。実機試聴は未確認事項として残し、試聴済みとは記録しない。

## 完了条件

- 通常URLでChapter 2へ切り替えられる
- Chapter 2が通常公開メタデータを持つ
- 数学、音響、描画の不変条件に変更がない
- 自動テスト、型検査、lint、format、production buildが成功する
- WebGPUとWebGL2の通常URL章切替QAが成功する
- 実機試聴、実hidden復帰、ネイティブ全画面の見た目、長時間実機メモリが
  明示された手動確認事項として残る
