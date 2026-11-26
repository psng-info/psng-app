import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPeople } from '@/domain/hr';
import { TODAY, raw } from '@/domain/hr/test-helpers';
import { PersonCard } from './PersonCard';

function person() {
  const p = buildPeople(
    raw([{ Vorname: 'Mia', Nachname: 'Beispiel', 'Pipeline-Status': 'Neu eingegangen' }]),
    TODAY,
  )[0];
  if (!p) throw new Error('keine Person');
  return p;
}

function renderCard(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  const onEdit = vi.fn();
  render(
    <PersonCard
      person={person()}
      today={TODAY}
      onEdit={onEdit}
      onStatus={() => undefined}
      onReview={() => undefined}
    />,
  );
  fireEvent.click(screen.getByText('Checkliste'));
  return onEdit;
}

afterEach(() => vi.restoreAllMocks());

describe('PersonCard', () => {
  it('online: Häkchen der Checkliste sind bedienbar', () => {
    renderCard(true);
    expect(screen.getAllByRole('checkbox').some((c) => !c.hasAttribute('disabled'))).toBe(true);
  });

  it('offline: Häkchen und Status sind gesperrt (keine Schreibaktion, die hängen bleibt)', () => {
    const onEdit = renderCard(false);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.length).toBeGreaterThan(0);
    for (const b of boxes) expect(b).toBeDisabled();
    fireEvent.click(boxes[0] as HTMLElement);
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Status ändern/ })).toBeDisabled();
  });
});
