import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { FigurePanel, type FigureActions } from './FigurePanel.tsx';

const entrance = {
  id: 'figure-1',
  order: 0,
  name: 'Entrance',
  transitionMs: 4000,
  timeMs: null,
  positions: [],
  paths: [],
};
const finale = {
  id: 'figure-2',
  order: 1,
  name: 'Finale',
  transitionMs: 6500,
  timeMs: null,
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
      dance={{ figures: [entrance, finale], songMs: null }}
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
      dance={{ figures: [entrance], songMs: null }}
      actions={{ save: vi.fn(), remove: vi.fn() }}
      onClose={vi.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
});

describe('on a dance with a song', () => {
  const pinned = [
    { ...entrance, timeMs: 0 },
    { ...finale, timeMs: 58_000 },
    { ...finale, id: 'figure-3', order: 2, name: 'Bow', timeMs: 90_000 },
  ];

  function renderPinned(figure = pinned[1]!) {
    const actions = {
      save: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    render(
      <FigurePanel
        figure={figure}
        dance={{ figures: pinned, songMs: 220_000 }}
        actions={actions}
        onClose={() => {}}
      />,
    );
    return { actions, user: userEvent.setup() };
  }

  async function reachAt(user: ReturnType<typeof userEvent.setup>, text: string) {
    await user.clear(screen.getByLabelText('Reached at'));
    await user.type(screen.getByLabelText('Reached at'), text);
    await user.click(screen.getByRole('button', { name: 'Save' }));
  }

  test('shows the moment the figure is reached', () => {
    renderPinned();
    expect(screen.getByLabelText('Reached at')).toHaveValue('0:58');
  });

  test('offers no time to arrive', () => {
    renderPinned();
    expect(screen.queryByLabelText('Time to arrive')).not.toBeInTheDocument();
  });

  test('says between which moments it can go', () => {
    renderPinned();
    expect(screen.getByText('The moment in the song, between 0:01 and 1:29.')).toBeInTheDocument();
  });

  test('saves a new moment', async () => {
    const { actions, user } = renderPinned();
    await reachAt(user, '1:05');
    expect(actions.save).toHaveBeenCalledWith({ name: 'Finale', timeMs: 65_000 });
  });

  test('leaves the moment alone when it is not changed', async () => {
    const { actions, user } = renderPinned();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(actions.save).toHaveBeenCalledWith({ name: 'Finale' });
  });

  test('takes no moment past the next figure', async () => {
    const { actions, user } = renderPinned();
    await reachAt(user, '1:30');
    expect(actions.save).not.toHaveBeenCalled();
  });

  test('says which moments it takes', async () => {
    const { user } = renderPinned();
    await reachAt(user, '1:30');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Type a time between 0:01 and 1:29, as m:ss.',
    );
  });

  test('lets the first figure start the song', async () => {
    const { actions, user } = renderPinned(pinned[0]);
    await reachAt(user, '0:03');
    expect(actions.save).toHaveBeenCalledWith({ name: 'Entrance', timeMs: 3000 });
  });
});
