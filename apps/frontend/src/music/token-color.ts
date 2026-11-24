// A design token as a color a canvas can draw with, since canvas can't read CSS variables.
// alpha fades it, as the design does for the unplayed part of the waveform.
export function tokenColor(name: string, alpha = 1): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(value)?.[1];
  if (!hex) return value;
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16));
  return alpha === 1 ? value : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
