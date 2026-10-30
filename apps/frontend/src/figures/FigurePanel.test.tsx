import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FigurePanel, type FigureActions } from './FigurePanel.tsx';

const entrance = { id: 'figure-1', order: 0, name: 'Entrance', positions: [] };
const finale = { id: 'figure-2', order: 1, name: 'Finale', positions: [] };
const failing = () => vi.fn().mockRejectedValue(new Error('figure request answered 500'));

function renderPanel(changes: Partial<FigureActions> = {}, figure = entrance) {
  const actions = {
    rename: vi.fn().mockResolvedValue(undefined),
    move: vi.fn().mockResolvedValue(undefined),
    ...changes,
  };
  const onClose = vi.fn();
  render(
    <FigurePanel
      figure={figure}
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

test('moves the figure later', async () => {
  const { actions, user } = renderPanel();
  await user.click(screen.getByRole('button', { name: 'Move later' }));
  expect(actions.move).toHaveBeenCalledWith(1);
});

test('moves the figure earlier', async () => {
  const { actions, user } = renderPanel({}, finale);
  await user.click(screen.getByRole('button', { name: 'Move earlier' }));
  expect(actions.move).toHaveBeenCalledWith(-1);
});

test('stays open after moving, to move again', async () => {
  const { onClose, user } = renderPanel();
  await user.click(screen.getByRole('button', { name: 'Move later' }));
  expect(onClose).not.toHaveBeenCalled();
});

test('cannot move the first figure earlier', () => {
  renderPanel();
  expect(screen.getByRole('button', { name: 'Move earlier' })).toBeDisabled();
});

test('cannot move the last figure later', () => {
  renderPanel({}, finale);
  expect(screen.getByRole('button', { name: 'Move later' })).toBeDisabled();
});

test('says when the figure cannot be moved', async () => {
  const { user } = renderPanel({ move: failing() });
  await user.click(screen.getByRole('button', { name: 'Move later' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not move the figure');
});
