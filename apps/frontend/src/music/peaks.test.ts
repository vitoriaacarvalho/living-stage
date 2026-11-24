import { describe, expect, test } from 'vitest';
import { peaksOf } from './peaks.ts';

// 20 peaks a second, so at 100 samples a second each peak covers 5 samples.
const RATE = 100;

const samples = (...values: number[]) => Float32Array.from(values);

describe('peaksOf', () => {
  test('keeps the loudest sample of each slice', () => {
    expect(peaksOf([samples(0.1, 0.5, 0.2, 0, 0, 0.3, 0.3, 0.3, 0.3, 0.3)], RATE)).toEqual([
      0.5, 0.3,
    ]);
  });

  test('counts a quiet dip as loud as its peak', () => {
    expect(peaksOf([samples(0, -0.8, 0, 0, 0)], RATE)).toEqual([0.8]);
  });

  test('takes the louder of two channels', () => {
    const left = samples(0.2, 0.2, 0.2, 0.2, 0.2);
    const right = samples(0, 0, 0.6, 0, 0);
    expect(peaksOf([left, right], RATE)).toEqual([0.6]);
  });

  test('keeps a last slice that is short', () => {
    expect(peaksOf([samples(0, 0, 0, 0, 0, 0.4)], RATE)).toEqual([0, 0.4]);
  });

  test('rounds to hundredths', () => {
    expect(peaksOf([samples(0.123, 0, 0, 0, 0)], RATE)).toEqual([0.12]);
  });

  test('caps a clipped sample at 1', () => {
    expect(peaksOf([samples(1.7, 0, 0, 0, 0)], RATE)).toEqual([1]);
  });

  test('gives no peaks for a song with no samples', () => {
    expect(peaksOf([samples()], RATE)).toEqual([]);
  });

  test('gives twenty peaks a second', () => {
    expect(peaksOf([new Float32Array(8000 * 3)], 8000)).toHaveLength(60);
  });
});
