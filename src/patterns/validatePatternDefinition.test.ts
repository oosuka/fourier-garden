import { describe, expect, it } from "vitest";

import { MOBIUS_CHOIR_SCORE } from "../audio/mobiusChoirScore";
import { createMobiusChoirAudioProgram } from "../audio/mobiusChoirSynthesis";
import { MOBIUS_CHOIR_DEFINITION } from "../math/mobiusChoir";
import { MOBIUS_CHOIR_DRAMATURGY_SECTIONS } from "./mobiusChoirDramaturgy";
import { patternPreviewRegistry, patternRegistry } from "./registry";
import type { MobiusChoirPatternDefinition, ResidueBloomPatternDefinition } from "./types";
import { validatePatternDefinition } from "./validatePatternDefinition";

function mutatePattern(
  mutate: (pattern: ResidueBloomPatternDefinition) => ResidueBloomPatternDefinition,
): ResidueBloomPatternDefinition {
  const pattern = patternRegistry[0];
  if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
  return mutate(pattern);
}

function getResidueBloomPattern(): ResidueBloomPatternDefinition {
  const pattern = patternRegistry[0];
  if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
  return pattern;
}

function getMobiusChoirPattern(): MobiusChoirPatternDefinition {
  return {
    kind: "mobius-choir",
    id: "mobius-choir",
    order: 3,
    publication: "preview",
    title: { en: "Möbius Choir", ja: "メビウスの合唱" },
    subtitle: { en: "A traveling wave on a flat quotient", ja: "平坦な商空間を巡る進行波" },
    formulaLatex: "u_M(x,y,t)",
    dramaturgy: {
      cycleSeconds: MOBIUS_CHOIR_SCORE.cycleSeconds,
      sections: MOBIUS_CHOIR_DRAMATURGY_SECTIONS,
      expressiveAxes: ["density", "register", "timbre", "space", "motion", "color"],
      localMathMapping: true,
      qualityContract: {
        comparableLoudness: true,
        decayingSonicContinuity: true,
        nonuniformVisualField: true,
        localVisualMotion: true,
        humanReviewRequired: true,
      },
    },
    presentation: {
      observatoryLabel: "MOBIUS CHOIR OBSERVATORY",
      formulaEyebrow: "FLAT QUOTIENT / 平坦商空間",
      formulaSummary: "Analytic traveling-wave synthesis.",
      annotationContext: "ALLOWED MODES / 許容モード",
      annotations: [
        { label: "λ = 1", value: "(1, 0)" },
        { label: "λ = 5", value: "(1, 2)" },
        { label: "λ = 9", value: "(3, 0)" },
        { label: "λ = 13", value: "(2, 3)" },
      ],
      poeticEyebrow: "SEAM / VOICE / TURN",
      poeticLines: ["ひとつの面を声が巡る。"],
      canvasAriaLabel: "メビウス帯を巡る進行波と節線",
    },
    definition: MOBIUS_CHOIR_DEFINITION,
    mathematics: {
      operation: "finite-flat-mobius-dirichlet-traveling-wave-synthesis",
      coefficientSource: "analytic-normalized-eigenvalue-weight",
      fftUsed: false,
      numericalEigenanalysisUsed: false,
      mathematicalTime: {
        mode: "absolute-transport",
        wrapsWithScore: false,
        waveTimeScale: MOBIUS_CHOIR_DEFINITION.waveTimeScale,
      },
      quotient: {
        identification: "(x,0)~(pi-x,pi)",
        boundary: "dirichlet-x-0-pi",
        allowedParity: "m+n-odd",
      },
      rendering: {
        sourceMetric: "flat-quotient",
        displayEmbedding: "non-isometric",
        method: "analytic-fixed-grid-samples",
        interpolation: "piecewise-linear",
      },
      eigenfunctionLatex: "sin(mx)cos(ny)",
      coefficientLatex: "b_mn=C_M/(1+lambda_mn)",
      embeddingLatex: "F(x,y)",
    },
    audio: {
      mode: "sonification",
      baseFrequencyHz: 196,
      initialVolume: 0.35,
      roomSeconds: 2.6,
      sonificationLatex: "f_mn=196sqrt(lambda_mn)",
      score: MOBIUS_CHOIR_SCORE,
      createProgram: createMobiusChoirAudioProgram,
    },
    education: {
      gentleTitle: "ひとつながりの帯を声が巡る。",
      gentleBody: "継ぎ目で向きを変えながら波が進みます。",
      mathematicalTitle: "Flat Möbius quotient",
      mathematicalBody: "解析的な有限固有モード和です。",
      scopeNotice: "表示埋め込みの誘導計量の固有モードではありません。",
      sonificationBody: "固有振動数比を保つソニフィケーションです。",
      poeticLayerBody: "粒子と残光は詩的造形です。",
    },
    async loadScene() {
      return async () => ({
        update() {},
        resize() {},
        setQuality() {},
        dispose() {},
      });
    },
  };
}

