import { CAST_MAX_SIZE, type ColorMode } from '@living-stage/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { addCastMember, fetchCast, removeCastMember, updateCastMember } from '../api/cast.ts';
import { fetchDancers } from '../api/dancers.ts';
import { fetchFigures } from '../api/figures.ts';
import { CastList } from './CastList.tsx';
import { useCast } from './useCast.ts';

vi.mock('../api/cast.ts', () => ({
  fetchCast: vi.fn(),
  addCastMember: vi.fn(),
  updateCastMember: vi.fn(),
  removeCastMember: vi.fn(),
}));
vi.mock('../api/dancers.ts', () => ({ fetchDancers: vi.fn() }));
vi.mock('../api/figures.ts', () => ({ fetchFigures: vi.fn() }));

const clara = { id: 'dancer-1', name: 'Clara Souza', color: 3 };
const bia = { id: 'dancer-2', name: 'Bia Lima', color: null };
const claraAsKitri = { id: 'cast-1', dancer: clara, role: 'Kitri' };

beforeEach(() => {
  vi.mocked(fetchCast).mockReset().mockResolvedValue([claraAsKitri]);
  vi.mocked(fetchFigures).mockReset().mockResolvedValue([]);
  vi.mocked(addCastMember)
    .mockReset()
    .mockResolvedValue({
      castMember: { id: 'cast-2', dancer: bia, role: null },
      positions: [{ figureId: 'figure-1', castMemberId: 'cast-2', x: -0.0625, y: 0.05 }],
    });
  vi.mocked(fetchDancers).mockReset().mockResolvedValue([bia, clara]);
  vi.mocked(updateCastMember)
    .mockReset()
    .mockImplementation(async (_schoolId, _danceId, _id, update) => ({
      ...claraAsKitri,
      ...update,
    }));
  vi.mocked(removeCastMember).mockReset().mockResolvedValue();
});

function KitriCast({ colorMode }: { colorMode: ColorMode }) {
  const { state, ...actions } = useCast('school-1', 'dance-1');
  return <CastList schoolId="school-1" state={state} actions={actions} colorMode={colorMode} />;
}

function renderCast(colorMode: ColorMode = 'dancer') {
  render(<KitriCast colorMode={colorMode} />);
}

