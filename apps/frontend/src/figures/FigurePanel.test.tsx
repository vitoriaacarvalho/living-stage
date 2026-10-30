import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FigurePanel } from './FigurePanel.tsx';

const entrance = { id: 'figure-1', order: 0, name: 'Entrance', positions: [] };

function renderPanel(onRename = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) {
  render(<FigurePanel figure={entrance} label="Entrance" onRename={onRename} onClose={onClose} />);
  return { onRename, onClose, user: userEvent.setup() };
}

async function saveName(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.clear(screen.getByLabelText('Name'));
  if (name) await user.type(screen.getByLabelText('Name'), name);
  await user.click(screen.getByRole('button', { name: 'Save' }));
}

test('starts with the figure name', () => {
  renderPanel();
  expect(screen.getByLabelText('Name')).toHaveValue('Entrance');
});

test('saves a new name', async () => {
  const { onRename, user } = renderPanel();
  await saveName(user, 'Finale');
  expect(onRename).toHaveBeenCalledWith('Finale');
});

test('saves an empty name as no name', async () => {
  const { onRename, user } = renderPanel();
  await saveName(user, '');
  expect(onRename).toHaveBeenCalledWith(null);
});

test('closes once the name is saved', async () => {
  const { onClose, user } = renderPanel();
  await saveName(user, 'Finale');
  expect(onClose).toHaveBeenCalled();
});

test('says when the name cannot be saved', async () => {
  const { user } = renderPanel(vi.fn().mockRejectedValue(new Error('PATCH figure answered 500')));
  await saveName(user, 'Finale');
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the name');
});

test('stays open when the name cannot be saved', async () => {
  const { onClose, user } = renderPanel(
    vi.fn().mockRejectedValue(new Error('PATCH figure answered 500')),
  );
  await saveName(user, 'Finale');
  await screen.findByRole('alert');
  expect(onClose).not.toHaveBeenCalled();
});
