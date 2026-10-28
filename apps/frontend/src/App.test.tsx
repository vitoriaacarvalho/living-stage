import { APP_NAME } from '@living-stage/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from './App.tsx';
import { fetchInvite, joinSchool, previewInvite } from './api/invites.ts';
import { createSchool, fetchSchools } from './api/schools.ts';
import { authClient } from './auth/client.ts';

vi.mock('./auth/client.ts', () => ({
  authClient: { useSession: vi.fn(), signOut: vi.fn() },
}));
vi.mock('./api/health.ts', () => ({
  fetchHealth: () => new Promise(() => {}),
}));
vi.mock('./api/schools.ts', () => ({ fetchSchools: vi.fn(), createSchool: vi.fn() }));
vi.mock('./api/invites.ts', () => ({
  fetchInvite: vi.fn(),
  createInvite: vi.fn(),
  previewInvite: vi.fn(),
  joinSchool: vi.fn(),
}));

const school = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };
const other = { id: 'school-2', name: 'Escola Bia', createdAt: '2026-10-16T12:00:00.000Z' };

function mockSession(state: { data: object | null; isPending: boolean }) {
  vi.mocked(authClient.useSession).mockReturnValue(state as never);
}

function signIn() {
  mockSession({ data: { user: { id: 'user-1', name: 'Ana' } }, isPending: false });
}

beforeEach(() => {
  vi.mocked(fetchSchools).mockReset();
  vi.mocked(createSchool).mockReset();
  vi.mocked(previewInvite).mockReset();
  vi.mocked(joinSchool).mockReset();
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
  sessionStorage.clear();
});

test('shows sign-in without a session', () => {
  mockSession({ data: null, isPending: false });
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
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

  test('lets a user with no school join one with a code', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Join a school' }));
    expect(screen.getByRole('heading', { name: 'Join a school' })).toBeInTheDocument();
  });

  test('opens the invite screen from inside the school', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([school]);
    vi.mocked(fetchInvite).mockResolvedValue(null);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Invite teachers' }));
    expect(screen.getByRole('heading', { name: 'Invite your team' })).toBeInTheDocument();
  });
});

describe('with several schools', () => {
  beforeEach(() => {
    signIn();
    vi.mocked(fetchSchools).mockResolvedValue([school, other]);
  });

  test('asks which school to go into', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Your schools' })).toBeInTheDocument();
  });

  test('goes into the picked school', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Escola Bia' }));
    expect(screen.getByRole('heading', { name: APP_NAME })).toBeInTheDocument();
  });

  test('goes back into the picked school after a reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Escola Bia' }));
    unmount();
    render(<App />);
    expect(await screen.findByText('Escola Bia')).toBeInTheDocument();
  });

  test('switches to another school from inside one', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Escola Ana' }));
    await user.click(screen.getByRole('button', { name: 'Your schools' }));
    await user.click(screen.getByRole('button', { name: 'Escola Bia' }));
    expect(screen.getByText('Escola Bia')).toBeInTheDocument();
  });

  test('lets the user sign out before picking', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});

describe('adding another school', () => {
  beforeEach(() => {
    signIn();
    vi.mocked(fetchSchools).mockResolvedValue([school]);
  });

  async function openAddSchool() {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Your schools' }));
    await user.click(screen.getByRole('button', { name: 'Add a school' }));
    return user;
  }

  test('offers to create a school', async () => {
    await openAddSchool();
    expect(screen.getByRole('heading', { name: 'Your school' })).toBeInTheDocument();
  });

  test('goes into the new school once it is created', async () => {
    vi.mocked(createSchool).mockResolvedValue(other);
    const user = await openAddSchool();
    await user.type(screen.getByLabelText('School name'), 'Escola Bia');
    await user.click(screen.getByRole('button', { name: 'Create school' }));
    expect(await screen.findByText('Escola Bia')).toBeInTheDocument();
  });

  test('lists the new school next to the others', async () => {
    vi.mocked(createSchool).mockResolvedValue(other);
    const user = await openAddSchool();
    await user.type(screen.getByLabelText('School name'), 'Escola Bia');
    await user.click(screen.getByRole('button', { name: 'Create school' }));
    await user.click(await screen.findByRole('button', { name: 'Your schools' }));
    expect(screen.getByRole('button', { name: 'Escola Ana' })).toBeInTheDocument();
  });

  test('goes back to the list of schools', async () => {
    const user = await openAddSchool();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Your schools' })).toBeInTheDocument();
  });
});

describe('arriving from a join link', () => {
  beforeEach(() => {
    signIn();
    window.history.replaceState(null, '', '/join/ABCD2345');
    vi.mocked(previewInvite).mockResolvedValue('Escola Ana');
  });

  test('shows the school of the invitation', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Join Escola Ana' })).toBeInTheDocument();
  });

  test('goes into the school once joined', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([]);
    vi.mocked(joinSchool).mockResolvedValue(school);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Join school' }));
    expect(await screen.findByRole('heading', { name: APP_NAME })).toBeInTheDocument();
  });

  test('leaves the join link once joined', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([]);
    vi.mocked(joinSchool).mockResolvedValue(school);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Join school' }));
    expect(window.location.pathname).toBe('/');
  });

  test('goes into the joined school when the user already has another', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([other]);
    vi.mocked(joinSchool).mockResolvedValue(school);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Join school' }));
    expect(await screen.findByText('Escola Ana')).toBeInTheDocument();
  });

  test('falls back to the usual screen when dismissed', async () => {
    vi.mocked(fetchSchools).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(screen.getByRole('heading', { name: 'Your school' })).toBeInTheDocument();
  });
});
