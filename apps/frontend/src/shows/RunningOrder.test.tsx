import type { ShowDetail } from '@living-stage/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { RunningOrder } from './RunningOrder.tsx';
import type { ShowActions } from './useShow.ts';

const dance = (id: string) => ({ id, danceId: `dance-${id}`, title: `Dance ${id}`, castCount: 4 });

const gala: ShowDetail = {
  id: 'show-1',
  title: 'Winter gala',
  date: '2026-12-12',
  time: null,
  venue: null,
  createdAt: '2026-11-05T12:00:00.000Z',
  acts: [
    { id: 'act-1', order: 0, name: null, dances: [dance('A'), dance('B'), dance('C')] },
    { id: 'act-2', order: 1, name: null, dances: [dance('D')] },
  ],
};

// jsdom lays nothing out, so acts and dance rows are stacked in document order.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const stacked = [...document.querySelectorAll('section[aria-label^="Act"], li[style]')];
    const owner = this.closest('li[style], section[aria-label^="Act"]');
    const index = owner ? stacked.indexOf(owner) : 0;
    const top = index * 60;
    return {
      left: 0,
      right: 300,
      top,
      bottom: top + 50,
      width: 300,
      height: 50,
      x: 0,
      y: top,
    } as DOMRect;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderOrder(reorder: ShowActions['reorder'] = vi.fn().mockResolvedValue(undefined)) {
  const actions = {
    save: vi.fn(),
    remove: vi.fn(),
    addAct: vi.fn(),
    saveAct: vi.fn(),
    removeAct: vi.fn(),
    addDance: vi.fn(),
    removeDance: vi.fn(),
    reorder,
  };
  render(<RunningOrder show={gala} actions={actions} dances={[]} />);
  return { reorder, user: userEvent.setup() };
}

function actTitles() {
  return within(screen.getByRole('list', { name: 'Acts' }))
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);
}

test('gives each act a handle', () => {
  renderOrder();
  expect(screen.getByRole('button', { name: 'Move Act 2' })).toBeInTheDocument();
});

test('gives each dance a handle', () => {
  renderOrder();
  expect(screen.getByRole('button', { name: 'Move Dance B' })).toBeInTheDocument();
});

test('moves a dance down within its act by keyboard', async () => {
  const { reorder, user } = renderOrder();
  screen.getByRole('button', { name: 'Move Dance B' }).focus();
  await user.keyboard(' {ArrowDown} ');
  expect(reorder).toHaveBeenCalledWith([
    { id: 'act-1', danceIds: ['A', 'C', 'B'] },
    { id: 'act-2', danceIds: ['D'] },
  ]);
});

test('moves the last dance of an act into the next act by keyboard', async () => {
  const { reorder, user } = renderOrder();
  screen.getByRole('button', { name: 'Move Dance C' }).focus();
  await user.keyboard(' {ArrowDown} ');
  expect(reorder).toHaveBeenCalledWith([
    { id: 'act-1', danceIds: ['A', 'B'] },
    { id: 'act-2', danceIds: ['C', 'D'] },
  ]);
});

test('moves an act up by keyboard, with its dances', async () => {
  const { reorder, user } = renderOrder();
  screen.getByRole('button', { name: 'Move Act 2' }).focus();
  await user.keyboard(' {ArrowUp} ');
  expect(reorder).toHaveBeenCalledWith([
    { id: 'act-2', danceIds: ['D'] },
    { id: 'act-1', danceIds: ['A', 'B', 'C'] },
  ]);
});

test('saves nothing when the drag is cancelled', async () => {
  const { reorder, user } = renderOrder();
  screen.getByRole('button', { name: 'Move Act 2' }).focus();
  await user.keyboard(' {ArrowUp}{Escape}');
  expect(reorder).not.toHaveBeenCalled();
});

test('keeps the acts where they were when the drag is cancelled', async () => {
  const { user } = renderOrder();
  screen.getByRole('button', { name: 'Move Act 2' }).focus();
  await user.keyboard(' {ArrowUp}{Escape}');
  expect(actTitles()).toEqual(['Act 1', 'Act 2']);
});

test('says when the new order cannot be saved', async () => {
  const { user } = renderOrder(vi.fn().mockRejectedValue(new Error('PUT show order answered 500')));
  screen.getByRole('button', { name: 'Move Act 2' }).focus();
  await user.keyboard(' {ArrowUp} ');
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not move it. Try again.');
});
