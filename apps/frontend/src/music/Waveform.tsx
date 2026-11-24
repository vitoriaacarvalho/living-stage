import { formatDuration, type AudioTrackDetail, type Figure } from '@living-stage/shared';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Minimap from 'wavesurfer.js/dist/plugins/minimap.esm.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { figureLabel } from '../figures/figure-label.ts';
import { usePhone } from '../ui/usePhone.ts';
import { markerLabel } from './marker-label.ts';
import { tokenColor } from './token-color.ts';
import styles from './Waveform.module.css';

// About 50 seconds of song across an iPad's timeline, 45 across an iPhone's; the rest scrolls.
const PX_PER_SECOND = { phone: 8, other: 16 };

// The song's own audio element, so the playhead follows what is heard, and scrubbing.
export type WaveformClock = { media: HTMLAudioElement; seek: (ms: number) => void };

// Figure markers at their moments; move is null while they can't be dragged (playing).
export type WaveformMarkers = {
  figures: Figure[];
  activeId: string | null;
  move: ((figureId: string, timeMs: number) => void) | null;
};

type WaveformProps = { song: AudioTrackDetail; clock?: WaveformClock; markers?: WaveformMarkers };

type Drawing = { wave: WaveSurfer; regions: Regions };

// Drawn from the waveform stored at upload, so it opens without downloading the song.
export function Waveform({ song, clock, markers }: WaveformProps) {
  const container = useRef<HTMLDivElement>(null);
  const drawing = useRef<Drawing | null>(null);
  // Bumped after a marker is let go, so it is redrawn where its figure really is.
  const [revision, setRevision] = useState(0);
  const phone = usePhone() !== null;
  const media = clock?.media;

  const seek = useEffectEvent((seconds: number) => clock?.seek(Math.round(seconds * 1000)));
  const moved = useEffectEvent((figureId: string, seconds: number) => {
    markers?.move?.(figureId, Math.round(seconds * 1000));
    setRevision((count) => count + 1);
  });

  useEffect(() => {
    if (!container.current || song.peaks.length === 0) return;
    const played = tokenColor('--primary');
    const regions = Regions.create();
    const wave = WaveSurfer.create({
      container: container.current,
      peaks: [song.peaks],
      duration: song.durationMs / 1000,
      ...(media && { media }),
      height: phone ? 40 : 56,
      waveColor: tokenColor('--ink-muted', 0.45),
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
      // Tapping or dragging the waveform scrubs, once the song drives the stage.
      interact: media !== undefined,
      // The design has the whole-song strip on iPad and desktop only.
      plugins: phone
        ? [regions]
        : [
            regions,
            Minimap.create({
              height: 6,
              waveColor: tokenColor('--surface-sunken'),
              progressColor: played,
              overlayColor: tokenColor('--ink-muted', 0.25),
              insertPosition: 'beforebegin',
            }),
          ],
    });
    wave.on('interaction', (seconds) => seek(seconds));
    regions.on('region-updated', (region) => moved(region.id, region.start));
    drawing.current = { wave, regions };
    return () => {
      drawing.current = null;
      wave.destroy();
    };
  }, [song, phone, media]);

  const figures = markers?.figures;
  const activeId = markers?.activeId ?? null;
  const draggable = markers?.move != null;

  useEffect(() => {
    const regions = drawing.current?.regions;
    if (!regions || !figures) return;
    regions.clearRegions();
    for (const [index, figure] of figures.entries()) {
      if (figure.timeMs === null) continue;
      const active = figure.id === activeId;
      const text = phone ? `F${index + 1}` : figureLabel(figure, index);
      regions.addRegion({
        id: figure.id,
        start: figure.timeMs / 1000,
        drag: draggable,
        resize: false,
        color: tokenColor(active ? '--primary' : '--ink-muted'),
        content: markerLabel(text, active),
      });
    }
  }, [figures, activeId, draggable, phone, revision, song]);

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
