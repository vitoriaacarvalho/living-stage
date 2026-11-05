import type { DanceSummary } from '@living-stage/shared';
import { expect, test } from 'vitest';
import { deleteWarning } from './DanceForm.tsx';

const kitri: DanceSummary = {
  id: 'dance-1',
  title: 'Kitri variation',
  showGuides: true,
  labelMode: 'name',
  colorMode: 'dancer',
  createdAt: '2026-10-20T12:00:00.000Z',
  castCount: 0,
  preview: [],
  showTitles: [],
};

test('warns only that deleting is for good when the dance is in no show', () => {
  expect(deleteWarning(kitri)).toBe("Delete Kitri variation? This can't be undone.");
});

test('names the one show the dance leaves', () => {
  expect(deleteWarning({ ...kitri, showTitles: ['Winter gala'] })).toBe(
    "Delete Kitri variation? It is in Winter gala and will leave it. This can't be undone.",
  );
});

test('names every show the dance leaves', () => {
  expect(
    deleteWarning({ ...kitri, showTitles: ['Winter gala', 'Spring show', 'Summer festival'] }),
  ).toBe(
    "Delete Kitri variation? It is in Winter gala, Spring show and Summer festival and will leave them. This can't be undone.",
  );
});
