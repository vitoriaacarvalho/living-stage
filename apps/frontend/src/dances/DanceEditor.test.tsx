import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { updateDance } from '../api/dances.ts';
import { DanceEditor } from './DanceEditor.tsx';

vi.mock('../api/dances.ts', () => ({ updateDance: vi.fn() }));
vi.mock('../api/cast.ts', () => ({ fetchCast: vi.fn(() => Promise.resolve([])) }));

const kitri = {
  id: 'dance-1',
  title: 'Kitri variation',
  showGuides: true,
  createdAt: '2026-10-20T12:00:00.000Z',
};

beforeEach(() => {
  vi.mocked(updateDance)
    .mockReset()
    .mockImplementation(async (_schoolId, _danceId, update) => ({ ...kitri, ...update }));
});

function openKitri(dance = kitri) {
  render(<DanceEditor schoolId="school-1" dance={dance} onBack={() => {}} />);
}

function guidesToggle() {
  return screen.getByRole('button', { name: 'Guides' });
}

test('shows the dance title', () => {
  openKitri();
  expect(screen.getByRole('heading', { name: 'Kitri variation' })).toBeInTheDocument();
});

test('shows the stage', () => {
  openKitri();
  expect(screen.getByRole('img', { name: /^Stage seen from above/ })).toBeInTheDocument();
});

test('shows the guide lines when the dance has them on', () => {
  openKitri();
  expect(screen.getByTestId('guides')).toBeInTheDocument();
});

test('hides the guide lines when the dance has them off', () => {
  openKitri({ ...kitri, showGuides: false });
  expect(screen.queryByTestId('guides')).not.toBeInTheDocument();
});

test('marks the guides toggle as pressed when the guide lines are on', () => {
  openKitri();
  expect(guidesToggle()).toHaveAttribute('aria-pressed', 'true');
});

test('hides the guide lines when the toggle is tapped', async () => {
  openKitri();
  await userEvent.setup().click(guidesToggle());
  expect(screen.queryByTestId('guides')).not.toBeInTheDocument();
});

test('shows the guide lines again when the toggle is tapped twice', async () => {
  openKitri();
  const user = userEvent.setup();
  await user.click(guidesToggle());
  await user.click(guidesToggle());
  expect(screen.getByTestId('guides')).toBeInTheDocument();
});

test('saves the guide lines choice on the dance', async () => {
  openKitri();
  await userEvent.setup().click(guidesToggle());
  expect(updateDance).toHaveBeenCalledWith('school-1', 'dance-1', { showGuides: false });
});

test('puts the guide lines back when saving fails', async () => {
  vi.mocked(updateDance).mockRejectedValue(new Error('PATCH dance answered 500'));
  openKitri();
  await userEvent.setup().click(guidesToggle());
  expect(await screen.findByTestId('guides')).toBeInTheDocument();
});

test('goes back to the dances', async () => {
  const onBack = vi.fn();
  render(<DanceEditor schoolId="school-1" dance={kitri} onBack={onBack} />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Back to dances' }));
  expect(onBack).toHaveBeenCalled();
});
