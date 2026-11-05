import { describe, expect, test } from 'vitest';
import {
  DURATION_MAX_MS,
  formatDuration,
  formatRunningTime,
  parseDurationMs,
  parseDurationText,
  parseIntervalMs,
  runningTime,
} from './running-time.ts';

describe('parseDurationText', () => {
  test('reads minutes and seconds', () => {
    expect(parseDurationText('3:40')).toBe(220_000);
  });

  test('reads a dance under a minute', () => {
    expect(parseDurationText('0:45')).toBe(45_000);
  });

  test('reads the shortest time', () => {
    expect(parseDurationText('0:01')).toBe(1000);
  });

  test('reads the longest time', () => {
    expect(parseDurationText('60:00')).toBe(DURATION_MAX_MS);
  });

  test('rejects a time over an hour', () => {
    expect(parseDurationText('60:01')).toBeUndefined();
  });

  test('rejects no time at all', () => {
    expect(parseDurationText('0:00')).toBeUndefined();
  });

  test('rejects seconds past 59', () => {
    expect(parseDurationText('3:60')).toBeUndefined();
  });

  test('rejects seconds with one digit', () => {
    expect(parseDurationText('3:4')).toBeUndefined();
  });

  test('rejects a number with no seconds', () => {
    expect(parseDurationText('3')).toBeUndefined();
  });

  test('takes blank as no time', () => {
    expect(parseDurationText('  ')).toBeNull();
  });

  test('ignores spaces around the time', () => {
    expect(parseDurationText(' 3:40 ')).toBe(220_000);
  });
});

describe('parseDurationMs', () => {
  test('accepts whole seconds', () => {
    expect(parseDurationMs(220_000)).toBe(220_000);
  });

  test('accepts null to clear the time', () => {
    expect(parseDurationMs(null)).toBeNull();
  });

  test('rejects part of a second', () => {
    expect(parseDurationMs(220_500)).toBeUndefined();
  });

  test('rejects zero', () => {
    expect(parseDurationMs(0)).toBeUndefined();
  });

  test('rejects more than an hour', () => {
    expect(parseDurationMs(DURATION_MAX_MS + 1000)).toBeUndefined();
  });

  test('rejects a time sent as text', () => {
    expect(parseDurationMs('3:40')).toBeUndefined();
  });
});

describe('parseIntervalMs', () => {
  test('accepts no interval', () => {
    expect(parseIntervalMs(0)).toBe(0);
  });

  test('accepts whole minutes', () => {
    expect(parseIntervalMs(15 * 60_000)).toBe(15 * 60_000);
  });

  test('accepts an hour', () => {
    expect(parseIntervalMs(60 * 60_000)).toBe(60 * 60_000);
  });

  test('rejects more than an hour', () => {
    expect(parseIntervalMs(61 * 60_000)).toBeUndefined();
  });

  test('rejects part of a minute', () => {
    expect(parseIntervalMs(90_000)).toBeUndefined();
  });

  test('rejects a negative interval', () => {
    expect(parseIntervalMs(-60_000)).toBeUndefined();
  });
});

describe('formatDuration', () => {
  test('writes minutes and seconds', () => {
    expect(formatDuration(220_000)).toBe('3:40');
  });

  test('pads the seconds', () => {
    expect(formatDuration(65_000)).toBe('1:05');
  });

  test('writes hours past an hour', () => {
    expect(formatDuration(3_750_000)).toBe('1:02:30');
  });

  test('shows a missing time as a dash', () => {
    expect(formatDuration(null)).toBe('–:––');
  });

  test('writes nothing as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });
});

describe('formatRunningTime', () => {
  test('writes minutes and seconds', () => {
    expect(formatRunningTime(3_435_000)).toBe('57min 15s');
  });

  test('leaves out zero seconds', () => {
    expect(formatRunningTime(57 * 60_000)).toBe('57min');
  });

  test('writes hours and minutes past an hour', () => {
    expect(formatRunningTime(75 * 60_000)).toBe('1h 15min');
  });

  test('writes a round hour', () => {
    expect(formatRunningTime(60 * 60_000)).toBe('1h');
  });

  test('writes nothing as 0min', () => {
    expect(formatRunningTime(0)).toBe('0min');
  });
});

describe('runningTime', () => {
  const act = (...durations: (number | null)[]) => ({
    dances: durations.map((durationMs) => ({ durationMs })),
  });

  test('adds up each act', () => {
    expect(runningTime([act(60_000, 30_000), act(10_000)], 0).acts).toEqual([90_000, 10_000]);
  });

  test('puts an interval between every two acts', () => {
    expect(runningTime([act(), act(), act()], 0).intervals).toBe(2);
  });

  test('adds the acts and intervals into the total', () => {
    expect(runningTime([act(60_000), act(30_000)], 15 * 60_000).totalMs).toBe(990_000);
  });

  test('has no interval with one act', () => {
    expect(runningTime([act(60_000)], 15 * 60_000).totalMs).toBe(60_000);
  });

  test('counts a dance with no time as nothing', () => {
    expect(runningTime([act(60_000, null)], 0).totalMs).toBe(60_000);
  });

  test('counts the dances with no time yet', () => {
    expect(runningTime([act(60_000, null), act(null)], 0).untimed).toBe(2);
  });

  test('is zero for a show with no dances', () => {
    expect(runningTime([act()], 0).totalMs).toBe(0);
  });
});
