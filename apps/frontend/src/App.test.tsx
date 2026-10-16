import { APP_NAME } from '@living-stage/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from './App.tsx';
import { createSchool, fetchSchools } from './api/schools.ts';
import { authClient } from './auth/client.ts';

vi.mock('./auth/client.ts', () => ({
  authClient: { useSession: vi.fn(), signOut: vi.fn() },
}));
vi.mock('./api/health.ts', () => ({
  fetchHealth: () => new Promise(() => {}),
}));
vi.mock('./api/schools.ts', () => ({ fetchSchools: vi.fn(), createSchool: vi.fn() }));

const school = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };

function mockSession(state: { data: object | null; isPending: boolean }) {
  vi.mocked(authClient.useSession).mockReturnValue(state as never);
}

function signIn() {
  mockSession({ data: { user: { id: 'user-1', name: 'Ana' } }, isPending: false });
}

beforeEach(() => {
  vi.mocked(fetchSchools).mockReset();
  vi.mocked(createSchool).mockReset();
});

test('shows sign-in without a session', () => {
  mockSession({ data: null, isPending: false });
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
});

test('shows nothing while the session loads', () => {
  mockSession({ data: null, isPending: true });
  const { container } = render(<App />);
  expect(container).toBeEmptyDOMElement();
});

describe('signed in', () => {
  beforeEach(signIn);

  test('shows nothing while the schools load', () => {
    vi.mocked(fetchSchools).mockReturnValue(new Promise(() => {}));
    const { container } = render(<App />);
    expect(container).toBeEmptyDOMElement();
  });

  test('asks a user with no school to create one', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Your school' })).toBeInTheDocument();
  });

  test('lets a user with no school sign out', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  test('goes into the school once it is created', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([]);
    vi.mocked(createSchool).mockResolvedValue(school);
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText('School name'), 'Escola Ana');
    await user.click(screen.getByRole('button', { name: 'Create school' }));
    expect(await screen.findByText('Escola Ana')).toBeInTheDocument();
  });

  test('goes straight into the school of a user who has one', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([school]);
    render(<App />);
    expect(await screen.findByText('Escola Ana')).toBeInTheDocument();
  });

  test('shows the app heading inside the school', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([school]);
    render(<App />);
    expect(await screen.findByRole('heading', { name: APP_NAME })).toBeInTheDocument();
  });

  test('shows the signed-in user inside the school', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([school]);
    render(<App />);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
  });

  test('says so when the schools cannot be loaded', async () => {
    vi.mocked(fetchSchools).mockRejectedValue(new Error('GET /api/schools answered 500'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your schools.');
  });
});
