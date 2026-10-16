import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { joinSchool, previewInvite } from '../api/invites.ts';
import { JoinWithCode } from './JoinWithCode.tsx';

vi.mock('../api/invites.ts', () => ({ previewInvite: vi.fn(), joinSchool: vi.fn() }));

const school = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };

beforeEach(() => {
  vi.mocked(previewInvite).mockReset();
  vi.mocked(joinSchool).mockReset();
});

async function enterCode(code: string, onJoined = vi.fn()) {
  const user = userEvent.setup();
  render(<JoinWithCode onJoined={onJoined} />);
  await user.type(screen.getByLabelText('Invitation code'), code);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  return { user, onJoined };
}

describe('entering a code', () => {
  test('looks the code up as typed, in any case and with a dash', async () => {
    vi.mocked(previewInvite).mockResolvedValue('Escola Ana');
    await enterCode('abcd-2345');
    expect(previewInvite).toHaveBeenCalledWith('ABCD2345');
  });

  test('shows the school name before joining', async () => {
    vi.mocked(previewInvite).mockResolvedValue('Escola Ana');
    await enterCode('ABCD2345');
    expect(screen.getByRole('heading', { name: 'Join Escola Ana' })).toBeInTheDocument();
  });

  test('asks to check a malformed code', async () => {
    await enterCode('ABC');
    expect(screen.getByRole('alert')).toHaveTextContent('Check the code.');
  });

  test('does not look up a malformed code', async () => {
    await enterCode('ABC');
    expect(previewInvite).not.toHaveBeenCalled();
  });

  test('says so when the code is unknown or expired', async () => {
    vi.mocked(previewInvite).mockResolvedValue(null);
    await enterCode('ABCD2345');
    expect(screen.getByRole('alert')).toHaveTextContent('or it has expired');
  });

  test('says so when the code cannot be checked', async () => {
    vi.mocked(previewInvite).mockRejectedValue(new Error('GET /api/invites answered 500'));
    await enterCode('ABCD2345');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not check the code.');
  });

  test('lets the user try another code after a miss', async () => {
    vi.mocked(previewInvite).mockResolvedValue(null);
    await enterCode('ABCD2345');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});

describe('confirming', () => {
  beforeEach(() => {
    vi.mocked(previewInvite).mockResolvedValue('Escola Ana');
  });

  test('joins with the code', async () => {
    vi.mocked(joinSchool).mockResolvedValue(school);
    const { user } = await enterCode('ABCD2345');
    await user.click(screen.getByRole('button', { name: 'Join school' }));
    expect(joinSchool).toHaveBeenCalledWith('ABCD2345');
  });

  test('hands the joined school on', async () => {
    vi.mocked(joinSchool).mockResolvedValue(school);
    const { user, onJoined } = await enterCode('ABCD2345');
    await user.click(screen.getByRole('button', { name: 'Join school' }));
    expect(onJoined).toHaveBeenCalledWith(school);
  });

  test('says so when joining fails', async () => {
    vi.mocked(joinSchool).mockRejectedValue(new Error('POST answered 404'));
    const { user } = await enterCode('ABCD2345');
    await user.click(screen.getByRole('button', { name: 'Join school' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not join the school.');
  });

  test('goes back to the code to use another one', async () => {
    const { user } = await enterCode('ABCD2345');
    await user.click(screen.getByRole('button', { name: 'Use another code' }));
    expect(screen.getByLabelText('Invitation code')).toBeInTheDocument();
  });
});
