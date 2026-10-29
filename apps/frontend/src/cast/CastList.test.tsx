import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { addCastMember, fetchCast } from '../api/cast.ts';
import { fetchDancers } from '../api/dancers.ts';
import { CastList } from './CastList.tsx';

vi.mock('../api/cast.ts', () => ({ fetchCast: vi.fn(), addCastMember: vi.fn() }));
vi.mock('../api/dancers.ts', () => ({ fetchDancers: vi.fn() }));

const clara = { id: 'dancer-1', name: 'Clara Souza', color: 3 };
const bia = { id: 'dancer-2', name: 'Bia Lima', color: null };
const claraAsKitri = { id: 'cast-1', dancer: clara, role: 'Kitri' };

beforeEach(() => {
  vi.mocked(fetchCast).mockReset().mockResolvedValue([claraAsKitri]);
  vi.mocked(addCastMember).mockReset().mockResolvedValue({ id: 'cast-2', dancer: bia, role: null });
  vi.mocked(fetchDancers).mockReset().mockResolvedValue([bia, clara]);
});

function renderCast() {
  render(<CastList schoolId="school-1" danceId="dance-1" />);
}

async function castNames() {
  const list = await screen.findByRole('list', { name: 'Cast members' });
  return within(list)
    .getAllByRole('listitem')
    .map((row) => row.textContent);
}

async function openPicker() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Add' }));
  return user;
}

test('loads the cast of this dance', async () => {
  renderCast();
  await screen.findByRole('list', { name: 'Cast members' });
  expect(fetchCast).toHaveBeenCalledWith('school-1', 'dance-1', expect.any(AbortSignal));
});

test('lists each cast member with her role', async () => {
  renderCast();
  expect(await castNames()).toEqual(['CSClara SouzaKitri']);
});

test('counts one dancer in the cast', async () => {
  renderCast();
  expect(await screen.findByLabelText('1 dancer')).toHaveTextContent('1');
});

test('counts several dancers in the cast', async () => {
  vi.mocked(fetchCast).mockResolvedValue([claraAsKitri, { id: 'cast-2', dancer: bia, role: null }]);
  renderCast();
  expect(await screen.findByLabelText('2 dancers')).toHaveTextContent('2');
});

test('shows a removed dancer as an open spot', async () => {
  vi.mocked(fetchCast).mockResolvedValue([{ ...claraAsKitri, dancer: null }]);
  renderCast();
  expect(await castNames()).toEqual(['Open spotKitri']);
});

test('says when nobody is cast yet', async () => {
  vi.mocked(fetchCast).mockResolvedValue([]);
  renderCast();
  expect(await screen.findByText(/No dancers in this dance yet/)).toBeInTheDocument();
});

test('says when the cast cannot be loaded', async () => {
  vi.mocked(fetchCast).mockRejectedValue(new Error('GET cast answered 500'));
  renderCast();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the cast');
});

test('offers only the roster dancers who are not cast yet', async () => {
  renderCast();
  await openPicker();
  const list = await screen.findByRole('list', { name: 'Dancers to add' });
  expect(
    within(list)
      .getAllByRole('button')
      .map((button) => button.textContent),
  ).toEqual(['Bia LimaAdd']);
});

test('casts the picked dancer into this dance', async () => {
  renderCast();
  const user = await openPicker();
  await user.click(await screen.findByRole('button', { name: /Bia Lima/ }));
  expect(addCastMember).toHaveBeenCalledWith('school-1', 'dance-1', {
    dancerId: 'dancer-2',
    role: null,
  });
});

test('lists the added dancer once the picker is done', async () => {
  renderCast();
  const user = await openPicker();
  await user.click(await screen.findByRole('button', { name: /Bia Lima/ }));
  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(await castNames()).toEqual(['CSClara SouzaKitri', 'BLBia Lima']);
});

test('says when every roster dancer is already cast', async () => {
  vi.mocked(fetchDancers).mockResolvedValue([clara]);
  renderCast();
  await openPicker();
  expect(await screen.findByText(/Every dancer in the roster/)).toBeInTheDocument();
});

test('says when a dancer cannot be added', async () => {
  vi.mocked(addCastMember).mockRejectedValue(new Error('POST cast member answered 500'));
  renderCast();
  const user = await openPicker();
  await user.click(await screen.findByRole('button', { name: /Bia Lima/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not add Bia Lima');
});
