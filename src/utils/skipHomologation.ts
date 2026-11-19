export const MIN_SKIP_REASON_WORDS = 30;
export const countWords = (text: string): number => {
  const t = (text ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
};
