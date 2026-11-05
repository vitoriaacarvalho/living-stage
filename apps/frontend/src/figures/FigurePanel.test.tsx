import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FigurePanel, type FigureActions } from './FigurePanel.tsx';

const entrance = {
  id: 'figure-1',
  order: 0,
  name: 'Entrance',
  transitionMs: 4000,
  positions: [],
  paths: [],
};
const finale = {
  id: 'figure-2',
  order: 1,
  name: 'Finale',
  transitionMs: 6500,
  positions: [],
  paths: [],
};
const failing = () => vi.fn().mockRejectedValue(new Error('figure request answered 500'));

function renderPanel(changes: Partial<FigureActions> = {}, figure = entrance) {
  const actions = {
    save: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
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
  expect(actions.save).toHaveBeenCalledWith({ name: 'Opening' });
});

test('saves an empty name as no name', async () => {
  const { actions, user } = renderPanel();
  await saveName(user, '');
  expect(actions.save).toHaveBeenCalledWith({ name: null });
});

test('closes once the name is saved', async () => {
  const { onClose, user } = renderPanel();
  await saveName(user, 'Opening');
  expect(onClose).toHaveBeenCalled();
});

test('says when the name cannot be saved', async () => {
  const { user } = renderPanel({ save: failing() });
  await saveName(user, 'Opening');
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the figure');
});

test('stays open when the name cannot be saved', async () => {
  const { onClose, user } = renderPanel({ save: failing() });
  await saveName(user, 'Opening');
  await screen.findByRole('alert');
  expect(onClose).not.toHaveBeenCalled();
});

async function saveTime(user: ReturnType<typeof userEvent.setup>, seconds: string) {
  await user.clear(screen.getByLabelText('Time to arrive'));
  await user.type(screen.getByLabelText('Time to arrive'), seconds);
  await user.click(screen.getByRole('button', { name: 'Save' }));
}

test('asks for no time to arrive on the first figure', () => {
  renderPanel();
  expect(screen.queryByLabelText('Time to arrive')).not.toBeInTheDocument();
});

test("starts with the figure's time to arrive in seconds", () => {
  renderPanel({}, finale);
  expect(screen.getByLabelText('Time to arrive')).toHaveValue('6.5');
});

test('says which figure the time is counted from', () => {
  renderPanel({}, finale);
  expect(screen.getByText(/from Entrance/)).toBeInTheDocument();
});

test('saves a new time to arrive with the name', async () => {
  const { actions, user } = renderPanel({}, finale);
  await saveTime(user, '8');
  expect(actions.save).toHaveBeenCalledWith({ name: 'Finale', transitionMs: 8000 });
});

test('saves a time written with a comma', async () => {
  const { actions, user } = renderPanel({}, finale);
  await saveTime(user, '2,5');
  expect(actions.save).toHaveBeenCalledWith({ name: 'Finale', transitionMs: 2500 });
});

test('says when the time is out of range', async () => {
  const { user } = renderPanel({}, finale);
  await saveTime(user, '45');
  expect(screen.getByRole('alert')).toHaveTextContent('1 to 30 seconds');
});

test('saves nothing when the time is out of range', async () => {
  const { actions, user } = renderPanel({}, finale);
  await saveTime(user, '45');
  expect(actions.save).not.toHaveBeenCalled();
});

test('stays open when the time is out of range', async () => {
  const { onClose, user } = renderPanel({}, finale);
  await saveTime(user, '45');
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
      actions={{ save: vi.fn(), remove: vi.fn() }}
      onClose={vi.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
});
