import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { createSchool } from '../api/schools.ts';
import { CreateSchoolForm } from './CreateSchoolForm.tsx';

vi.mock('../api/schools.ts', () => ({ createSchool: vi.fn() }));

const school = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };

beforeEach(() => {
  vi.mocked(createSchool).mockReset();
  vi.mocked(createSchool).mockResolvedValue(school);
});

async function submit(name: string, onCreated = vi.fn()) {
  const user = userEvent.setup();
  render(<CreateSchoolForm onCreated={onCreated} />);
  await user.type(screen.getByLabelText('School name'), name);
  await user.click(screen.getByRole('button', { name: 'Create school' }));
  return onCreated;
}

test('sends the name without surrounding spaces', async () => {
  await submit('  Escola Ana  ');
  expect(createSchool).toHaveBeenCalledWith({ name: 'Escola Ana' });
});

test('hands the new school on', async () => {
  const onCreated = await submit('Escola Ana');
  expect(onCreated).toHaveBeenCalledWith(school);
});

test('asks for a name when it is only spaces', async () => {
  await submit('   ');
  expect(screen.getByRole('alert')).toHaveTextContent('Give your school a name.');
});

test('does not send a name of only spaces', async () => {
  await submit('   ');
  expect(createSchool).not.toHaveBeenCalled();
});

test('shows a message when creating fails', async () => {
  vi.mocked(createSchool).mockRejectedValue(new Error('POST /api/schools answered 500'));
  await submit('Escola Ana');
  expect(screen.getByRole('alert')).toHaveTextContent('Could not create the school. Try again.');
});

test('keeps the name when creating fails', async () => {
  vi.mocked(createSchool).mockRejectedValue(new Error('POST /api/schools answered 500'));
  await submit('Escola Ana');
  expect(screen.getByLabelText('School name')).toHaveValue('Escola Ana');
});

test('lets the user try again after a failure', async () => {
  vi.mocked(createSchool).mockRejectedValue(new Error('POST /api/schools answered 500'));
  await submit('Escola Ana');
  expect(screen.getByRole('button', { name: 'Create school' })).toBeEnabled();
});

test('disables the button while the school is created', async () => {
  vi.mocked(createSchool).mockReturnValue(new Promise(() => {}));
  await submit('Escola Ana');
  expect(screen.getByRole('button', { name: 'Create school' })).toBeDisabled();
});

test('limits the name to the maximum length', () => {
  render(<CreateSchoolForm onCreated={vi.fn()} />);
  expect(screen.getByLabelText('School name')).toHaveAttribute('maxlength', '100');
});
