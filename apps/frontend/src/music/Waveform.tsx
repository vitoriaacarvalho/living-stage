import { formatDuration, type AudioTrackDetail } from '@living-stage/shared';
import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Minimap from 'wavesurfer.js/dist/plugins/minimap.esm.js';
import { usePhone } from '../ui/usePhone.ts';
import { tokenColor } from './token-color.ts';
import styles from './Waveform.module.css';

// About 50 seconds of song across an iPad's timeline, 45 across an iPhone's; the rest scrolls.
const PX_PER_SECOND = { phone: 8, other: 16 };

// Drawn from the waveform stored at upload, so it opens without downloading the song.
export function Waveform({ song }: { song: AudioTrackDetail }) {
  const container = useRef<HTMLDivElement>(null);
  const phone = usePhone() !== null;

  useEffect(() => {
    if (!container.current || song.peaks.length === 0) return;
    const played = tokenColor('--primary');
    const unplayed = tokenColor('--ink-muted', 0.45);
    const wave = WaveSurfer.create({
      container: container.current,
      peaks: [song.peaks],
      duration: song.durationMs / 1000,
      height: phone ? 40 : 56,
      waveColor: unplayed,
      progressColor: played,
      cursorColor: played,
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      normalize: true,
      minPxPerSec: phone ? PX_PER_SECOND.phone : PX_PER_SECOND.other,
      hideScrollbar: true,
      autoScroll: true,
      // Seeking comes with the transport (plan 4.3).
      interact: false,
      // The design has the whole-song strip on iPad and desktop only.
      plugins: phone
        ? []
        : [
            Minimap.create({
              height: 6,
              waveColor: tokenColor('--surface-sunken'),
              progressColor: played,
              overlayColor: tokenColor('--ink-muted', 0.25),
              insertPosition: 'beforebegin',
            }),
          ],
    });
    return () => wave.destroy();
  }, [song, phone]);

  if (song.peaks.length === 0) {
    return (
      <p className={styles.missing}>{song.name} has no waveform yet. Upload it again to see one.</p>
    );
  }
  return (
    <div
      ref={container}
      className={styles.waveform}
      role="img"
      aria-label={`Waveform of ${song.name}, ${formatDuration(song.durationMs)}`}
    />
  );
}
