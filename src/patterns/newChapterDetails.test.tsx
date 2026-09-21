import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createEnergyBalancedPikoScore } from "../audio/pikoProgram";
import type { PatternDefinition } from "./contracts";
import { besselTidePattern } from "./bessel-tide/definition";
import { dirichletLanternsPattern } from "./dirichlet-lanterns/definition";
import { LISSAJOUS_ORCHARD_SCORE, getLissajousAudioMapping } from "./lissajous-orchard/audio/score";
import { LISSAJOUS_RATIOS } from "./lissajous-orchard/math/model";
import { lissajousOrchardPattern } from "./lissajous-orchard/definition";
import { PHASE_TORUS_SCORE } from "./phase-torus/audio/score";
import { TORUS_MODES } from "./phase-torus/math/model";
import { phaseTorusPattern } from "./phase-torus/definition";
import { primeConstellationPattern } from "./prime-constellation/definition";
import { RIEMANN_VEIL_SCORE, getRiemannEventMapping } from "./riemann-veil/audio/score";
import { riemannVeilPattern } from "./riemann-veil/definition";
import { WAVELET_RAIN_SCORE } from "./wavelet-rain/audio/score";
import { HAAR_COEFFICIENTS } from "./wavelet-rain/math/model";
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
    expect(markup.match(/<tr>/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(markup).toContain("analyticTableScroll");
    expect(markup.match(/analyticProfileItem/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it.each(NEW_PATTERNS)("presents $id causality rows as labeled vertical entries", (pattern) => {
    const Details = pattern.MathematicalDetails;
    const markup = renderToStaticMarkup(<Details />);
    const entries = markup.match(/<section class="causalityEntry">[\s\S]*?<\/section>/g) ?? [];

    expect(markup).toContain('class="causalityEntries"');
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      expect(entry).toMatch(/<h3>[^<]+<\/h3>/);
      expect(entry.match(/<dt>(?:区分|局所映像|音響写像)<\/dt>/g)).toHaveLength(3);
      expect(entry.match(/<dd>[\s\S]*?<\/dd>/g)).toHaveLength(3);
    }
  });

  it("keeps the Lissajous identity in layout-safe rows", () => {
    const Details = lissajousOrchardPattern.MathematicalDetails;
    const markup = renderToStaticMarkup(<Details />);

    expect(markup).toMatch(/class="detailsFormula"[^>]*>[\s\S]*mtable/);
  });

  it("keeps the Dirichlet kernel identity in layout-safe rows", () => {
    const Details = dirichletLanternsPattern.MathematicalDetails;
    const markup = renderToStaticMarkup(<Details />);

    expect(markup).toMatch(/class="detailsFormula"[^>]*>[\s\S]*mtable/);
  });

  it("breaks the Haar piecewise input formula at a meaningful term boundary", () => {
    const Details = waveletRainPattern.MathematicalDetails;
    const markup = renderToStaticMarkup(<Details />);

    expect(markup).toMatch(/class="mathIdentity mathIdentity--compact"[^>]*>[\s\S]*?mtable/);
  });

  it("describes the current Haar audio mapping and matches every score event", () => {
    const Details = waveletRainPattern.MathematicalDetails;
    const markup = renderToStaticMarkup(<Details />);

    expect(markup).not.toContain("440+96j");
    expect(markup).not.toContain("シアン/紫");
    expect(markup).toContain("変調前の基準音高 f_j=420+62j Hz");
    expect(markup).toContain("支持中心を左右定位の基準panへ写像");
    expect(markup).toContain("実出力gain");

    expect(WAVELET_RAIN_SCORE.events).toHaveLength(320);
    const balancedPanFromMapping = createEnergyBalancedPikoScore({
      ...WAVELET_RAIN_SCORE,
      events: WAVELET_RAIN_SCORE.events.map((event) => {
        const coefficient = HAAR_COEFFICIENTS[event.sourceIndex % 63]!;
        return {
          ...event,
          pan: 1.6 * (coefficient.start + 2 ** (-coefficient.j - 1)) - 0.8,
        };
      }),
    });

    for (const [index, event] of WAVELET_RAIN_SCORE.events.entries()) {
      const coefficient = HAAR_COEFFICIENTS[event.sourceIndex % 63]!;
      expect(event.frequencyHz).toBeCloseTo(420 + 62 * coefficient.j, 12);
      expect(event.pan).toBeCloseTo(balancedPanFromMapping.events[index]!.pan, 12);
      expect(event.mathematicalGain).toBeCloseTo(Math.abs(coefficient.value), 12);
      expect(event.phaseOffset).toBe(coefficient.value < 0 ? Math.PI : 0);
    }
  });

  it("describes the Lissajous score mapping and matches all 288 events", () => {
    const Details = lissajousOrchardPattern.MathematicalDetails;
    const markup = renderToStaticMarkup(<Details />);

    expect(markup).not.toContain("左右声部の発音分割比");
    expect(markup).not.toContain("整数和a+b");
    expect(markup).not.toContain("500–890 Hz");
    expect(markup).toContain("9比×32点");
    expect(markup).toContain("60秒288発音");
    expect(markup).toContain("発音間隔は60/288秒で等間隔");
    expect(markup).toContain("f=440+12r+90(x+1)+50(y+1) Hz");
    expect(markup).toContain("基準pan");
    expect(markup).toContain("時間変調");

    const events = LISSAJOUS_ORCHARD_SCORE.events;
    expect(events).toHaveLength(288);
    const eventsPerRatio = Array.from({ length: LISSAJOUS_RATIOS.length }, () => 0);
    const balancedPanFromMapping = createEnergyBalancedPikoScore({
      ...LISSAJOUS_ORCHARD_SCORE,
      events: events.map((event) => {
        const mapping = getLissajousAudioMapping(event.sourceIndex);
        return { ...event, pan: mapping.point[1] * 0.12 };
      }),
    });

    for (const [index, event] of events.entries()) {
      const mapping = getLissajousAudioMapping(event.sourceIndex);
      const [x, y] = mapping.point;
      expect(event.sourceIndex).toBe(index);
      expect(mapping.localSlot).toBe(index % 32);
      eventsPerRatio[mapping.ratioIndex] += 1;
      expect(event.timeSeconds).toBeCloseTo(index * (60 / 288), 12);
      expect(event.frequencyHz).toBeCloseTo(
        440 + 12 * mapping.ratioIndex + 90 * (x + 1) + 50 * (y + 1),
        12,
      );
      expect(event.pan).toBeCloseTo(balancedPanFromMapping.events[index]!.pan, 12);
    }
    for (let index = 1; index < events.length; index += 1) {
      expect(events[index]!.timeSeconds - events[index - 1]!.timeSeconds).toBeCloseTo(60 / 288, 12);
    }
    expect(eventsPerRatio).toEqual(Array.from({ length: LISSAJOUS_RATIOS.length }, () => 32));
  });

  it("keeps the Lissajous sonification formula aligned with its score", () => {
    expect(lissajousOrchardPattern.audio.sonificationLatex).not.toContain("left/right subdivision");
    expect(lissajousOrchardPattern.audio.sonificationLatex).toContain("440+12r+90(x+1)+50(y+1)");
  });

  it("describes the Phase Torus pitch mapping used by every score event", () => {
    const Details = phaseTorusPattern.MathematicalDetails;
    const markup = renderToStaticMarkup(<Details />);
    const formula = phaseTorusPattern.audio.sonificationLatex;
    const representatives = TORUS_MODES.filter(
      (mode) => mode.m > 0 || (mode.m === 0 && mode.n > 0),
    );
    const expectedFrequencies = representatives.map((mode) => {
      const speed = Math.abs(mode.m + mode.n * Math.SQRT2);
      return 430 + Math.min(1, speed / 7) * 390;
    });

    expect(markup).not.toContain("440–960 Hz");
    expect(markup).toContain("430+390");
    expect(formula).not.toContain("440+520");
    expect(formula).toContain("430+390");
    expect(formula).toContain("\\min");
    expect(PHASE_TORUS_SCORE.events).toHaveLength(420);

    for (const [index, event] of PHASE_TORUS_SCORE.events.entries()) {
      expect(event.frequencyHz).toBeCloseTo(
        expectedFrequencies[index % representatives.length]!,
        12,
      );
    }
  });

  it("separates Riemann mathematical coefficients from audible gain and pitch", () => {
    const Details = riemannVeilPattern.MathematicalDetails;
    const markup = renderToStaticMarkup(<Details />);

    expect(markup).not.toContain("460–1,020 Hz");
    expect(markup).toContain("数学gain=1/n²");
    expect(markup).toContain("0.20 n^-0.7");
    expect(markup).toContain("0.07+0.14/√n");
    expect(markup).toContain("応答gain");
    expect(markup).toContain("間隔補正");
    expect(markup).toContain("主音ν_n=460–700 Hz");
    expect(markup).toContain("応答は0.875倍・0.75倍で380–612.5 Hz");
    expect(markup).toContain("変調前の基準値");

    const events = RIEMANN_VEIL_SCORE.events;
    expect(events).toHaveLength(285);
    const mainFrequencies: number[] = [];
    const responseFrequencies: number[] = [];
    const responseRatios = [1, 0.875, 0.75] as const;

    for (const [index, event] of events.entries()) {
      const mapping = getRiemannEventMapping(event.sourceIndex);
      const mainFrequencyHz = 460 + ((mapping.indexN - 1) / 18) ** 0.72 * 240;
      const expectedFrequencyHz = Math.max(
        380,
        mainFrequencyHz * responseRatios[mapping.responseStep],
      );

      expect(event.sourceIndex).toBe(index);
      expect(event.timeSeconds).toBeCloseTo(mapping.eventTimeSeconds, 12);
      expect(event.frequencyHz).toBeCloseTo(expectedFrequencyHz, 12);
      expect(event.mathematicalGain).toBeCloseTo(1 / mapping.indexN ** 2, 12);
      expect(event.gain).not.toBe(event.mathematicalGain);
      if (mapping.response) responseFrequencies.push(event.frequencyHz);
      else mainFrequencies.push(event.frequencyHz);
    }

    expect(mainFrequencies).toHaveLength(95);
    expect(responseFrequencies).toHaveLength(190);
    expect(Math.min(...mainFrequencies)).toBeCloseTo(460, 12);
    expect(Math.max(...mainFrequencies)).toBeCloseTo(700, 12);
    expect(Math.min(...responseFrequencies)).toBeCloseTo(380, 12);
    expect(Math.max(...responseFrequencies)).toBeCloseTo(612.5, 12);
  });
});
