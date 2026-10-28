import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDance, fetchDances, updateDance } from '../api/dances.ts';
import { DanceList } from './DanceList.tsx';

vi.mock('../api/dances.ts', () => ({
  fetchDances: vi.fn(),
  createDance: vi.fn(),
  updateDance: vi.fn(),
}));

const kitri = { id: 'dance-1', title: 'Kitri variation', createdAt: '2026-10-20T12:00:00.000Z' };
const waltz = {
  id: 'dance-2',
  title: 'Waltz of the flowers',
  createdAt: '2026-10-27T12:00:00.000Z',
};

beforeEach(() => {
  vi.mocked(fetchDances).mockReset().mockResolvedValue([kitri]);
  vi.mocked(createDance).mockReset();
  vi.mocked(updateDance).mockReset();
});

async function cards() {
  const list = await screen.findByRole('list', { name: 'Dances' });
  return within(list)
    .getAllByRole('heading')
    .map((heading) => heading.textContent);
}

async function openForm() {
  const user = userEvent.setup();
  render(<DanceList schoolId="school-1" />);
  await user.click(await screen.findByRole('button', { name: 'New dance' }));
  return user;
}

describe('listing', () => {
  test('shows each dance with the day it was added', async () => {
    render(<DanceList schoolId="school-1" />);
    const list = await screen.findByRole('list', { name: 'Dances' });
    expect(list).toHaveTextContent('Kitri variationAdded 20 Oct 2026');
  });

  test('loads the dances of this school', async () => {
    render(<DanceList schoolId="school-1" />);
    await screen.findByRole('list', { name: 'Dances' });
    expect(fetchDances).toHaveBeenCalledWith('school-1', expect.any(AbortSignal));
  });

  test('says so when there are no dances yet', async () => {
    vi.mocked(fetchDances).mockResolvedValue([]);
    render(<DanceList schoolId="school-1" />);
    expect(await screen.findByText(/No dances yet/)).toBeInTheDocument();
  });

  test('says so when the dances cannot be loaded', async () => {
    vi.mocked(fetchDances).mockRejectedValue(new Error('GET dances answered 500'));
    render(<DanceList schoolId="school-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the dances.');
  });
});

describe('creating', () => {
  test('puts the new dance first', async () => {
    vi.mocked(createDance).mockResolvedValue(waltz);
    const user = await openForm();
    await user.type(screen.getByLabelText('Title'), 'Waltz of the flowers');
    await user.click(screen.getByRole('button', { name: 'Create dance' }));
    expect(await cards()).toEqual(['Waltz of the flowers', 'Kitri variation']);
  });

  test('creates the dance in this school with a trimmed title', async () => {
    vi.mocked(createDance).mockResolvedValue(waltz);
    const user = await openForm();
    await user.type(screen.getByLabelText('Title'), '  Waltz of the flowers ');
    await user.click(screen.getByRole('button', { name: 'Create dance' }));
    expect(createDance).toHaveBeenCalledWith('school-1', { title: 'Waltz of the flowers' });
  });

  test('closes the form once the dance is created', async () => {
    vi.mocked(createDance).mockResolvedValue(waltz);
    const user = await openForm();
    await user.type(screen.getByLabelText('Title'), 'Waltz of the flowers');
    await user.click(screen.getByRole('button', { name: 'Create dance' }));
    expect(await screen.findByRole('button', { name: 'New dance' })).toBeInTheDocument();
  });

  test('asks for a title instead of sending a blank one', async () => {
    const user = await openForm();
    await user.type(screen.getByLabelText('Title'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create dance' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Give the dance a title.');
  });

  test('keeps the form open when the dance cannot be created', async () => {
    vi.mocked(createDance).mockRejectedValue(new Error('POST dance answered 500'));
    const user = await openForm();
    await user.type(screen.getByLabelText('Title'), 'Waltz of the flowers');
    await user.click(screen.getByRole('button', { name: 'Create dance' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the dance.');
  });

  test('cancels without creating', async () => {
    const user = await openForm();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('form', { name: 'New dance' })).not.toBeInTheDocument();
  });
});

describe('renaming', () => {
  async function openRename() {
    const user = userEvent.setup();
    render(<DanceList schoolId="school-1" />);
    await user.click(await screen.findByRole('button', { name: 'Rename Kitri variation' }));
    return user;
  }

  test('starts from the current title', async () => {
    await openRename();
    expect(screen.getByLabelText('Title')).toHaveValue('Kitri variation');
  });

  test('shows the new title on the card', async () => {
    vi.mocked(updateDance).mockResolvedValue({ ...kitri, title: 'Kitri, act I' });
    const user = await openRename();
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Kitri, act I');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await cards()).toEqual(['Kitri, act I']);
  });

  test('saves the trimmed title of this dance in this school', async () => {
    vi.mocked(updateDance).mockResolvedValue({ ...kitri, title: 'Kitri, act I' });
    const user = await openRename();
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), ' Kitri, act I ');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateDance).toHaveBeenCalledWith('school-1', { ...kitri, title: 'Kitri, act I' });
  });

  test('keeps the form open when the dance cannot be renamed', async () => {
    vi.mocked(updateDance).mockRejectedValue(new Error('PUT dance answered 500'));
    const user = await openRename();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not rename the dance.');
  });

  test('hides New dance while renaming', async () => {
    await openRename();
    expect(screen.queryByRole('button', { name: 'New dance' })).not.toBeInTheDocument();
  });

  test('cancels without renaming', async () => {
    const user = await openRename();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await cards()).toEqual(['Kitri variation']);
  });
});
