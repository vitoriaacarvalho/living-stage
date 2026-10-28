import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Stage } from './Stage.tsx';

test('is named as the stage seen from above', () => {
  render(<Stage />);
  expect(
    screen.getByRole('img', { name: 'Stage seen from above, audience at the bottom' }),
  ).toBeInTheDocument();
});

test('draws the floor 12 metres across', () => {
  const { container } = render(<Stage />);
  expect(container.querySelector('rect')).toHaveAttribute('width', '12');
});

test('draws the floor 8 metres deep', () => {
  const { container } = render(<Stage />);
  expect(container.querySelector('rect')).toHaveAttribute('height', '8');
});

test('frames the floor with wings on both sides and upstage', () => {
  const { container } = render(<Stage />);
  expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-1.5 -1 15 9');
});

test('labels a wing on each side', () => {
  render(<Stage />);
  expect(screen.getAllByText('Wing')).toHaveLength(2);
});

test('labels the upstage wing', () => {
  render(<Stage />);
  expect(screen.getByText('Upstage')).toBeInTheDocument();
});

test('labels the audience', () => {
  render(<Stage />);
  expect(screen.getByText('Audience')).toBeInTheDocument();
});
