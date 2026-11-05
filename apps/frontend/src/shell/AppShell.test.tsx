import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { AppShell, type Section } from './AppShell.tsx';

vi.mock('../auth/client.ts', () => ({ authClient: { signOut: vi.fn() } }));

function renderShell(current: Section = 'home') {
  const onGo = vi.fn();
  const onSwitch = vi.fn();
  render(
    <AppShell
      nav={{ current, onGo }}
      account={{ userName: 'Marina Souto', schoolName: 'Escola Aurora', onSwitch }}
    >
      <p>Page</p>
    </AppShell>,
  );
  return { onGo, onSwitch, user: userEvent.setup() };
}

const accountButton = () => screen.getByRole('button', { name: /^Account/ });

test('shows the page inside', () => {
  renderShell();
  expect(screen.getByText('Page')).toBeInTheDocument();
});

test('lists the destinations in order', () => {
  renderShell();
  const nav = screen.getByRole('navigation', { name: 'Main' });
  const items = [...nav.querySelectorAll('li button')].map((button) => button.textContent);
  expect(items).toEqual(['Home', 'Dancers', 'Team']);
});

test('marks the current destination', () => {
  renderShell('team');
  expect(screen.getByRole('button', { name: 'Team' })).toHaveAttribute('aria-current', 'page');
});

test('marks no other destination', () => {
  renderShell('team');
  expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
});

test('goes to a destination when tapped', async () => {
  const { onGo, user } = renderShell();
  await user.click(screen.getByRole('button', { name: 'Dancers' }));
  expect(onGo).toHaveBeenCalledWith('dancers');
});

test('names the teacher and school on the account button', () => {
  renderShell();
  expect(accountButton()).toHaveAccessibleName('Account, Marina Souto, Escola Aurora');
});

test('shows the teacher initials', () => {
  renderShell();
  expect(accountButton()).toHaveTextContent('MS');
});

test('keeps the account menu closed at first', () => {
  renderShell();
  expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
});

test('opens the account menu', async () => {
  const { user } = renderShell();
  await user.click(accountButton());
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
});

test('says the account menu is open', async () => {
  const { user } = renderShell();
  await user.click(accountButton());
  expect(accountButton()).toHaveAttribute('aria-expanded', 'true');
});

test('switches school from the account menu', async () => {
  const { onSwitch, user } = renderShell();
  await user.click(accountButton());
  await user.click(screen.getByRole('button', { name: 'Switch school' }));
  expect(onSwitch).toHaveBeenCalled();
});

test('closes the account menu with Escape', async () => {
  const { user } = renderShell();
  await user.click(accountButton());
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
});

test('closes the account menu when tapping elsewhere', async () => {
  const { user } = renderShell();
  await user.click(accountButton());
  await user.click(screen.getByText('Page'));
  expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
});

test('closes the account menu when tapped again', async () => {
  const { user } = renderShell();
  await user.click(accountButton());
  await user.click(accountButton());
  expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
});