async function claraSwatch() {
  const row = (await screen.findByText('Clara Souza')).closest('li')!;
  return row.querySelector('[aria-hidden="true"]');
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
  const list = await screen.findByRole('list', { name: 'Dancers not in this dance' });
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

function castOf(size: number) {
  return Array.from({ length: size }, (_, index) => ({
    id: `cast-${index + 10}`,
    dancer: { id: `dancer-${index + 10}`, name: `Dancer ${index + 1}`, color: null },
    role: null,
  }));
}

test('cannot add to a full cast', async () => {
  vi.mocked(fetchCast).mockResolvedValue(castOf(CAST_MAX_SIZE));
  renderCast();
  expect(await screen.findByRole('button', { name: 'Add' })).toBeDisabled();
});

test('says why a full cast cannot take more dancers', async () => {
  vi.mocked(fetchCast).mockResolvedValue(castOf(CAST_MAX_SIZE));
  renderCast();
  expect(await screen.findByText(/holds up to 40 dancers/)).toBeInTheDocument();
});

test('can add to a cast one short of full', async () => {
  vi.mocked(fetchCast).mockResolvedValue(castOf(CAST_MAX_SIZE - 1));
  renderCast();
  expect(await screen.findByRole('button', { name: 'Add' })).toBeEnabled();
});

test('stops offering dancers once the cast fills up in the picker', async () => {
  vi.mocked(fetchCast).mockResolvedValue(castOf(CAST_MAX_SIZE - 1));
  renderCast();
  const user = await openPicker();
  await user.click(await screen.findByRole('button', { name: /Bia Lima/ }));
  expect(await screen.findByText(/holds up to 40 dancers/)).toBeInTheDocument();
});

async function editClara() {
  renderCast();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Edit Clara Souza' }));
  return user;
}

test('saves a new role', async () => {
  const user = await editClara();
  await user.clear(screen.getByLabelText('Role'));
  await user.type(screen.getByLabelText('Role'), 'Dulcinea');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(updateCastMember).toHaveBeenCalledWith('school-1', 'dance-1', 'cast-1', {
    role: 'Dulcinea',
  });
});

test('lists the new role once saved', async () => {
  const user = await editClara();
  await user.clear(screen.getByLabelText('Role'));
  await user.type(screen.getByLabelText('Role'), 'Dulcinea');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(await castNames()).toEqual(['CSClara SouzaDulcinea']);
});

test('saves an empty role as no role', async () => {
  const user = await editClara();
  await user.clear(screen.getByLabelText('Role'));
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(updateCastMember).toHaveBeenCalledWith('school-1', 'dance-1', 'cast-1', { role: null });
});

test('says when the role cannot be saved', async () => {
  vi.mocked(updateCastMember).mockRejectedValue(new Error('PATCH cast member answered 500'));
  const user = await editClara();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the role');
});

test('asks before removing a dancer from the cast', async () => {
  const user = await editClara();
  await user.click(screen.getByRole('button', { name: 'Remove' }));
  expect(screen.getByText('Remove Clara Souza from this dance?')).toBeInTheDocument();
});

test('keeps the dancer when the removal is not confirmed', async () => {
  const user = await editClara();
  await user.click(screen.getByRole('button', { name: 'Remove' }));
  await user.click(screen.getByRole('button', { name: 'Keep' }));
  expect(removeCastMember).not.toHaveBeenCalled();
});

test('removes the dancer from the cast once confirmed', async () => {
  const user = await editClara();
  await user.click(screen.getByRole('button', { name: 'Remove' }));
  await user.click(screen.getByRole('button', { name: 'Remove' }));
  expect(await screen.findByText(/No dancers in this dance yet/)).toBeInTheDocument();
});

test('says when the dancer cannot be removed', async () => {
  vi.mocked(removeCastMember).mockRejectedValue(new Error('DELETE cast member answered 500'));
  const user = await editClara();
  await user.click(screen.getByRole('button', { name: 'Remove' }));
  await user.click(screen.getByRole('button', { name: 'Remove' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not remove the dancer');
});

test('goes back to the cast without saving when closed', async () => {
  const user = await editClara();
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(await castNames()).toEqual(['CSClara SouzaKitri']);
});

test('colors a swatch by the dancer when coloring by dancer', async () => {
  renderCast('dancer');
  expect(await claraSwatch()).toHaveStyle({ '--swatch': 'var(--dancer-3)' });
});

test('colors a swatch by the role when coloring by role', async () => {
  renderCast('role');
  expect(await claraSwatch()).toHaveStyle({ '--swatch': 'var(--dancer-1)' });
});

test('shows the role legend when coloring by role', async () => {
  renderCast('role');
  expect(await screen.findByRole('list', { name: 'Role colors' })).toBeInTheDocument();
});

test('hides the role legend when coloring by dancer', async () => {
  renderCast('dancer');
  await screen.findByText('Clara Souza');
  expect(screen.queryByRole('list', { name: 'Role colors' })).not.toBeInTheDocument();
});

const openKitri = { ...claraAsKitri, dancer: null };

async function giveOpenSpot() {
  vi.mocked(fetchCast).mockResolvedValue([openKitri]);
  vi.mocked(updateCastMember).mockResolvedValue({ ...openKitri, dancer: bia });
  renderCast();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Edit open spot' }));
  await user.click(screen.getByRole('button', { name: 'Give to a dancer' }));
  return user;
}

test('offers to give only an open spot to a dancer', async () => {
  await editClara();
  expect(screen.queryByRole('button', { name: 'Give to a dancer' })).not.toBeInTheDocument();
});

test('offers the roster dancers who are not cast yet for an open spot', async () => {
  vi.mocked(fetchDancers).mockResolvedValue([bia]);
  await giveOpenSpot();
  const list = await screen.findByRole('list', { name: 'Dancers not in this dance' });
  expect(
    within(list)
      .getAllByRole('button')
      .map((button) => button.textContent),
  ).toEqual(['Bia LimaGive']);
});

test('gives the open spot to the picked dancer', async () => {
  const user = await giveOpenSpot();
  await user.click(await screen.findByRole('button', { name: /Bia Lima/ }));
  expect(updateCastMember).toHaveBeenCalledWith('school-1', 'dance-1', 'cast-1', {
    dancerId: 'dancer-2',
  });
});

test('lists the dancer in the spot once given', async () => {
  const user = await giveOpenSpot();
  await user.click(await screen.findByRole('button', { name: /Bia Lima/ }));
  expect(await castNames()).toEqual(['BLBia LimaKitri']);
});

test('keeps the spot open when giving is cancelled', async () => {
  const user = await giveOpenSpot();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(await castNames()).toEqual(['Open spotKitri']);
});

test('says when the spot cannot be given', async () => {
  const user = await giveOpenSpot();
  vi.mocked(updateCastMember).mockRejectedValue(new Error('PATCH cast member answered 409'));
  await user.click(await screen.findByRole('button', { name: /Bia Lima/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not give the spot to Bia Lima');
});
