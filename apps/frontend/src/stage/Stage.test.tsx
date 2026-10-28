import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Stage } from './Stage.tsx';

test('is named as the stage seen from above', () => {
  render(<Stage showGuides />);
  expect(
    screen.getByRole('img', { name: 'Stage seen from above, audience at the bottom' }),
  ).toBeInTheDocument();
});

test('draws the floor 12 metres across', () => {
  const { container } = render(<Stage showGuides />);
  expect(container.querySelector('rect')).toHaveAttribute('width', '12');
});

test('draws the floor 8 metres deep', () => {
  const { container } = render(<Stage showGuides />);
  expect(container.querySelector('rect')).toHaveAttribute('height', '8');
});

test('frames the floor with wings on both sides and upstage', () => {
  const { container } = render(<Stage showGuides />);
  expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-1.5 -1 15 9');
});

test('labels a wing on each side', () => {
  render(<Stage showGuides />);
  expect(screen.getAllByText('Wing')).toHaveLength(2);
});

test('labels the upstage wing', () => {
  render(<Stage showGuides />);
  expect(screen.getByText('Upstage')).toBeInTheDocument();
});

test('labels the audience', () => {
  render(<Stage showGuides />);
  expect(screen.getByText('Audience')).toBeInTheDocument();
});

test('draws the center and quarter lines across and down the floor', () => {
  render(<Stage showGuides />);
  expect(screen.getByTestId('guides').querySelectorAll('line')).toHaveLength(6);
});

test('draws the center lines through the middle of the floor', () => {
  render(<Stage showGuides />);
  const lines = [...screen.getByTestId('guides').querySelectorAll('line')];
  const center = lines.filter(
    (line) => line.getAttribute('x1') === '6' || line.getAttribute('y1') === '4',
  );
  expect(center).toHaveLength(2);
});

test('hides the guide lines when the dance turns them off', () => {
  render(<Stage showGuides={false} />);
  expect(screen.queryByTestId('guides')).not.toBeInTheDocument();
});
