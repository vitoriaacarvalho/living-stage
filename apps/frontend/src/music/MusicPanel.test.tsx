import type { AudioTrack } from '@living-stage/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { MusicPanel, type SongChoice } from './MusicPanel.tsx';
import { UnreadableSongError, type SongLibrary, type SongsState } from './useSongs.ts';

const kitri: AudioTrack = { id: 'song-1', name: 'Kitri variation', durationMs: 220_000, url: 'u1' };
const waltz: AudioTrack = { id: 'song-2', name: 'Waltz', durationMs: 95_000, url: 'u2' };

type Setup = {
  state?: SongsState;
  audioId?: string | null;
  upload?: SongLibrary['upload'];
  choose?: SongChoice['choose'];
};

function renderPanel({
  state = { status: 'ready', songs: [kitri, waltz] },
  audioId = null,
  upload = vi.fn().mockResolvedValue(waltz),
  choose = vi.fn().mockResolvedValue(undefined),
}: Setup = {}) {
  render(
    <MusicPanel library={{ state, upload }} choice={{ audioId, choose }} onClose={() => {}} />,
  );
  return { upload, choose };
}

function fileInput() {
  return document.querySelector<HTMLInputElement>('input[type="file"]')!;
}

const mp3 = () => new File([new Uint8Array(1000)], 'Waltz.mp3', { type: 'audio/mpeg' });

test('says when the dance has no music', () => {
  renderPanel();
  expect(screen.getByText('This dance has no music yet.')).toBeInTheDocument();
});

test('shows the dance song with its length', () => {
  renderPanel({ audioId: 'song-1' });
  expect(screen.getAllByText('3:40')).toHaveLength(2);
});

test('lists the school songs', () => {
  renderPanel();
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'Kitri variation3:40',
    'Waltz1:35',
  ]);
});

test('marks the dance song in the list', () => {
  renderPanel({ audioId: 'song-1' });
  expect(screen.getByRole('button', { name: /Kitri variation/ })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('chooses a song from the list', async () => {
  const { choose } = renderPanel();
  await userEvent.setup().click(screen.getByRole('button', { name: /Waltz/ }));
  expect(choose).toHaveBeenCalledWith('song-2');
});

test('takes the song away', async () => {
  const { choose } = renderPanel({ audioId: 'song-1' });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Remove' }));
  expect(choose).toHaveBeenCalledWith(null);
});

test('says when the music could not change', async () => {
  renderPanel({ choose: vi.fn().mockRejectedValue(new Error('offline')) });
  await userEvent.setup().click(screen.getByRole('button', { name: /Waltz/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not change the music');
});

test('says while the songs load', () => {
  renderPanel({ state: { status: 'loading' } });
  expect(screen.getByText('Loading songs…')).toBeInTheDocument();
});

test('invites the first upload when the school has no songs', () => {
  renderPanel({ state: { status: 'ready', songs: [] } });
  expect(screen.getByText('No songs yet. Upload the first one.')).toBeInTheDocument();
});

test('uploads a picked song', async () => {
  const { upload } = renderPanel();
  const file = mp3();
  await userEvent.setup().upload(fileInput(), file);
  expect(upload).toHaveBeenCalledWith(file, expect.any(Function));
});

test('chooses the uploaded song for the dance', async () => {
  const { choose } = renderPanel();
  await userEvent.setup().upload(fileInput(), mp3());
  await waitFor(() => expect(choose).toHaveBeenCalledWith('song-2'));
});

test('shows how much of the song is sent', async () => {
  let report: (sent: number) => void = () => {};
  renderPanel({
    upload: (_file, onProgress) => {
      report = onProgress;
      return new Promise(() => {});
    },
  });
  await userEvent.setup().upload(fileInput(), mp3());
  report(0.42);
  expect(await screen.findByRole('status')).toHaveTextContent('Uploading 42%');
});

test('sends nothing for a file that is not a song', async () => {
  const { upload } = renderPanel();
  const pdf = new File(['x'], 'notes.pdf', { type: 'application/pdf' });
  await userEvent.setup({ applyAccept: false }).upload(fileInput(), pdf);
  expect(upload).not.toHaveBeenCalled();
});

test('says when a file is not a song', async () => {
  renderPanel();
  const pdf = new File(['x'], 'notes.pdf', { type: 'application/pdf' });
  await userEvent.setup({ applyAccept: false }).upload(fileInput(), pdf);
  expect(screen.getByRole('alert')).toHaveTextContent('MP3, M4A, AAC or WAV');
});

test('says when the song could not be read', async () => {
  renderPanel({ upload: vi.fn().mockRejectedValue(new UnreadableSongError()) });
  await userEvent.setup().upload(fileInput(), mp3());
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not read that song');
});

test('says when the upload failed', async () => {
  renderPanel({ upload: vi.fn().mockRejectedValue(new Error('offline')) });
  await userEvent.setup().upload(fileInput(), mp3());
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not upload the song');
});