describe("pattern mathematical provenance", () => {
  it("rejects a published pattern without three continuous dramaturgy sections", () => {
    const pattern = getResidueBloomPattern();
    const invalid = {
      ...pattern,
      dramaturgy: {
        cycleSeconds: pattern.dramaturgy.cycleSeconds,
        expressiveAxes: ["density", "dynamics", "motion"],
        localMathMapping: true,
        qualityContract: pattern.dramaturgy.qualityContract,
        sections: [
          {
            id: "only",
            startRatio: 0,
            endRatio: 1,
            audioEnergy: 0.5,
            visualEnergy: 0.5,
            motionEnergy: 0.5,
          },
        ],
      },
    } as unknown as ResidueBloomPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/at least three sections/i);
  });

  it("rejects dramaturgy without measurable contrast", () => {
    const pattern = getResidueBloomPattern();
    const section = {
      audioEnergy: 0.5,
      visualEnergy: 0.5,
      motionEnergy: 0.5,
    };
    const invalid = {
      ...pattern,
      dramaturgy: {
        cycleSeconds: pattern.dramaturgy.cycleSeconds,
        expressiveAxes: ["density", "dynamics", "motion"],
        localMathMapping: true,
        qualityContract: pattern.dramaturgy.qualityContract,
        sections: [
          { id: "a", startRatio: 0, endRatio: 0.3, ...section },
          { id: "b", startRatio: 0.3, endRatio: 0.7, ...section },
          { id: "c", startRatio: 0.7, endRatio: 1, ...section },
        ],
      },
    } as unknown as ResidueBloomPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/contrast/i);
  });

  it("rejects dramaturgy whose cycle differs from the audio score", () => {
    const pattern = getResidueBloomPattern();
    const invalid = {
      ...pattern,
      dramaturgy: {
        ...pattern.dramaturgy,
        cycleSeconds: pattern.audio.score.cycleSeconds + 1,
      },
    } satisfies ResidueBloomPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/score cycle/i);
  });

  it("rejects non-finite dramaturgy section boundaries", () => {
    const pattern = getResidueBloomPattern();
    const invalid = {
      ...pattern,
      dramaturgy: {
        ...pattern.dramaturgy,
        sections: pattern.dramaturgy.sections.map((section, index) =>
          index === 0 ? Object.assign({}, section, { startRatio: Number.NaN }) : section,
        ),
      },
    } satisfies ResidueBloomPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/continuously cover/i);
  });

  it("accepts Residue Bloom", () => {
    expect(() => validatePatternDefinition(patternRegistry[0]!)).not.toThrow();
  });

  it("rejects a pattern that omits a required experience quality guarantee", () => {
    const pattern = getResidueBloomPattern();
    const invalid = {
      ...pattern,
      dramaturgy: {
        ...pattern.dramaturgy,
        qualityContract: {
          ...pattern.dramaturgy.qualityContract,
          comparableLoudness: false,
        },
      },
    } as unknown as ResidueBloomPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/experience quality/i);
  });

  it("accepts the Spectral Cathedral preview definition", () => {
    expect(() => validatePatternDefinition(patternPreviewRegistry[1]!)).not.toThrow();
  });

  it("accepts the approved Möbius Choir contract", () => {
    expect(() => validatePatternDefinition(getMobiusChoirPattern())).not.toThrow();
  });

  it("rejects score-wrapped Möbius Choir mathematical time", () => {
    const pattern = getMobiusChoirPattern();
    const invalid = {
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        mathematicalTime: {
          ...pattern.mathematics.mathematicalTime,
          wrapsWithScore: true,
        },
      },
    } as unknown as MobiusChoirPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/mathematical time must not wrap/i);
  });

  it("rejects a Möbius Choir score that references an unknown mode", () => {
    const pattern = getMobiusChoirPattern();
    const invalid = {
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          events: pattern.audio.score.events.map((event, index) =>
            index === 0 ? Object.assign({}, event, { modeIds: [99] }) : event,
          ),
        },
      },
    } as MobiusChoirPatternDefinition;

    expect(() => validatePatternDefinition(invalid)).toThrow(/unknown mode/i);
  });

  it("rejects score-wrapped mathematical time", () => {
    const invalid = mutatePattern((pattern) => ({
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        visualTime: {
          ...pattern.mathematics.visualTime,
          wrapsWithScore: true as never,
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /mathematical time must not wrap with score/i,
    );
  });

  it("rejects a score phasor rate that differs from the chapter rate", () => {
    const invalid = mutatePattern((pattern) => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: {
            ...pattern.audio.score.phasorMapping,
            visualAngularRate: 0.5,
          },
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(/visual angular rate/i);
  });

  it("rejects spectrum and audio reference-frequency disagreement", () => {
    const invalid = mutatePattern((pattern) => ({
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        spectrum: {
          ...pattern.mathematics.spectrum,
          referenceFrequencyHz: 110,
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(/reference frequency/i);
  });

  it("rejects score mapping terms that differ from the formula", () => {
    const pattern = getResidueBloomPattern();
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: {
            ...pattern.audio.score.phasorMapping,
            terms: pattern.audio.score.phasorMapping.terms.map((term, index) =>
              index === 0
                ? {
                    harmonic: term.harmonic,
                    amplitude: term.amplitude + 1,
                    sinePhase: term.sinePhase,
                  }
                : term,
            ),
          },
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(/phasor mapping terms/i);
  });

  it("rejects a phasor amplitude bound that differs from the formula", () => {
    const pattern = getResidueBloomPattern();
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          phasorMapping: {
            ...pattern.audio.score.phasorMapping,
            amplitudeBound: pattern.audio.score.phasorMapping.amplitudeBound + 1,
          },
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(/phasor amplitude bound/i);
  });

  it("rejects phasor results smuggled into repeating events", () => {
    const pattern = patternRegistry[0];
    if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
    const invalid = mutatePattern(() => ({
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          events: pattern.audio.score.events.map((event, index) =>
            index === 0
              ? (Object.assign({}, event, {
                  normalizedPhasorX: 0,
                }) as typeof event)
              : event,
          ),
        },
      },
    }));

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /repeat event contains evaluated phasor data/i,
    );
  });

  it("rejects score-wrapped Spectral Cathedral mathematical time", () => {
    const pattern = patternPreviewRegistry[1];
    if (pattern?.kind !== "spectral-cathedral") {
      throw new Error("Spectral Cathedral preview is missing");
    }
    const invalid = {
      ...pattern,
      mathematics: {
        ...pattern.mathematics,
        mathematicalTime: {
          ...pattern.mathematics.mathematicalTime,
          wrapsWithScore: true,
        },
      },
    } as unknown as typeof pattern;

    expect(() => validatePatternDefinition(invalid)).toThrow(
      /mathematical time must not wrap with score/i,
    );
  });

  it("rejects a Spectral Cathedral score that references an unknown mode", () => {
    const pattern = patternPreviewRegistry[1];
    if (pattern?.kind !== "spectral-cathedral") {
      throw new Error("Spectral Cathedral preview is missing");
    }
    const invalid = {
      ...pattern,
      audio: {
        ...pattern.audio,
        score: {
          ...pattern.audio.score,
          events: pattern.audio.score.events.map((event, index) =>
            index === 0 ? Object.assign({}, event, { modeIds: [1, 99] as const }) : event,
          ),
        },
      },
    } as typeof pattern;

    expect(() => validatePatternDefinition(invalid)).toThrow(/unknown mode/i);
  });
});
