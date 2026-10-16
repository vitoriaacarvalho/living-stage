import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createInvite, fetchInvite } from '../api/invites.ts';
import { InviteTeachers } from './InviteTeachers.tsx';

vi.mock('../api/invites.ts', () => ({ fetchInvite: vi.fn(), createInvite: vi.fn() }));

const invite = { code: 'ABCD2345', expiresAt: '2026-10-23T12:00:00.000Z' };
const newInvite = { code: 'WXYZ6789', expiresAt: '2026-10-24T12:00:00.000Z' };

beforeEach(() => {
  vi.mocked(fetchInvite).mockReset();
  vi.mocked(createInvite).mockReset();
});

function renderInvite(onDone = vi.fn()) {
  render(<InviteTeachers schoolId="school-1" onDone={onDone} />);
  return onDone;
}

describe('with an active code', () => {
  beforeEach(() => {
    vi.mocked(fetchInvite).mockResolvedValue(invite);
  });

  test('shows the code in two halves', async () => {
    renderInvite();
    expect(await screen.findByText('ABCD-2345')).toBeInTheDocument();
  });

  test('shows until when the code is valid', async () => {
    renderInvite();
    expect(await screen.findByText('Valid until Oct 23, 2026')).toBeInTheDocument();
  });

  test('copies the join link', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    renderInvite();
    await user.click(await screen.findByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join/ABCD2345`);
  });

  test('says the link was copied', async () => {
    const user = userEvent.setup();
    renderInvite();
    await user.click(await screen.findByRole('button', { name: 'Copy link' }));
    expect(screen.getByRole('status')).toHaveTextContent('Link copied.');
  });

  test('copies the code as displayed', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    renderInvite();
    await user.click(await screen.findByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('ABCD-2345');
  });

  test('says so when copying fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    renderInvite();
    await user.click(await screen.findByRole('button', { name: 'Copy code' }));
    expect(screen.getByRole('status')).toHaveTextContent('Could not copy.');
  });

  test('replaces the code with a new one', async () => {
    const user = userEvent.setup();
    vi.mocked(createInvite).mockResolvedValue(newInvite);
    renderInvite();
    await user.click(await screen.findByRole('button', { name: 'New code' }));
    expect(await screen.findByText('WXYZ-6789')).toBeInTheDocument();
  });

  test('makes the new code for this school', async () => {
    const user = userEvent.setup();
    vi.mocked(createInvite).mockResolvedValue(newInvite);
    renderInvite();
    await user.click(await screen.findByRole('button', { name: 'New code' }));
    expect(createInvite).toHaveBeenCalledWith('school-1');
  });

  test('says so when a new code cannot be made', async () => {
    const user = userEvent.setup();
    vi.mocked(createInvite).mockRejectedValue(new Error('POST invite answered 500'));
    renderInvite();
    await user.click(await screen.findByRole('button', { name: 'New code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not make a new code.');
  });
});

describe('without an active code', () => {
  beforeEach(() => {
    vi.mocked(fetchInvite).mockResolvedValue(null);
  });

  test('offers to make a code', async () => {
    renderInvite();
    expect(
      await screen.findByRole('button', { name: 'Make an invitation code' }),
    ).toBeInTheDocument();
  });

  test('shows the code once it is made', async () => {
    const user = userEvent.setup();
    vi.mocked(createInvite).mockResolvedValue(invite);
    renderInvite();
    await user.click(await screen.findByRole('button', { name: 'Make an invitation code' }));
    expect(await screen.findByText('ABCD-2345')).toBeInTheDocument();
  });
});

test('says so when the code cannot be loaded', async () => {
  vi.mocked(fetchInvite).mockRejectedValue(new Error('GET invite answered 500'));
  renderInvite();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the invitation code.');
});

test('goes back when done', async () => {
  const user = userEvent.setup();
  vi.mocked(fetchInvite).mockResolvedValue(invite);
  const onDone = renderInvite();
  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(onDone).toHaveBeenCalled();
});
