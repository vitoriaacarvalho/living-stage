import { formatDuration } from '@living-stage/shared';
import { useRef, useState, type ChangeEvent } from 'react';
import panelStyles from '../cast/CastList.module.css';
import formStyles from '../cast/CastMemberForm.module.css';
import { Button } from '../ui/Button.tsx';
import uiFormStyles from '../ui/Form.module.css';
import styles from './MusicPanel.module.css';
import { SONG_FILE_ACCEPT, songFileProblem } from './song-file.ts';
import { UnreadableSongError, type SongLibrary } from './useSongs.ts';

export type SongChoice = {
  audioId: string | null;
  choose: (audioId: string | null) => Promise<void>;
};

type MusicPanelProps = { library: SongLibrary; choice: SongChoice; onClose: () => void };

export function MusicPanel({ library, choice, onClose }: MusicPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state } = library;
  const songs = state.status === 'ready' ? state.songs : [];
  const current = songs.find(({ id }) => id === choice.audioId) ?? null;
  const busy = pending || progress !== null;

  async function choose(audioId: string | null) {
    setError(null);
    setPending(true);
    try {
      await choice.choose(audioId);
    } catch {
      setError('Could not change the music. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = songFileProblem(file);
    setError(problem);
    if (problem) return;
    setProgress(0);
    try {
      const song = await library.upload(file, setProgress);
      setProgress(null);
      await choose(song.id);
    } catch (failure) {
      setProgress(null);
      setError(
        failure instanceof UnreadableSongError
          ? 'Could not read that song. Try another file.'
          : 'Could not upload the song. Try again.',
      );
    }
  }

  return (
    <aside className={panelStyles.panel} aria-label="Music">
      <div className={formStyles.form}>
        <div className={formStyles.head}>
          <h2 className={formStyles.title}>Music</h2>
          <Button variant="ghost" icon="x" aria-label="Close" onClick={onClose} />
        </div>

        {current ? (
          <div className={styles.current}>
            <p className={styles.song}>
              <span className={styles.name}>{current.name}</span>
              <span className={styles.length}>{formatDuration(current.durationMs)}</span>
            </p>
            <Button
              variant="ghost"
              className={formStyles.remove}
              disabled={busy}
              onClick={() => choose(null)}
            >
              Remove
            </Button>
          </div>
        ) : (
          <p className={styles.muted}>This dance has no music yet.</p>
        )}

        <div className={styles.upload}>
          <input
            ref={fileInput}
            className={styles.file}
            type="file"
            accept={SONG_FILE_ACCEPT}
            tabIndex={-1}
            aria-hidden="true"
            onChange={upload}
          />
          <Button
            variant="primary"
            icon="plus"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            Upload a song
          </Button>
          <p className={styles.muted}>MP3, M4A, AAC or WAV, up to 30 MB.</p>
          {progress !== null && (
            <div className={styles.progress}>
              <progress value={progress} max={1} aria-label="Upload progress" />
              <span role="status" className={styles.percent}>
                {progress === 0 ? 'Reading the song…' : `Uploading ${Math.round(progress * 100)}%`}
              </span>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className={uiFormStyles.error}>
            {error}
          </p>
        )}

        <section className={styles.library} aria-labelledby="school-songs">
          <h3 id="school-songs" className={styles.heading}>
            Your school’s songs
          </h3>
          {state.status === 'loading' && <p className={styles.muted}>Loading songs…</p>}
          {state.status === 'failed' && <p className={styles.muted}>Could not load the songs.</p>}
          {state.status === 'ready' && songs.length === 0 && (
            <p className={styles.muted}>No songs yet. Upload the first one.</p>
          )}
          {songs.length > 0 && (
            <ul className={styles.list}>
              {songs.map((song) => (
                <li key={song.id}>
                  <button
                    type="button"
                    className={styles.pick}
                    aria-current={song.id === choice.audioId ? 'true' : undefined}
                    disabled={busy}
                    onClick={() => choose(song.id)}
                  >
                    <span className={styles.name}>{song.name}</span>
                    <span className={styles.length}>{formatDuration(song.durationMs)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
