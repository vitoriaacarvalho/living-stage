import { APP_NAME } from '@living-stage/shared';
import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { App } from './App.tsx';
import { authClient } from './auth/client.ts';

vi.mock('./auth/client.ts', () => ({
  authClient: { useSession: vi.fn() },
}));
vi.mock('./api/health.ts', () => ({
  fetchHealth: () => new Promise(() => {}),
}));

function mockSession(state: { data: object | null; isPending: boolean }) {
  vi.mocked(authClient.useSession).mockReturnValue(state as never);
}

test('shows sign-in without a session', () => {
  mockSession({ data: null, isPending: false });
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Entre na sua conta' })).toBeInTheDocument();
});

test('shows the app with a session', () => {
  mockSession({ data: { user: { id: 'user-1' } }, isPending: false });
  render(<App />);
  expect(screen.getByRole('heading', { name: APP_NAME })).toBeInTheDocument();
});

test('shows nothing while the session loads', () => {
  mockSession({ data: null, isPending: true });
  const { container } = render(<App />);
  expect(container).toBeEmptyDOMElement();
});
