import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { SchoolPicker } from './SchoolPicker.tsx';

const ana = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };
const bia = { id: 'school-2', name: 'Escola Bia', createdAt: '2026-10-16T12:00:00.000Z' };

test('lists every school', () => {
  render(<SchoolPicker schools={[ana, bia]} currentId={null} onPick={() => {}} />);
  const names = screen.getAllByRole('button').map((button) => button.textContent);
  expect(names).toEqual(['Escola Ana', 'Escola Bia']);
});

test('picks the school that was tapped', async () => {
  const onPick = vi.fn();
  render(<SchoolPicker schools={[ana, bia]} currentId={null} onPick={onPick} />);
  await userEvent.click(screen.getByRole('button', { name: 'Escola Bia' }));
  expect(onPick).toHaveBeenCalledWith(bia);
});

test('marks the current school', () => {
  render(<SchoolPicker schools={[ana, bia]} currentId="school-2" onPick={() => {}} />);
  expect(screen.getByRole('button', { current: true })).toHaveTextContent('Escola Bia');
});

test('marks no school when none is current', () => {
  render(<SchoolPicker schools={[ana, bia]} currentId={null} onPick={() => {}} />);
  expect(screen.queryByRole('button', { current: true })).not.toBeInTheDocument();
});
