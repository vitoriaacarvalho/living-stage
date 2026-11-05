import { describe, expect, test } from 'vitest';
import {
  ACT_NAME_MAX_LENGTH,
  SHOW_TITLE_MAX_LENGTH,
  SHOW_VENUE_MAX_LENGTH,
  inShowOrder,
  isPerformed,
  parseActDanceInput,
  parseActUpdate,
  parseShowDate,
  parseShowInput,
  parseShowTime,
  parseShowUpdate,
} from './show.ts';

const gala = { title: 'Winter gala', date: '2026-12-12', time: '19:00', venue: 'City theatre' };

describe('parseShowDate', () => {
  test('accepts a calendar day', () => {
    expect(parseShowDate('2026-12-12')).toBe('2026-12-12');
  });

  test('accepts a leap day', () => {
    expect(parseShowDate('2028-02-29')).toBe('2028-02-29');
  });

  test('rejects a leap day in a common year', () => {
    expect(parseShowDate('2026-02-29')).toBeNull();
  });

  test('rejects a month past December', () => {
    expect(parseShowDate('2026-13-01')).toBeNull();
  });

  test('rejects a day past the end of the month', () => {
    expect(parseShowDate('2026-04-31')).toBeNull();
  });

  test('rejects a date with a time in it', () => {
    expect(parseShowDate('2026-12-12T19:00')).toBeNull();
  });

  test('rejects a date written another way', () => {
    expect(parseShowDate('12/12/2026')).toBeNull();
  });
});

describe('parseShowTime', () => {
  test('accepts an evening time', () => {
    expect(parseShowTime('19:30')).toBe('19:30');
  });

  test('accepts midnight', () => {
    expect(parseShowTime('00:00')).toBe('00:00');
  });

  test('accepts the last minute of the day', () => {
    expect(parseShowTime('23:59')).toBe('23:59');
  });

  test('takes blank as no time', () => {
    expect(parseShowTime('')).toBeNull();
  });

  test('takes null as no time', () => {
    expect(parseShowTime(null)).toBeNull();
  });

  test('rejects hour 24', () => {
    expect(parseShowTime('24:00')).toBeUndefined();
  });

  test('rejects minute 60', () => {
    expect(parseShowTime('19:60')).toBeUndefined();
  });

  test('rejects a time with seconds', () => {
    expect(parseShowTime('19:00:00')).toBeUndefined();
  });
});

describe('parseShowInput', () => {
  test('accepts a full show', () => {
    expect(parseShowInput(gala)).toEqual(gala);
  });

  test('trims the title and venue', () => {
    expect(parseShowInput({ ...gala, title: ' Winter gala ', venue: ' City theatre ' })).toEqual(
      gala,
    );
  });

  test('takes a missing time and venue as none', () => {
    expect(parseShowInput({ title: 'Winter gala', date: '2026-12-12' })).toEqual({
      ...gala,
      time: null,
      venue: null,
    });
  });

  test('takes a blank venue as none', () => {
    expect(parseShowInput({ ...gala, venue: '  ' })?.venue).toBeNull();
  });

  test('rejects a show with no title', () => {
    expect(parseShowInput({ ...gala, title: '  ' })).toBeNull();
  });

  test('rejects a show with no date', () => {
    expect(parseShowInput({ ...gala, date: undefined })).toBeNull();
  });

  test('accepts a title at the maximum length', () => {
    const title = 'a'.repeat(SHOW_TITLE_MAX_LENGTH);
    expect(parseShowInput({ ...gala, title })?.title).toBe(title);
  });

  test('rejects a title over the maximum length', () => {
    expect(parseShowInput({ ...gala, title: 'a'.repeat(SHOW_TITLE_MAX_LENGTH + 1) })).toBeNull();
  });

  test('rejects a venue over the maximum length', () => {
    expect(parseShowInput({ ...gala, venue: 'a'.repeat(SHOW_VENUE_MAX_LENGTH + 1) })).toBeNull();
  });

  test('rejects a bad time', () => {
    expect(parseShowInput({ ...gala, time: '7pm' })).toBeNull();
  });
});

describe('parseShowUpdate', () => {
  test('accepts a new title alone', () => {
    expect(parseShowUpdate({ title: 'Spring show' })).toEqual({ title: 'Spring show' });
  });

  test('accepts clearing the time', () => {
    expect(parseShowUpdate({ time: '' })).toEqual({ time: null });
  });

  test('accepts clearing the venue', () => {
    expect(parseShowUpdate({ venue: null })).toEqual({ venue: null });
  });

  test('rejects an empty body', () => {
    expect(parseShowUpdate({})).toBeNull();
  });

  test('rejects a blank title', () => {
    expect(parseShowUpdate({ title: ' ' })).toBeNull();
  });

  test('rejects a bad date even with a good title', () => {
    expect(parseShowUpdate({ title: 'Spring show', date: '2026-02-30' })).toBeNull();
  });
});

describe('parseActUpdate', () => {
  test('accepts a name', () => {
    expect(parseActUpdate({ name: ' Classics ' })).toEqual({ name: 'Classics' });
  });

  test('takes a blank name as none', () => {
    expect(parseActUpdate({ name: '' })).toEqual({ name: null });
  });

  test('accepts clearing the name', () => {
    expect(parseActUpdate({ name: null })).toEqual({ name: null });
  });

  test('rejects a name over the maximum length', () => {
    expect(parseActUpdate({ name: 'a'.repeat(ACT_NAME_MAX_LENGTH + 1) })).toBeNull();
  });

  test('rejects a body with no name', () => {
    expect(parseActUpdate({})).toBeNull();
  });
});

describe('parseActDanceInput', () => {
  test('accepts a dance id', () => {
    expect(parseActDanceInput({ danceId: 'dance-1' })).toEqual({ danceId: 'dance-1' });
  });

  test('rejects an empty dance id', () => {
    expect(parseActDanceInput({ danceId: '' })).toBeNull();
  });
});

describe('isPerformed', () => {
  test('counts a show before today as performed', () => {
    expect(isPerformed({ date: '2026-11-04' }, '2026-11-05')).toBe(true);
  });

  test('does not count a show today as performed', () => {
    expect(isPerformed({ date: '2026-11-05' }, '2026-11-05')).toBe(false);
  });

  test('does not count a show after today as performed', () => {
    expect(isPerformed({ date: '2026-11-06' }, '2026-11-05')).toBe(false);
  });
});

describe('inShowOrder', () => {
  const show = (date: string, time: string | null = null) => ({ date, time });
  const today = '2026-11-05';

  test('puts the soonest upcoming show first', () => {
    const order = inShowOrder([show('2026-12-19'), show('2026-12-12')], today);
    expect(order.map(({ date }) => date)).toEqual(['2026-12-12', '2026-12-19']);
  });

  test('puts past shows after upcoming ones, most recent first', () => {
    const order = inShowOrder([show('2026-07-20'), show('2026-12-12'), show('2026-09-01')], today);
    expect(order.map(({ date }) => date)).toEqual(['2026-12-12', '2026-09-01', '2026-07-20']);
  });

  test('orders two shows on one day by time', () => {
    const order = inShowOrder([show('2026-12-12', '19:00'), show('2026-12-12', '15:00')], today);
    expect(order.map(({ time }) => time)).toEqual(['15:00', '19:00']);
  });

  test('keeps a show today with the upcoming ones', () => {
    const order = inShowOrder([show('2026-07-20'), show(today)], today);
    expect(order[0]!.date).toBe(today);
  });

  test('gives nothing for no shows', () => {
    expect(inShowOrder([], today)).toEqual([]);
  });
});
