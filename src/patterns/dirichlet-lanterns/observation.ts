import type { ObservationContent } from "../contracts";

export const observation: ObservationContent = {
  subject: "波の集積 · Gibbs現象とFejér平均",
  accent: "#dfad7d",
  invitation: "鋭くなる中心。そのそばの揺れは、消えるだろうか。",
  question: "項を増やせば、角のはみ出しも消える？",
  answer:
    "矩形波の部分和では、不連続点の近くのはみ出しは狭い場所へ集まりながら残ります。これがGibbs現象です。Fejér平均は、それまでの部分和を平均することで別の収束の仕方を作ります。",
  mapping:
    "奇数調波の係数1/nを音の強さへ、次数のまとまりを左右の灯りへ。発音した調波で選ばれる核の標本点に火が入り、小さな側葉にも対応する余韻が残ります。",
  background:
    "上の4つの核はD_N/(2N+1)で正規化し、頂点を同じ高さで比較します。下の2本は矩形波の部分和とFejér平均。核の高さと矩形波の振幅を、同じ尺度だと思わず見分けてください。",
  related: [
    {
      id: "wavelet-rain",
      reason: "不連続な形を、局所的な基底で表すとどうなるか。",
    },
    {
      id: "riemann-veil",
      reason: "係数の減衰と細部の増加を、別の級数で比べる。",
    },
  ],
};
