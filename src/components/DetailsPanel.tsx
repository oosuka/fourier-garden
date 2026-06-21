import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { renderToString } from "katex";

import type { AudioEngine } from "../audio/AudioEngine";
import { ResidueBloomDetails } from "../patterns/residue-bloom/details/ResidueBloomDetails";
import { SpectralCathedralDetails } from "../patterns/spectral-cathedral/details/SpectralCathedralDetails";
import type { PatternDefinition } from "../patterns/types";
import { WaveformCanvas } from "./DataCanvas";
import { MobiusChoirDetails } from "./MobiusChoirDetails";

interface DetailsPanelProps {
  open: boolean;
  pattern: PatternDefinition;
  audio: AudioEngine;
  onClose: () => void;
}

export function DetailsPanel({ open, pattern, audio, onClose }: DetailsPanelProps) {
  const [tab, setTab] = useState<"gentle" | "mathematical">("gentle");
  const sonification = useMemo(
    () =>
      renderToString(pattern.audio.sonificationLatex, {
        throwOnError: false,
        displayMode: true,
      }),
    [pattern.audio.sonificationLatex],
  );

  return (
    <aside
      className={`detailsPanel ${open ? "detailsPanel--open" : ""}`}
      aria-hidden={!open}
      inert={!open}
    >
      <header className="detailsHeader">
        <div>
          <span className="eyebrow">OBSERVATION NOTES</span>
          <h2>{pattern.title.ja}</h2>
        </div>
        <button className="iconButton" onClick={onClose} aria-label="詳細を閉じる">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="detailsTabs" role="tablist" aria-label="解説の種類">
        <button
          className={tab === "gentle" ? "isActive" : ""}
          onClick={() => setTab("gentle")}
          role="tab"
          aria-selected={tab === "gentle"}
        >
          やさしい説明
        </button>
        <button
          className={tab === "mathematical" ? "isActive" : ""}
          onClick={() => setTab("mathematical")}
          role="tab"
          aria-selected={tab === "mathematical"}
        >
          数学の詳細
        </button>
      </div>

      <div className="detailsScroll">
        {tab === "gentle" ? (
          <section className="gentleSection">
            <p className="poeticLead">{pattern.education.gentleTitle}</p>
            <p>{pattern.education.gentleBody}</p>
            <div className="observationRule" />
            <p className="quietNote">{pattern.education.poeticLayerBody}</p>
            <p className="scopeNotice">{pattern.education.scopeNotice}</p>
          </section>
        ) : pattern.kind === "residue-bloom" ? (
          <ResidueBloomDetails pattern={pattern} />
        ) : pattern.kind === "spectral-cathedral" ? (
          <SpectralCathedralDetails pattern={pattern} />
        ) : (
          <MobiusChoirDetails pattern={pattern} />
        )}

        <section className="dataSection">
          <div className="sectionLabel">
            <span>AUDIO OUTPUT</span>
            <span>処理後の音響波形</span>
          </div>
          <WaveformCanvas audio={audio} />
        </section>

        <section className="dataSection sonificationSection">
          <div className="sectionLabel">
            <span>SONIFICATION</span>
            <span>音楽的変換</span>
          </div>
          <div
            className="mathIdentity mathIdentity--compact"
            dangerouslySetInnerHTML={{ __html: sonification }}
          />
          <p>{pattern.education.sonificationBody}</p>
        </section>
      </div>
    </aside>
  );
}
