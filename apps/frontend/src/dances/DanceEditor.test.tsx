import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { DanceEditor } from './DanceEditor.tsx';

const kitri = {
  id: 'dance-1',
  title: 'Kitri variation',
  showGuides: true,
  createdAt: '2026-10-20T12:00:00.000Z',
};

test('shows the dance title', () => {
  render(<DanceEditor dance={kitri} onBack={() => {}} />);
  expect(screen.getByRole('heading', { name: 'Kitri variation' })).toBeInTheDocument();
});

test('shows the stage', () => {
  render(<DanceEditor dance={kitri} onBack={() => {}} />);
  expect(screen.getByRole('img', { name: /^Stage seen from above/ })).toBeInTheDocument();
});

test('shows the guide lines when the dance has them on', () => {
  render(<DanceEditor dance={kitri} onBack={() => {}} />);
  expect(screen.getByTestId('guides')).toBeInTheDocument();
});

test('hides the guide lines when the dance has them off', () => {
  render(<DanceEditor dance={{ ...kitri, showGuides: false }} onBack={() => {}} />);
  expect(screen.queryByTestId('guides')).not.toBeInTheDocument();
});

test('goes back to the dances', async () => {
  const onBack = vi.fn();
  render(<DanceEditor dance={kitri} onBack={onBack} />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Back to dances' }));
  expect(onBack).toHaveBeenCalled();
});
