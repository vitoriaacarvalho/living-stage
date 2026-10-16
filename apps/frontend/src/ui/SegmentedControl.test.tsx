import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl.tsx';

const options = [
  { value: 'name', label: 'Name' },
  { value: 'role', label: 'Role' },
  { value: 'both', label: 'Both' },
] as const;

function renderLabels(onChange = vi.fn()) {
  render(<SegmentedControl label="Labels" options={options} value="role" onChange={onChange} />);
  return onChange;
}

test('is a group named by its label', () => {
  renderLabels();
  expect(screen.getByRole('group', { name: 'Labels' })).toBeInTheDocument();
});

test('shows one button per option', () => {
  renderLabels();
  expect(screen.getAllByRole('button')).toHaveLength(3);
});

test('marks the selected option as pressed', () => {
  renderLabels();
  expect(screen.getByRole('button', { name: 'Role' })).toHaveAttribute('aria-pressed', 'true');
});

test('marks the other options as not pressed', () => {
  renderLabels();
  expect(screen.getByRole('button', { name: 'Name' })).toHaveAttribute('aria-pressed', 'false');
});

test('reports the option the user picks', async () => {
  const onChange = renderLabels();
  await userEvent.click(screen.getByRole('button', { name: 'Both' }));
  expect(onChange).toHaveBeenCalledWith('both');
});
