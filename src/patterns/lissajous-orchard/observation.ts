import type { ObservationContent } from "../contracts";

export const observation: ObservationContent = {
  subject: "有理比の往復 · Lissajous曲線",
  accent: "#b7c49a",
  invitation: "二つの往復が、ひとつの閉じた形を結ぶ。",
  question: "位相を変えても、曲線が閉じるのはなぜ？",
  answer:
    "横と縦の振動回数の比が有理数なら、両方が最初の状態へ戻る時刻があります。本章ではFarey列から選んだ9組の比を使い、相対位相をゆっくり変えて、同じ回転数から異なる形が現れる様子を見せます。",
  mapping:
    "曲線上の標本から反復する音高・強弱の楽譜を作り、対応する場所で弦状の光が鳴ります。光と音像の左右位置は現在の曲線を追い、音高の楽譜に使う基準時刻とは分けています。形がゆっくり変わっても、音と光は同じ位相をたどります。",
  background:
    "各フレームに描かれるのは、相対位相をその瞬間の値に固定した閉曲線です。位相が動き続ける一つの点の軌跡を、そのまま一周分描いたものではありません。",
  related: [
    {
      id: "phase-torus",
      reason: "比が無理数になると、帰り道は閉じなくなる。",
    },
    {
      id: "residue-bloom",
      reason: "複数の回転を、一つの曲線へ合成する。",
    },
  ],
};
