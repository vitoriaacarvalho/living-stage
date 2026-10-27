import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { DancerForm } from './DancerForm.tsx';

function renderNewDancerForm(add = vi.fn()) {
  const actions = { add, save: vi.fn(), remove: vi.fn() };
  render(<DancerForm dancer={null} actions={actions} onClose={vi.fn()} />);
  return actions;
}

test('asks for a name instead of saving a blank one', async () => {
  const user = userEvent.setup();
  const actions = renderNewDancerForm();
  await user.type(screen.getByLabelText('Name'), '   ');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(actions.add).not.toHaveBeenCalled();
});

test('says the name is missing', async () => {
  const user = userEvent.setup();
  renderNewDancerForm();
  await user.type(screen.getByLabelText('Name'), '   ');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Give the dancer a name.');
});

test('starts a new dancer with no color', () => {
  renderNewDancerForm();
  expect(screen.getByRole('button', { name: 'No color', pressed: true })).toBeInTheDocument();
});

test('offers the twelve dancer colors and no color', () => {
  renderNewDancerForm();
  const group = screen.getByRole('group', { name: 'Default color' });
  expect(group.querySelectorAll('button')).toHaveLength(13);
});

test('does not offer to remove a dancer that is not saved yet', () => {
  renderNewDancerForm();
  expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
});

test('says so when the dancer cannot be saved', async () => {
  const user = userEvent.setup();
  renderNewDancerForm(vi.fn().mockRejectedValue(new Error('POST dancer answered 500')));
  await user.type(screen.getByLabelText('Name'), 'Carla');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the dancer.');
});
