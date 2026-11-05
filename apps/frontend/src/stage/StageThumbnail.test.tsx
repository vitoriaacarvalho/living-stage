import { STAGE_DEPTH_M, STAGE_WIDTH_M } from '@living-stage/shared';
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { StageThumbnail } from './StageThumbnail.tsx';

const dot = () => screen.getByTestId('thumbnail-dot');

test('is hidden from assistive technology', () => {
  const { container } = render(<StageThumbnail spots={[]} />);
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

test('places a dancer in metres on the floor', () => {
  render(<StageThumbnail spots={[{ x: 0.25, y: 0.5, color: 3, open: false }]} />);
  expect([dot().getAttribute('cx'), dot().getAttribute('cy')]).toEqual([
    String(0.25 * STAGE_WIDTH_M),
    String(0.5 * STAGE_DEPTH_M),
  ]);
});

test('fills a dancer with her color', () => {
  render(<StageThumbnail spots={[{ x: 0.5, y: 0.5, color: 3, open: false }]} />);
  expect(dot().style.fill).toBe('var(--dancer-3)');
});

test('draws an open spot as a ring with no fill', () => {
  render(<StageThumbnail spots={[{ x: 0.5, y: 0.5, color: null, open: true }]} />);
  expect(dot().getAttribute('class')).toMatch(/open/);
});

test('places a dancer waiting in the wing outside the floor', () => {
  render(<StageThumbnail spots={[{ x: -0.0625, y: 0.05, color: 3, open: false }]} />);
  expect(Number(dot().getAttribute('cx'))).toBeLessThan(0);
});
