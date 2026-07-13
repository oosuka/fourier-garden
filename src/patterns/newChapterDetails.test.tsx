import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PatternDefinition } from "./contracts";
import { besselTidePattern } from "./bessel-tide/definition";
import { dirichletLanternsPattern } from "./dirichlet-lanterns/definition";
import { lissajousOrchardPattern } from "./lissajous-orchard/definition";
import { phaseTorusPattern } from "./phase-torus/definition";
import { primeConstellationPattern } from "./prime-constellation/definition";
import { riemannVeilPattern } from "./riemann-veil/definition";
import { waveletRainPattern } from "./wavelet-rain/definition";

const NEW_PATTERNS: readonly PatternDefinition[] = [
  primeConstellationPattern,
  besselTidePattern,
  lissajousOrchardPattern,
  dirichletLanternsPattern,
  waveletRainPattern,
  riemannVeilPattern,
  phaseTorusPattern,
];

describe("new chapter Details information contract", () => {
  it.each(NEW_PATTERNS)("gives $id a substantial gentle and educational account", (pattern) => {
    expect(pattern.education.gentleBody.length).toBeGreaterThanOrEqual(100);
    expect(pattern.education.mathematicalBody.length).toBeGreaterThanOrEqual(90);
    expect(pattern.education.scopeNotice.length).toBeGreaterThanOrEqual(70);
    expect(pattern.education.sonificationBody.length).toBeGreaterThanOrEqual(100);
    expect(pattern.education.poeticLayerBody.length).toBeGreaterThanOrEqual(65);
  });

  it.each(NEW_PATTERNS)("gives $id quantitative tables and a causality ledger", (pattern) => {
    const MathematicalDetails = pattern.MathematicalDetails;
    const markup = renderToStaticMarkup(<MathematicalDetails />);

    expect(markup).toContain("EXACT MATHEMATICAL LAYER");
    expect(markup).toContain("SOUND–SHAPE CAUSALITY");
    expect(markup).toContain("変換アルゴリズム");
    expect(markup.match(/<dt>/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
    expect(markup.match(/<tr>/g)?.length ?? 0).toBeGreaterThanOrEqual(10);
    expect(markup.match(/analyticProfileItem/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });
});
