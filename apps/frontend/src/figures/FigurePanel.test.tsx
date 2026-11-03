import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FigurePanel, type FigureActions } from './FigurePanel.tsx';

const entrance = { id: 'figure-1', order: 0, name: 'Entrance', positions: [] };
const finale = { id: 'figure-2', order: 1, name: 'Finale', positions: [] };
const failing = () => vi.fn().mockRejectedValue(new Error('figure request answered 500'));

function renderPanel(changes: Partial<FigureActions> = {}) {
  const actions = {
    rename: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    ...changes,
  };
  const onClose = vi.fn();
  render(
    <FigurePanel
      figure={entrance}
      figures={[entrance, finale]}
      actions={actions}
      onClose={onClose}
    />,
  );
  return { actions, onClose, user: userEvent.setup() };
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
  const { actions, user } = renderPanel();
  await saveName(user, 'Opening');
  expect(actions.rename).toHaveBeenCalledWith('Opening');
});

test('saves an empty name as no name', async () => {
  const { actions, user } = renderPanel();
  await saveName(user, '');
  expect(actions.rename).toHaveBeenCalledWith(null);
});

test('closes once the name is saved', async () => {
  const { onClose, user } = renderPanel();
  await saveName(user, 'Opening');
  expect(onClose).toHaveBeenCalled();
});

test('says when the name cannot be saved', async () => {
  const { user } = renderPanel({ rename: failing() });
  await saveName(user, 'Opening');
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the name');
});

test('stays open when the name cannot be saved', async () => {
  const { onClose, user } = renderPanel({ rename: failing() });
  await saveName(user, 'Opening');
  await screen.findByRole('alert');
  expect(onClose).not.toHaveBeenCalled();
});

async function askToDelete() {
  const panel = renderPanel();
  await panel.user.click(screen.getByRole('button', { name: 'Delete' }));
  return panel;
}

test('asks before deleting a figure', async () => {
  await askToDelete();
  expect(screen.getByText('Delete Entrance and its positions?')).toBeInTheDocument();
});

test('keeps the figure when the delete is not confirmed', async () => {
  const { actions, user } = await askToDelete();
  await user.click(screen.getByRole('button', { name: 'Keep' }));
  expect(actions.remove).not.toHaveBeenCalled();
});

test('deletes the figure once confirmed', async () => {
  const { actions, user } = await askToDelete();
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(actions.remove).toHaveBeenCalled();
});

test('says when the figure cannot be deleted', async () => {
  const panel = renderPanel({ remove: failing() });
  await panel.user.click(screen.getByRole('button', { name: 'Delete' }));
  await panel.user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete the figure');
});

test('offers no delete for the only figure of the dance', () => {
  render(
    <FigurePanel
      figure={entrance}
      figures={[entrance]}
      actions={{ rename: vi.fn(), remove: vi.fn() }}
      onClose={vi.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
});
