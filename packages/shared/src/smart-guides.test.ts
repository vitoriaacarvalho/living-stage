import { describe, expect, test } from 'vitest';
import { ALIGN_DISTANCE_M, smartSnap, snapToDancers, snapToGap } from './smart-guides.ts';
import { STAGE_DEPTH_M, STAGE_WIDTH_M } from './stage.ts';

const at = (xM: number, yM: number) => ({ x: xM / STAGE_WIDTH_M, y: yM / STAGE_DEPTH_M });
const near = 0.9 * ALIGN_DISTANCE_M;
const past = 1.1 * ALIGN_DISTANCE_M;

function inMetres(point: { x: number; y: number } | undefined) {
  return point && { x: point.x * STAGE_WIDTH_M, y: point.y * STAGE_DEPTH_M };
}

describe('snapToDancers', () => {
  const surroundings = { others: [at(5, 2)], guides: 'none' as const };

  test('takes the x of a dancer within the align distance', () => {
    expect(snapToDancers(at(5 + near, 6.3), surroundings).point.x).toBeCloseTo(5 / STAGE_WIDTH_M);
  });

  test('takes the y of a dancer within the align distance', () => {
    expect(snapToDancers(at(8.3, 2 - near), surroundings).point.y).toBeCloseTo(2 / STAGE_DEPTH_M);
  });

  test('leaves x alone just past the align distance', () => {
    const point = at(5 + past, 6.3);
    expect(snapToDancers(point, surroundings).point.x).toBe(point.x);
  });

  test('draws a line from the dancer to the new spot', () => {
    const { point, hints } = snapToDancers(at(5 + near, 6.3), surroundings);
    expect(hints).toEqual([{ kind: 'align', from: at(5, 2), to: point }]);
  });

  test('has no hints when nobody lines up', () => {
    expect(snapToDancers(at(8.3, 6.3), surroundings).hints).toEqual([]);
  });

  test('lines up on each axis with a different dancer', () => {
    const others = [at(5, 2), at(9, 6)];
    expect(snapToDancers(at(5.1, 6.1), { others, guides: 'none' }).hints).toHaveLength(2);
  });

  test('takes the closest of two dancers on the same axis', () => {
    const others = [at(5, 2), at(5.1, 7)];
    const { point } = snapToDancers(at(5.13, 4.5), { others, guides: 'none' });
    expect(point.x).toBeCloseTo(5.1 / STAGE_WIDTH_M);
  });

  test('prefers a dancer to a guide line on the same axis', () => {
    const others = [at(6.12, 2)];
    const { point } = snapToDancers(at(6.05, 4.5), { others, guides: 'lines' });
    expect(point.x).toBeCloseTo(6.12 / STAGE_WIDTH_M);
  });

  test('falls back to the guide lines on an axis with no dancer', () => {
    const { point } = snapToDancers(at(8.3, 4.1), { others: [at(5, 2)], guides: 'lines' });
    expect(point.y).toBe(0.5);
  });

  test('snaps to nothing on an empty stage with the guides hidden', () => {
    const point = at(8.3, 4.1);
    expect(snapToDancers(point, { others: [], guides: 'none' }).point).toEqual(point);
  });
});

describe('snapToGap', () => {
  test('lands on the next spot in a row', () => {
    const snapped = snapToGap(at(6 + near, 4), [at(2, 4), at(4, 4)]);
    expect(inMetres(snapped?.point)).toEqual({ x: expect.closeTo(6), y: expect.closeTo(4) });
  });

  test('lands on the next spot down a column', () => {
    const snapped = snapToGap(at(3, 5 - near), [at(3, 1), at(3, 3)]);
    expect(inMetres(snapped?.point)).toEqual({ x: expect.closeTo(3), y: expect.closeTo(5) });
  });

  test('lands on the next spot along a diagonal', () => {
    const snapped = snapToGap(at(7.05, 6.05), [at(3, 2), at(5, 4)]);
    expect(inMetres(snapped?.point)).toEqual({ x: expect.closeTo(7), y: expect.closeTo(6) });
  });

  test('lands on the spot before the first dancer of a row', () => {
    const snapped = snapToGap(at(2.1, 4), [at(4, 4), at(6, 4)]);
    expect(inMetres(snapped?.point)).toEqual({ x: expect.closeTo(2), y: expect.closeTo(4) });
  });

  test('lands halfway between the two nearest dancers', () => {
    const snapped = snapToGap(at(5.1, 4.05), [at(2, 4), at(8, 4)]);
    expect(inMetres(snapped?.point)).toEqual({ x: expect.closeTo(5), y: expect.closeTo(4) });
  });

  test('gives the gap in metres along the pattern', () => {
    const snapped = snapToGap(at(7.05, 6.05), [at(3, 2), at(5, 4)]);
    expect(snapped?.hints[0]).toMatchObject({
      kind: 'gap',
      gapM: expect.closeTo(Math.hypot(2, 2)),
    });
  });

  test('gives half the distance as the gap of a midpoint', () => {
    const snapped = snapToGap(at(5.1, 4), [at(2, 4), at(8, 4)]);
    expect(snapped?.hints[0]).toMatchObject({ gapM: expect.closeTo(3) });
  });

  test('draws the gap through the three spots in order', () => {
    const snapped = snapToGap(at(6.05, 4), [at(2, 4), at(4, 4)]);
    expect(snapped?.hints[0]).toMatchObject({ through: [at(2, 4), at(4, 4), snapped?.point] });
  });

  test('gives nothing just past the align distance', () => {
    expect(snapToGap(at(6 + past, 4), [at(2, 4), at(4, 4)])).toBeNull();
  });

  test('gives nothing with a single dancer on stage', () => {
    expect(snapToGap(at(6, 4), [at(4, 4)])).toBeNull();
  });

  test('gives nothing with nobody on stage', () => {
    expect(snapToGap(at(6, 4), [])).toBeNull();
  });

  test('takes no gap from two dancers on the same spot', () => {
    expect(snapToGap(at(4.02, 4), [at(4, 4), at(4, 4)])).toBeNull();
  });

  test('only follows the two nearest neighbours of the nearest dancer', () => {
    const others = [at(6, 4), at(6, 3), at(6, 5), at(3, 4)];
    expect(snapToGap(at(9, 4), others)).toBeNull();
  });
});

describe('smartSnap', () => {
  test('prefers an equal gap to lining up', () => {
    const others = [at(2, 4), at(4, 4), at(6.1, 1)];
    const { hints } = smartSnap(at(6.05, 4), { others, guides: 'none' });
    expect(hints.map(({ kind }) => kind)).toEqual(['gap']);
  });

  test('lines up when there is no gap to land on', () => {
    const { hints } = smartSnap(at(8.3, 2.1), { others: [at(5, 2)], guides: 'none' });
    expect(hints.map(({ kind }) => kind)).toEqual(['align']);
  });
});
