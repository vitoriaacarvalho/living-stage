// A moment in the song typed as m:ss, from 0:00; null when it isn't one.
export function parseMoment(text: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(text.trim());
  if (!match) return null;
  return (Number(match[1]) * 60 + Number(match[2])) * 1000;
}
