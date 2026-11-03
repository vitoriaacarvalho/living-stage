// Three.js cannot read CSS custom properties, so WebGL colors are copied from tokens.css.
export function cssToken(name: `--${string}`): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
