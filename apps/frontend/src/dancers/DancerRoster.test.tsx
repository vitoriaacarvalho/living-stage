import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDancer, deleteDancer, fetchDancers, updateDancer } from '../api/dancers.ts';
import { DancerRoster } from './DancerRoster.tsx';

vi.mock('../api/dancers.ts', () => ({
  fetchDancers: vi.fn(),
  createDancer: vi.fn(),
  updateDancer: vi.fn(),
  deleteDancer: vi.fn(),
}));

const school = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };
const bia = { id: 'dancer-1', name: 'Bia Lima', color: 4 };
const julia = { id: 'dancer-2', name: 'Júlia', color: 8 };

beforeEach(() => {
  vi.mocked(fetchDancers).mockReset().mockResolvedValue([bia, julia]);
  vi.mocked(createDancer).mockReset();
  vi.mocked(updateDancer).mockReset();
  vi.mocked(deleteDancer).mockReset();
});

function renderRoster(onDone = vi.fn()) {
  render(<DancerRoster school={school} onDone={onDone} />);
  return onDone;
}

async function names() {
  const list = await screen.findByRole('list', { name: 'Dancers' });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('listing', () => {
  test('shows each dancer with her color', async () => {
    renderRoster();
    expect(await names()).toEqual(['BLBia LimaTeal', 'JJúliaChestnut']);
  });

  test('loads the dancers of this school', async () => {
    renderRoster();
    await screen.findByRole('list', { name: 'Dancers' });
    expect(fetchDancers).toHaveBeenCalledWith('school-1', expect.any(AbortSignal));
  });

  test('says so when there are no dancers yet', async () => {
    vi.mocked(fetchDancers).mockResolvedValue([]);
    renderRoster();
    expect(await screen.findByText(/No dancers yet/)).toBeInTheDocument();
  });

  test('says so when the dancers cannot be loaded', async () => {
    vi.mocked(fetchDancers).mockRejectedValue(new Error('GET dancers answered 500'));
    renderRoster();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the dancers.');
  });

  test('goes back', async () => {
    const user = userEvent.setup();
    const onDone = renderRoster();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onDone).toHaveBeenCalled();
  });
});

describe('adding', () => {
  test('adds the dancer in name order', async () => {
    const user = userEvent.setup();
    vi.mocked(createDancer).mockResolvedValue({ id: 'dancer-3', name: 'Carla', color: null });
    renderRoster();
    await user.click(await screen.findByRole('button', { name: 'Add dancer' }));
    await user.type(screen.getByLabelText('Name'), 'Carla');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await names()).toEqual(['BLBia LimaTeal', 'CCarlaNo color', 'JJúliaChestnut']);
  });

  test('sends the name and the picked color', async () => {
    const user = userEvent.setup();
    vi.mocked(createDancer).mockResolvedValue({ id: 'dancer-3', name: 'Carla', color: 2 });
    renderRoster();
    await user.click(await screen.findByRole('button', { name: 'Add dancer' }));
    await user.type(screen.getByLabelText('Name'), ' Carla ');
    await user.click(screen.getByRole('button', { name: 'Amber' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(createDancer).toHaveBeenCalledWith('school-1', { name: 'Carla', color: 2 });
  });
});

describe('editing', () => {
  test('starts from the current name and color', async () => {
    const user = userEvent.setup();
    renderRoster();
    await user.click(await screen.findByRole('button', { name: 'Edit Júlia' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Júlia');
    expect(screen.getByRole('button', { name: 'Chestnut', pressed: true })).toBeInTheDocument();
  });

  test('shows the saved changes', async () => {
    const user = userEvent.setup();
    vi.mocked(updateDancer).mockResolvedValue({ ...julia, color: null });
    renderRoster();
    await user.click(await screen.findByRole('button', { name: 'Edit Júlia' }));
    await user.click(screen.getByRole('button', { name: 'No color' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await names()).toEqual(['BLBia LimaTeal', 'JJúliaNo color']);
  });

  test('saves the dancer that was edited', async () => {
    const user = userEvent.setup();
    vi.mocked(updateDancer).mockResolvedValue({ ...julia, name: 'Júlia Castro' });
    renderRoster();
    await user.click(await screen.findByRole('button', { name: 'Edit Júlia' }));
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Júlia Castro');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateDancer).toHaveBeenCalledWith('school-1', { ...julia, name: 'Júlia Castro' });
  });

  test('closes the form without saving on cancel', async () => {
    const user = userEvent.setup();
    renderRoster();
    await user.click(await screen.findByRole('button', { name: 'Edit Júlia' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });
});

describe('removing', () => {
  test('asks before removing', async () => {
    const user = userEvent.setup();
    renderRoster();
    await user.click(await screen.findByRole('button', { name: 'Edit Júlia' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByText('Remove Júlia from the roster?')).toBeInTheDocument();
  });

  test('keeps the dancer when the removal is not confirmed', async () => {
    const user = userEvent.setup();
    renderRoster();
    await user.click(await screen.findByRole('button', { name: 'Edit Júlia' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(deleteDancer).not.toHaveBeenCalled();
  });

  test('takes the dancer off the list once confirmed', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteDancer).mockResolvedValue();
    renderRoster();
    await user.click(await screen.findByRole('button', { name: 'Edit Júlia' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await names()).toEqual(['BLBia LimaTeal']);
  });

  test('says so when the dancer cannot be removed', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteDancer).mockRejectedValue(new Error('DELETE dancer answered 500'));
    renderRoster();
    await user.click(await screen.findByRole('button', { name: 'Edit Júlia' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not remove the dancer.');
  });
});

describe('searching', () => {
  test('shows only the dancers whose name matches', async () => {
    const user = userEvent.setup();
    renderRoster();
    await user.type(await screen.findByLabelText('Search by name'), 'julia');
    expect(await names()).toEqual(['JJúliaChestnut']);
  });

  test('says so when no dancer matches', async () => {
    const user = userEvent.setup();
    renderRoster();
    await user.type(await screen.findByLabelText('Search by name'), 'Carla');
    expect(screen.getByText('No dancers match “Carla”.')).toBeInTheDocument();
  });

  test('hides the search while the roster is empty', async () => {
    vi.mocked(fetchDancers).mockResolvedValue([]);
    renderRoster();
    await screen.findByText(/No dancers yet/);
    expect(screen.queryByLabelText('Search by name')).not.toBeInTheDocument();
  });
});

test('sorts the dancers by name whatever order they arrive in', async () => {
  vi.mocked(fetchDancers).mockResolvedValue([julia, bia]);
  renderRoster();
  expect(await names()).toEqual(['BLBia LimaTeal', 'JJúliaChestnut']);
});
