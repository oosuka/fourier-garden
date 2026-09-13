/** A bounded poetic afterimage, captured immediately after the scene submits a frame. */
export interface ChapterEcho {
  image: HTMLCanvasElement;
  left: number;
  top: number;
  width: number;
  height: number;
  dispose(): void;
}

export type ChapterFrameCapture = () => Promise<ChapterEcho | null>;

export function captureChapterEcho(source: HTMLCanvasElement): ChapterEcho | null {
  if (!source.width || !source.height) return null;
  const image = document.createElement("canvas");
  const scale = Math.min(
    1,
    2048 / source.width,
    2048 / source.height,
    Math.sqrt(1_048_576 / (source.width * source.height)),
  );
  image.width = Math.max(1, Math.round(source.width * scale));
  image.height = Math.max(1, Math.round(source.height * scale));
  const dispose = () => {
    image.width = 0;
    image.height = 0;
  };
  try {
    const context = image.getContext("2d", { alpha: false });
    if (!context) {
      dispose();
      return null;
    }
    context.drawImage(source, 0, 0, image.width, image.height);
  } catch {
    dispose();
    return null;
  }
  const bounds = source.getBoundingClientRect();
  const parent = source.parentElement?.getBoundingClientRect();
  return {
    image,
    dispose,
    left: bounds.left - (parent?.left ?? 0),
    top: bounds.top - (parent?.top ?? 0),
    width: bounds.width,
    height: bounds.height,
  };
}
