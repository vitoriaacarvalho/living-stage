import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Icon } from './Icon.tsx';

test('is hidden from assistive technology', () => {
  const { container } = render(<Icon name="eye" />);
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

test('draws the named icon', () => {
  const { container } = render(<Icon name="eye" />);
  expect(container.querySelector('svg circle')).toHaveAttribute('r', '3');
});

test('takes its color from the surrounding text', () => {
  const { container } = render(<Icon name="eye" />);
  expect(container.querySelector('svg')).toHaveAttribute('stroke', 'currentColor');
});
