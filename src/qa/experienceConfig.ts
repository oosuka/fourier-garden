export function getExperienceQaConfig(
  search: string,
  chapterIds: readonly string[],
): { patternIndex: number; timeSeconds: number } | null {
  const query = new URLSearchParams(search);
  if (query.get("qa") !== "1") return null;
  const time = Number(query.get("time"));
  return {
    patternIndex: Math.max(0, chapterIds.indexOf(query.get("chapter") ?? "")),
    timeSeconds: Number.isFinite(time) && time >= 0 && time <= 86_400 ? time : 0,
  };
}
