import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { joinSchool, previewInvite } from '../api/invites.ts';
import { JoinFromLink } from './JoinFromLink.tsx';

vi.mock('../api/invites.ts', () => ({ previewInvite: vi.fn(), joinSchool: vi.fn() }));

const school = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };

beforeEach(() => {
  vi.mocked(previewInvite).mockReset();
  vi.mocked(joinSchool).mockReset();
});

function renderLink(code: string) {
  const handlers = { onJoined: vi.fn(), onDismiss: vi.fn() };
  render(<JoinFromLink code={code} {...handlers} />);
  return handlers;
}

test('shows the school name before joining', async () => {
  vi.mocked(previewInvite).mockResolvedValue('Escola Ana');
  renderLink('ABCD2345');
  expect(await screen.findByRole('heading', { name: 'Join Escola Ana' })).toBeInTheDocument();
});

test('hands the joined school on', async () => {
  const user = userEvent.setup();
  vi.mocked(previewInvite).mockResolvedValue('Escola Ana');
  vi.mocked(joinSchool).mockResolvedValue(school);
  const { onJoined } = renderLink('ABCD2345');
  await user.click(await screen.findByRole('button', { name: 'Join school' }));
  expect(onJoined).toHaveBeenCalledWith(school);
});

test('can be dismissed without joining', async () => {
  const user = userEvent.setup();
  vi.mocked(previewInvite).mockResolvedValue('Escola Ana');
  const { onDismiss } = renderLink('ABCD2345');
  await user.click(await screen.findByRole('button', { name: 'Not now' }));
  expect(onDismiss).toHaveBeenCalled();
});

test('says so when the code is unknown or expired', async () => {
  vi.mocked(previewInvite).mockResolvedValue(null);
  renderLink('ABCD2345');
  expect(await screen.findByRole('alert')).toHaveTextContent('or it has expired');
});

test('treats a malformed code as unknown', async () => {
  renderLink('nope');
  expect(await screen.findByRole('alert')).toHaveTextContent('or it has expired');
});

test('does not look up a malformed code', () => {
  renderLink('nope');
  expect(previewInvite).not.toHaveBeenCalled();
});

test('says so when the invitation cannot be checked', async () => {
  vi.mocked(previewInvite).mockRejectedValue(new Error('GET /api/invites answered 500'));
  renderLink('ABCD2345');
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not check the invitation.');
});
