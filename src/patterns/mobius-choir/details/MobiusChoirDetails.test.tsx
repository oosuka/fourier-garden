import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MOBIUS_CHOIR_SCORE } from "../audio/score";
import { MOBIUS_CHOIR_DEFINITION } from "../math/model";
import type { MobiusChoirPatternDefinition } from "../types";
import { MobiusChoirDetails } from "./MobiusChoirDetails";

const pattern = {
  formulaLatex: "u_M(x,y,t)=\\sum b_{mn}\\sin(mx)\\cos(ny-\\sqrt{\\lambda_{mn}}s_M(t))",
  definition: MOBIUS_CHOIR_DEFINITION,
  mathematics: {
    eigenfunctionLatex: "\\phi_{mn}(x,y)=\\sin(mx)e^{iny}",
    coefficientLatex: "b_{mn}=C_M/(1+\\lambda_{mn})",
    embeddingLatex: "F(x,y)",
  },
  audio: { score: MOBIUS_CHOIR_SCORE },
  education: {
    mathematicalBody: "flat quotientの解析的有限モード和です。",
    scopeNotice: "表示は非等長埋め込みであり、誘導計量の固有モードではありません。",
  },
} as MobiusChoirPatternDefinition;

const detailsStyles = readFileSync("src/patterns/mobius-choir/details/details.css", "utf8");

describe("MobiusChoirDetails", () => {
  it("shows the quotient, parity analysis, mode table, and non-isometric scope", () => {
    const markup = renderToStaticMarkup(<MobiusChoirDetails pattern={pattern} />);

    expect(markup).toContain("(x,0)∼(π−x,π)");
    expect(markup).toContain("m+nは奇数");
    expect(markup).toContain("許容");
    expect(markup).toContain("不許容");
    expect(markup).toContain("6モード");
    expect(markup).toContain("12,288頂点");
    expect(markup).toContain("56.470588秒");
    expect(markup).toContain("78イベント");
    expect(markup).toContain("非等長埋め込み");
    expect(markup).not.toContain("FFT解析");
  });

  it("fits long equations inside the desktop detail panel", () => {
    expect(detailsStyles).toContain(".app--mobius-choir .detailsPanel .detailsFormula .katex");
    expect(detailsStyles).toContain(".app--mobius-choir .detailsPanel .mathIdentity .katex");
  });
});
