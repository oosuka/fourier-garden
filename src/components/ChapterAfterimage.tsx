import { useEffect, useRef } from "react";
import type { ChapterEcho } from "../experience/chapterEcho";

export interface ChapterAfterimageState {
  echo: ChapterEcho;
  level(): number;
}

export function ChapterAfterimage({ state }: { state: ChapterAfterimageState }) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    element.append(state.echo.image);
    let frame = 0;
    const draw = () => {
      const opacity = state.level();
      element.style.opacity = String(opacity);
      if (opacity > 0) frame = requestAnimationFrame(draw);
      else state.echo.dispose();
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      state.echo.image.remove();
      // The controller owns this captured image across effect remounts.
    };
  }, [state]);
  return (
    <div
      ref={holder}
      className="chapterAfterimage"
      aria-hidden="true"
      style={{
        left: state.echo.left,
        top: state.echo.top,
        width: state.echo.width,
        height: state.echo.height,
      }}
    />
  );
}
