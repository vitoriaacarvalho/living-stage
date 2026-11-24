import { tokenColor } from './token-color.ts';

// The flag of a figure marker. It is drawn inside the waveform's own shadow DOM, where
// the app's stylesheets don't reach, so it is styled here from the design tokens.
export function markerLabel(text: string, active: boolean): HTMLElement {
  const label = document.createElement('span');
  label.textContent = text;
  Object.assign(label.style, {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '6px',
    border: `1px solid ${tokenColor(active ? '--primary' : '--ink-muted')}`,
    background: tokenColor(active ? '--primary' : '--surface'),
    color: tokenColor(active ? '--on-primary' : '--ink'),
    font: '600 11px/16px "Instrument Sans", system-ui, sans-serif',
    whiteSpace: 'nowrap',
    cursor: 'grab',
  });
  return label;
}
