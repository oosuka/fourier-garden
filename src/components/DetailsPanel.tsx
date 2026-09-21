import { ArrowUpRight, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "katex";
import type { AudioEngine } from "../audio/AudioEngine";
import type { PatternDefinition } from "../patterns/contracts";
import { WaveformCanvas } from "./DataCanvas";
import { MathematicalStudy } from "./MathematicalStudy";

const EMPTY_PATTERNS: readonly PatternDefinition[] = [];

interface DetailsPanelProps {
  open: boolean;
  pattern: PatternDefinition;
  audio: AudioEngine;
  onClose: () => void;
  patterns?: readonly PatternDefinition[];
  onSelectChapter?: (index: number) => void;
}
export function DetailsPanel({
  open,
  pattern,
  audio,
  onClose,
  patterns = EMPTY_PATTERNS,
  onSelectChapter,
}: DetailsPanelProps) {
  const [tab, setTab] = useState<"gentle" | "mathematical">("gentle");
  const [audioExpanded, setAudioExpanded] = useState(false);
  const [studyValues, setStudyValues] = useState<Readonly<Record<string, number>>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const MathematicalDetails = pattern.MathematicalDetails;
  const sonification = useMemo(
    () =>
      renderToString(pattern.audio.sonificationLatex, { throwOnError: false, displayMode: true }),
    [pattern.audio.sonificationLatex],
  );
  const scrollResetKey = `${pattern.id}:${tab}`;
  useLayoutEffect(() => {
    if (scrollResetKey && content.current) content.current.scrollTop = 0;
  }, [scrollResetKey]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    heading.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <aside
      id="observation-notes"
      className={`detailsPanel sidePanel ${open ? "detailsPanel--open" : ""}`}
      aria-label="観察ノート"
      aria-hidden={!open}
      inert={!open}
    >
      <header className="detailsHeader">
        <div>
          <span className="eyebrow">
            OBSERVATION NOTES · {String(pattern.order).padStart(2, "0")}
          </span>
          <h2 ref={heading} tabIndex={-1}>
            {pattern.title.ja}
          </h2>
        </div>
        <button className="iconButton" type="button" onClick={onClose} aria-label="詳細を閉じる">
          <X aria-hidden="true" />
        </button>
      </header>
      <div
        className="detailsTabs"
        role="tablist"
        tabIndex={-1}
        aria-label="解説の種類"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? "gentle"
              : event.key === "End"
                ? "mathematical"
                : tab === "gentle"
                  ? "mathematical"
                  : "gentle";
          setTab(next);
          document.getElementById(`notes-tab-${next}`)?.focus();
        }}
      >
        {(["gentle", "mathematical"] as const).map((value) => (
          <button
            key={value}
            id={`notes-tab-${value}`}
            className={tab === value ? "isActive" : ""}
            type="button"
            onClick={() => setTab(value)}
            role="tab"
            aria-selected={tab === value}
            aria-controls="notes-content"
            tabIndex={tab === value ? 0 : -1}
          >
            {value === "gentle" ? "やさしい説明" : "数学の詳細"}
          </button>
        ))}
      </div>
      <div
        ref={content}
        className="detailsScroll"
        id="notes-content"
        role="tabpanel"
        aria-labelledby={`notes-tab-${tab}`}
        tabIndex={0}
      >
        {open && (
          <>
            {tab === "gentle" ? (
              <>
                <section className="gentleSection">
                  <p className="poeticLead">{pattern.observation.invitation}</p>
                  <p>{pattern.education.gentleBody}</p>
                </section>
                <MathematicalStudy
                  key={pattern.id}
                  definition={pattern.study}
                  value={studyValues[pattern.id] ?? pattern.study.initial}
                  onChange={(value) =>
                    setStudyValues((previous) => ({ ...previous, [pattern.id]: value }))
                  }
                />
                <section className="observationQuestion">
                  <span className="eyebrow">LOOK CLOSER</span>
                  <h3>{pattern.observation.question}</h3>
                  <p>{pattern.observation.answer}</p>
                </section>
                <section className="mappingNote">
                  <span className="eyebrow">ONE CAUSE, TWO SENSES</span>
                  <h3>今の音は、どこで光る？</h3>
                  <p>{pattern.observation.mapping}</p>
                </section>
                <details className="deeperNote">
                  <summary>もう少し深く</summary>
                  <p>{pattern.observation.background}</p>
                  <p className="quietNote">{pattern.education.scopeNotice}</p>
                </details>
              </>
            ) : (
              <>
                <MathematicalDetails />
                <section className="mappingNote">
                  <h3>観察の先に</h3>
                  <p>{pattern.observation.background}</p>
                </section>
              </>
            )}
            <details
              className="deeperNote"
              onToggle={(event) => setAudioExpanded(event.currentTarget.open)}
            >
              <summary>音への写し方と出力波形</summary>
              {audioExpanded && (
                <>
                  <p>{pattern.education.sonificationBody}</p>
                  <div
                    className="mathIdentity"
                    dangerouslySetInnerHTML={{ __html: sonification }}
                  />
                  <div className="sectionLabel">
                    <span>AUDIO OUTPUT</span>
                    <span>処理後の音響波形</span>
                  </div>
                  <WaveformCanvas audio={audio} />
                  <p className="quietNote">
                    周囲の光は詩的な造形です。波形・係数の数値とは区別しています。
                  </p>
                </>
              )}
            </details>
            <section className="relatedStudies">
              <span className="eyebrow">CONNECTED STUDIES</span>
              <h3>この問いを、次の風景へ</h3>
              {pattern.observation.related.map((relation) => {
                const index = patterns.findIndex((candidate) => candidate.id === relation.id);
                const related = patterns[index];
                return related && onSelectChapter ? (
                  <button key={relation.id} type="button" onClick={() => onSelectChapter(index)}>
                    <span>
                      <strong>
                        {String(related.order).padStart(2, "0")} · {related.title.en}
                      </strong>
                      <small>{relation.reason}</small>
                    </span>
                    <ArrowUpRight aria-hidden="true" />
                  </button>
                ) : null;
              })}
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
