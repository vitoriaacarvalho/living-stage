import {
  FIGURE_NAME_MAX_LENGTH,
  formatDuration,
  parseFigureName,
  pinRange,
  type Figure,
  type FigureUpdate,
} from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import panelStyles from '../cast/CastList.module.css';
import styles from '../cast/CastMemberForm.module.css';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';
import { figureLabel } from './figure-label.ts';
import { parseMoment } from './moment-text.ts';
import { parseTransitionSeconds, transitionSeconds } from './transition-seconds.ts';

export type FigureActions = {
  save: (update: FigureUpdate) => Promise<void>;
  remove: () => Promise<void>;
};

// songMs is set when the dance plays to its song, so the figure has a moment in it.
export type FigureDance = { figures: Figure[]; songMs: number | null };

type FigurePanelProps = {
  figure: Figure;
  dance: FigureDance;
  actions: FigureActions;
  onClose: () => void;
};

export function FigurePanel({ figure, dance, actions, onClose }: FigurePanelProps) {
  const { figures, songMs } = dance;
  const index = figures.indexOf(figure);
  const onSong = songMs !== null && figure.timeMs !== null;
  const moment = formatDuration(figure.timeMs ?? 0);
  const range = onSong
    ? pinRange(
        figures.map(({ timeMs }) => timeMs ?? 0),
        index,
        songMs,
      )
    : null;
  const label = figureLabel(figure, index);
  // The first figure is where the dance starts, so nothing moves into it.
  const before = index > 0 ? figureLabel(figures[index - 1]!, index - 1) : null;
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>, failure: string) {
    setError(null);
    setPending(true);
    try {
      await action();
    } catch {
      setError(failure);
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const update: FigureUpdate = { name: parseFigureName(form.get('name')) ?? null };
    // Sent only when changed, so an untouched field never rounds a dragged moment.
    const typed = String(form.get('moment') ?? '').trim();
    if (range && typed !== moment) {
      const timeMs = parseMoment(typed);
      if (timeMs === null || timeMs < range.minMs || timeMs > range.maxMs) {
        setError(`Type a time between ${between(range)}, as m:ss.`);
        return;
      }
      update.timeMs = timeMs;
    } else if (!range && before) {
      const transitionMs = parseTransitionSeconds(String(form.get('transition')));
      if (transitionMs === null) {
        setError('Choose a time from 1 to 30 seconds, in half seconds.');
        return;
      }
      update.transitionMs = transitionMs;
    }
    run(async () => {
      await actions.save(update);
      onClose();
    }, 'Could not save the figure. Try again.');
  }

  return (
    <aside className={panelStyles.panel} aria-label="Figure">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.head}>
          <h2 className={styles.title}>{label}</h2>
          <Button variant="ghost" icon="x" aria-label="Close" onClick={onClose} />
        </div>
        <TextField
          label="Name"
          name="name"
          defaultValue={figure.name ?? ''}
          help="Optional. A figure with no name is numbered."
          maxLength={FIGURE_NAME_MAX_LENGTH}
          autoComplete="off"
        />
        {range ? (
          <TextField
            label="Reached at"
            name="moment"
            defaultValue={moment}
            help={`The moment in the song, between ${between(range)}.`}
            inputMode="numeric"
            autoComplete="off"
          />
        ) : (
          before && (
            <TextField
              label="Time to arrive"
              name="transition"
              defaultValue={transitionSeconds(figure.transitionMs)}
              help={`Seconds to get here from ${before}, 1 to 30.`}
              inputMode="decimal"
              autoComplete="off"
            />
          )
        )}
        {error && (
          <p role="alert" className={formStyles.error}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          {confirming ? (
            <>
              <p className={styles.confirm}>Delete {label} and its positions?</p>
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
                Keep
              </Button>
              <Button
                variant="primary"
                onClick={() => run(actions.remove, 'Could not delete the figure. Try again.')}
                disabled={pending}
              >
                Delete
              </Button>
            </>
          ) : (
            <>
              {figures.length > 1 && (
                <Button
                  variant="ghost"
                  className={styles.remove}
                  onClick={() => setConfirming(true)}
                >
                  Delete
                </Button>
              )}
              <span className={styles.spacer} />
              <Button variant="primary" type="submit" disabled={pending}>
                Save
              </Button>
            </>
          )}
        </div>
      </form>
    </aside>
  );
}

// A pin may sit half a second from its neighbours; the help shows whole seconds inside that.
function between({ minMs, maxMs }: { minMs: number; maxMs: number }) {
  const first = formatDuration(Math.ceil(minMs / 1000) * 1000);
  const last = formatDuration(Math.floor(maxMs / 1000) * 1000);
  return `${first} and ${last}`;
}
