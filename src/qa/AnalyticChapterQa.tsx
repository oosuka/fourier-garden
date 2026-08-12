import "@fontsource/inter/400.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/noto-serif-jp/400.css";
import "katex/dist/katex.min.css";
import "../styles.css";
import "../styles/responsive.css";

import { useMemo, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import { CanvasStage } from "../components/CanvasStage";
import { Transport } from "../core/transport";
import { patternPreviewRegistry } from "../patterns/registry";

function AnalyticChapterQa() {
  const id = document.body.dataset.pattern ?? "prime-constellation";
  const pattern = patternPreviewRegistry.find((candidate) => candidate.id === id);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const transport = useMemo(() => {
    const instance = new Transport();
    const requested = Number(new URLSearchParams(window.location.search).get("time"));
    instance.reset(Number.isFinite(requested) && requested >= 0 ? requested : 0);
    return instance;
  }, []);
  if (!pattern)
    return (
      <main className="app">
        <div className="sceneStatus">Unknown chapter: {id}</div>
      </main>
    );
  return (
    <main className={`app app--${pattern.kind}`}>
      <CanvasStage
        pattern={pattern}
        transport={transport}
        playing={false}
        onStatus={setStatus}
        onError={setError}
      />
      <div className="edgeVignette" aria-hidden="true" />
      <header className="brandBlock interfaceLayer">
        <h1>FOURIER GARDEN</h1>
        <p>{pattern.presentation.observatoryLabel}</p>
        <small>QA · {pattern.title.ja}</small>
      </header>
      <section className="formulaBlock interfaceLayer">
        <span className="eyebrow">FIXED TRANSPORT FRAME</span>
        <p>{pattern.presentation.formulaSummary}</p>
      </section>
      {status !== "ready" && (
        <div className="sceneStatus">
          {status === "error" ? error : "INITIALIZING CHAPTER FIELD"}
        </div>
      )}
    </main>
  );
}

const rootElement = document.getElementById("analytic-qa-root");
if (!rootElement) throw new Error("Analytic QA root is missing");
const analyticQaRoot =
  (import.meta.hot?.data.analyticQaRoot as Root | undefined) ?? createRoot(rootElement);
if (import.meta.hot) import.meta.hot.data.analyticQaRoot = analyticQaRoot;
analyticQaRoot.render(<AnalyticChapterQa />);
