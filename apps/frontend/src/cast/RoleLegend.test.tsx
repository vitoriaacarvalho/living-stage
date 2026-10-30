import type { CastMember } from '@living-stage/shared';
import { render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { RoleLegend } from './RoleLegend.tsx';

const clara = { id: 'dancer-1', name: 'Clara', color: 3 };

function castMember(role: string | null, dancer: CastMember['dancer'] = clara): CastMember {
  return { id: `cast-${role}`, dancer, role };
}

function legendEntries() {
  const legend = screen.getByRole('list', { name: 'Role colors' });
  return within(legend)
    .getAllByRole('listitem')
    .map((chip) => chip.textContent);
}

test('lists each role once, in the order roles first appear', () => {
  render(<RoleLegend cast={[castMember('Kitri'), castMember('Basilio'), castMember('kitri')]} />);
  expect(legendEntries()).toEqual(['Kitri', 'Basilio']);
});

test('adds a no-role entry when a dancer has no role', () => {
  render(<RoleLegend cast={[castMember('Kitri'), castMember(null)]} />);
  expect(legendEntries()).toEqual(['Kitri', 'No role']);
});

test('leaves out the no-role entry for an open spot with no role', () => {
  render(<RoleLegend cast={[castMember('Kitri'), castMember(null, null)]} />);
  expect(legendEntries()).toEqual(['Kitri']);
});

test('colors each role chip with its role color', () => {
  render(<RoleLegend cast={[castMember('Kitri')]} />);
  const dot = screen.getByText('Kitri').querySelector('[aria-hidden="true"]');
  expect(dot).toHaveStyle({ '--dot': 'var(--dancer-1)' });
});

test('shows nothing for an empty cast', () => {
  render(<RoleLegend cast={[]} />);
  expect(screen.queryByRole('list', { name: 'Role colors' })).not.toBeInTheDocument();
});
