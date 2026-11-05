// Minutes and seconds, as in 00:04 / 00:12; a part second counts as not yet reached.
export function clockTime(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}
