import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { BottomSheet } from './BottomSheet.tsx';

function renderSheet() {
  render(
    <BottomSheet label="Cast">
      <p>Clara</p>
    </BottomSheet>,
  );
}

function handle() {
  return screen.getByRole('button', { name: /cast/ });
}

function swipe(fromY: number, toY: number) {
  fireEvent.pointerDown(handle(), { clientY: fromY });
  fireEvent.pointerUp(handle(), { clientY: toY });
  fireEvent.click(handle());
}

test('starts peeking', () => {
  renderSheet();
  expect(handle()).toHaveAttribute('aria-expanded', 'false');
});

test('shows its content while peeking', () => {
  renderSheet();
  expect(screen.getByText('Clara')).toBeInTheDocument();
});

test('expands on a tap', async () => {
  renderSheet();
  await userEvent.setup().click(handle());
  expect(handle()).toHaveAccessibleName('Collapse cast');
});

test('collapses on a second tap', async () => {
  renderSheet();
  const user = userEvent.setup();
  await user.click(handle());
  await user.click(handle());
  expect(handle()).toHaveAttribute('aria-expanded', 'false');
});

test('expands on a swipe up', () => {
  renderSheet();
  swipe(500, 400);
  expect(handle()).toHaveAttribute('aria-expanded', 'true');
});

test('stays expanded on a second swipe up', () => {
  renderSheet();
  swipe(500, 400);
  swipe(500, 400);
  expect(handle()).toHaveAttribute('aria-expanded', 'true');
});

test('collapses on a swipe down', () => {
  renderSheet();
  swipe(500, 400);
  swipe(400, 500);
  expect(handle()).toHaveAttribute('aria-expanded', 'false');
});

test('takes a short slide as a tap', () => {
  renderSheet();
  swipe(500, 480);
  expect(handle()).toHaveAttribute('aria-expanded', 'true');
});
