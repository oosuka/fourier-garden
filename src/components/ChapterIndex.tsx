import { ArrowUpRight, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import type { PatternDefinition } from "../patterns/contracts";

export function ChapterIndex({
  patterns,
  currentId,
  onSelect,
  onClose,
}: {
  patterns: readonly PatternDefinition[];
  currentId: string;
  onSelect(index: number): void;
  onClose(): void;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  const onIndexKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(
      panel.current!.querySelectorAll<HTMLButtonElement>("[data-chapter]"),
    );
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : Math.max(
              0,
              Math.min(buttons.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)),
            );
    event.preventDefault();
    buttons[next]?.focus();
  };
  return (
    <nav
      id="chapter-index"
      className="chapterIndex sidePanel"
      aria-label="十の数理風景"
      ref={panel}
    >
      <header className="detailsHeader">
        <div>
          <span className="eyebrow">TEN STUDIES</span>
          <h2>庭をめぐる</h2>
        </div>
        <button
          className="iconButton"
          onClick={onClose}
          aria-label="章の一覧を閉じる"
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      </header>
      <p className="indexIntroduction">気になる形から、はじめてもいい。</p>
      <ol className="chapterIndexList">
        {patterns.map((pattern, index) => (
          <li key={pattern.id}>
            <button
              type="button"
              onKeyDown={onIndexKeyDown}
              data-chapter={pattern.id}
              aria-current={pattern.id === currentId ? "true" : undefined}
              onClick={() => onSelect(index)}
            >
              <span className="indexNumber">{String(pattern.order).padStart(2, "0")}</span>
              <span>
                <strong>{pattern.title.en}</strong>
                <small>{pattern.observation.subject}</small>
              </span>
              <ArrowUpRight aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <div className="indexKeys">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> 選ぶ
        </span>
        <span>
          <kbd>Enter</kbd> 移動
        </span>
        <span>
          <kbd>Esc</kbd> 閉じる
        </span>
      </div>
    </nav>
  );
}
