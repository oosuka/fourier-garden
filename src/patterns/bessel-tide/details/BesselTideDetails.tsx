import { AnalyticPatternDetails } from "../../../components/AnalyticPatternDetails";
import { BESSEL_MODES, BESSEL_ZEROS } from "../math/model";

const IDENTITIES = [
  "-\\Delta\\phi_{m,n}^q=j_{m,n}^2\\phi_{m,n}^q,\\qquad \\phi_{m,n}^q|_{r=1}=0",
  "R_{m,n}(r)=\\frac{\\sqrt2J_m(j_{m,n}r)}{|J_{m+1}(j_{m,n})|},\\qquad \\int_0^1R_{m,n}R_{m,\\ell}\\,r\\,dr=\\delta_{n\\ell}",
  "u_B=\\sum_{(m,n,q)\\in\\mathcal K_B}\\widetilde a_{m,n}^q\\cos\\!\\left(\\frac{0.18j_{m,n}}{j_{0,1}}t\\right)\\phi_{m,n}^q",
];

const MODE_ROWS = BESSEL_MODES.map((mode) => ({
  id: `bessel-${mode.m}-${mode.n}-${mode.q}`,
  cells: {
    mode: `(${mode.m},${mode.n},${mode.q === "zero" ? "0" : mode.q})`,
    zero: mode.zero.toFixed(6),
    eigenvalue: (mode.zero * mode.zero).toFixed(4),
    coefficient: mode.coefficient.toFixed(5),
    circles: String(mode.n - 1),
    diameters: String(mode.m),
  },
}));

export function BesselTideDetails() {
  return (
    <AnalyticPatternDetails
      formulaLatex={IDENTITIES[2]!}
      identities={IDENTITIES.slice(0, 2)}
      mathematicalBody={[
        "単位円板D={(r,θ) | 0≤r<1}上のDirichlet Laplacianを、半径方向のBessel方程式と角度方向の三角関数へ変数分離します。境界条件Jₘ(jₘₙ)=0を満たす正のDirichlet零点jₘₙだけを使い、Neumann零点J′ₘ=0とは区別します。",
        "半径関数Rₘₙは測度r drに関して正規直交化し、m=0は定数角度成分、m>0はcos(mθ)とsin(mθ)の二つの実成分を持ちます。jₘₙ≤10の固定零点表から17実モードを選び、係数絶対値和が1になるよう正規化しています。",
        "係数は解析的な角度積分と64点Gauss–Legendre求積による半径射影から構成します。波動時間は各固有周波数jₘₙに比例して絶対transport上を進み、72秒の潮汐スコアが戻っても固有モード位相は巻き戻りません。",
      ]}
      scopeNotice="表面の厳密円板はr=1で常に0です。外側の有機膜と水煙は別の詩的シェルであり、境界を動かしません。使用するのはDirichlet零点で、Neumann境界・数値固有値解析・FFTではありません。"
      parameters={[
        { label: "領域", value: "単位円板 D / 測度 r dr dθ" },
        { label: "境界条件", value: "φ|r=1=0（Dirichlet）" },
        { label: "零点表", value: `${BESSEL_ZEROS.length}組 / m≤4、jₘₙ≤10` },
        { label: "有限基底", value: `${BESSEL_MODES.length}実モード` },
        { label: "角度成分", value: "m=0: 1、m>0: cos / sin" },
        { label: "係数計算", value: "解析角度積分＋64点求積" },
        { label: "係数正規化", value: "Σ|ãₘₙᵠ|=1" },
        { label: "数学時刻", value: "0.18jₘₙt/j₀₁ / 絶対transport" },
        { label: "音楽構成", value: "72秒 / 432イベント / 6発音毎秒 / 5幕" },
        { label: "変換アルゴリズム", value: "DFT・FFT不使用" },
      ]}
      profile={{
        eyebrow: "MODAL COEFFICIENT PROFILE",
        title: "17実モードの符号付き係数 ãₘₙᵠ",
        description:
          "棒長は正規化後の係数絶対値、紫は負符号です。音響ゲインへ渡す前の厳密な有限展開係数を示します。",
        items: BESSEL_MODES.map((mode) => ({
          id: `coefficient-${mode.m}-${mode.n}-${mode.q}`,
          label: `${mode.m},${mode.n},${mode.q === "zero" ? "0" : mode.q[0]}`,
          value: mode.coefficient,
          displayValue: mode.coefficient.toFixed(3),
        })),
      }}
      tables={[
        {
          eyebrow: "FOURIER–BESSEL MODES",
          title: "零点・固有値・節構造・射影係数",
          description:
            "内部節円はn−1本、節径はm本です。r=1のDirichlet境界は内部節円の本数へ含めません。",
          columns: [
            { key: "mode", label: "(m,n,q)" },
            { key: "zero", label: "jₘₙ" },
            { key: "eigenvalue", label: "λ=j²" },
            { key: "coefficient", label: "ã" },
            { key: "circles", label: "内部節円" },
            { key: "diameters", label: "節径" },
          ],
          rows: MODE_ROWS,
        },
      ]}
      causality={[
        {
          id: "bessel-zero",
          quantity: "Dirichlet零点jₘₙ",
          status: "保持",
          visual: "節円の半径と固有振動",
          audio: "零点順を保った音高配置",
        },
        {
          id: "bessel-angular",
          quantity: "角度次数m・成分q",
          status: "保持",
          visual: "m本の節径と局所波紋",
          audio: "角度成分に基づく定位",
        },
        {
          id: "bessel-pitch",
          quantity: "固有周波数jₘₙ",
          status: "圧縮",
          visual: "絶対時刻の定在波位相",
          audio: "420–940 Hzへ線形正規化",
        },
        {
          id: "bessel-poetic",
          quantity: "外側膜・霧・水滴ハロー",
          status: "演出",
          visual: "円板境界外の余韻層",
          audio: "係数にない短い残響膨張",
        },
      ]}
    />
  );
}
