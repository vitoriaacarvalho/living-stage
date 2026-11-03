import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Stage } from './Stage.tsx';

test('is named as the stage seen from above', () => {
  render(<Stage showGuides />);
  expect(
    screen.getByRole('img', { name: 'Stage seen from above, audience at the bottom' }),
  ).toBeInTheDocument();
});

test('draws the floor 12 metres across', () => {
  const { container } = render(<Stage showGuides />);
  expect(container.querySelector('rect')).toHaveAttribute('width', '12');
});

test('draws the floor 8 metres deep', () => {
  const { container } = render(<Stage showGuides />);
  expect(container.querySelector('rect')).toHaveAttribute('height', '8');
});

test('frames the floor with wings on both sides and upstage', () => {
  const { container } = render(<Stage showGuides />);
  expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-1.5 -1 15 9');
});

test('labels a wing on each side', () => {
  render(<Stage showGuides />);
  expect(screen.getAllByText('Wing')).toHaveLength(2);
});

test('labels the upstage wing', () => {
  render(<Stage showGuides />);
  expect(screen.getByText('Upstage')).toBeInTheDocument();
});

test('labels the audience', () => {
  render(<Stage showGuides />);
  expect(screen.getByText('Audience')).toBeInTheDocument();
});

test('draws the center and quarter lines across and down the floor', () => {
  render(<Stage showGuides />);
  expect(screen.getByTestId('guides').querySelectorAll('line')).toHaveLength(6);
});

test('draws the center lines through the middle of the floor', () => {
  render(<Stage showGuides />);
  const lines = [...screen.getByTestId('guides').querySelectorAll('line')];
  const center = lines.filter(
    (line) => line.getAttribute('x1') === '6' || line.getAttribute('y1') === '4',
  );
  expect(center).toHaveLength(2);
});

test('hides the guide lines when the dance turns them off', () => {
  render(<Stage showGuides={false} />);
  expect(screen.queryByTestId('guides')).not.toBeInTheDocument();
});

const clara = {
  id: 'cast-1',
  dancerId: 'dancer-1',
  label: 'Clara',
  role: null,
  color: 3,
  x: 0.5,
  y: 0.5,
  open: false,
};

test('labels each dancer with her name', () => {
  render(<Stage showGuides dancers={[clara]} />);
  expect(screen.getByText('Clara')).toBeInTheDocument();
});

test('puts the role under the name', () => {
  render(<Stage showGuides dancers={[{ ...clara, role: 'Kitri' }]} />);
  expect(screen.getByText('Kitri')).toBeInTheDocument();
});

test('puts a dancer at the center of the floor', () => {
  render(<Stage showGuides dancers={[clara]} />);
  expect(screen.getByTestId('dancer')).toHaveStyle({ left: '50%', top: `${(5 / 9) * 100}%` });
});

test('puts a dancer waiting in the left wing beside the floor', () => {
  render(<Stage showGuides dancers={[{ ...clara, x: -0.0625, y: 0.05 }]} />);
  expect(screen.getByTestId('dancer')).toHaveStyle({ left: '5%' });
});

test('dims a dancer waiting off stage', () => {
  render(<Stage showGuides dancers={[{ ...clara, x: -0.0625 }]} />);
  expect(screen.getByTestId('dancer')).toHaveClass(/offStage/);
});

test('does not dim a dancer on stage', () => {
  render(<Stage showGuides dancers={[clara]} />);
  expect(screen.getByTestId('dancer')).not.toHaveClass(/offStage/);
});

test('draws an open spot apart from the dancers', () => {
  render(
    <Stage
      showGuides
      dancers={[{ ...clara, label: 'Open spot', dancerId: null, color: null, open: true }]}
    />,
  );
  expect(screen.getByTestId('dancer')).toHaveClass(/open/);
});

describe('editing', () => {
  const odile = { ...clara, id: 'cast-2', dancerId: 'dancer-2', label: 'Odile', x: 0.25 };

  function editing(selectedIds: string[] = []) {
    return { selectedIds, onSelect: vi.fn(), onMove: vi.fn() };
  }

  function hitOf(label: string) {
    const dot = screen.getByText(label).closest('[data-testid="dancer"]') as HTMLElement;
    return within(dot).getByTestId('dancer-hit');
  }

  function dragBy(target: HTMLElement, dx: number, dy: number, pointerId = 1) {
    fireEvent.pointerDown(target, { pointerId, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(target, { pointerId, clientX: 100 + dx, clientY: 100 + dy });
    fireEvent.pointerUp(target, { pointerId, clientX: 100 + dx, clientY: 100 + dy });
  }

  beforeEach(() => {
    Element.prototype.setPointerCapture = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: 1500, height: 900 }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('gives no dancer a drag area when the plan is only shown', () => {
    render(<Stage showGuides dancers={[clara]} />);
    expect(screen.queryByTestId('dancer-hit')).not.toBeInTheDocument();
  });

  test('selects a dancer when she is tapped', () => {
    const edit = editing();
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    dragBy(hitOf('Clara'), 0, 0);
    expect(edit.onSelect).toHaveBeenLastCalledWith(['cast-1']);
  });

  test('replaces the selection with the dancer tapped', () => {
    const edit = editing(['cast-1', 'cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    dragBy(hitOf('Odile'), 0, 0);
    expect(edit.onSelect).toHaveBeenLastCalledWith(['cast-2']);
  });

  test('rings a selected dancer', () => {
    render(<Stage showGuides dancers={[clara]} edit={editing(['cast-1'])} />);
    expect(screen.getByTestId('dancer')).toHaveClass(/selected/);
  });

  test('does not ring a dancer who is not selected', () => {
    render(<Stage showGuides dancers={[clara]} edit={editing()} />);
    expect(screen.getByTestId('dancer')).not.toHaveClass(/selected/);
  });

  test('clears the selection when the floor is tapped', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    fireEvent.pointerDown(screen.getByRole('img').firstElementChild!, { pointerId: 1 });
    expect(edit.onSelect).toHaveBeenCalledWith([]);
  });

  test('moves a dragged dancer by the distance dragged', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    dragBy(hitOf('Clara'), 120, 80);
    expect(edit.onMove).toHaveBeenCalledWith([
      { castMemberId: 'cast-1', x: expect.closeTo(0.6), y: expect.closeTo(0.6) },
    ]);
  });

  test('keeps the dancer under the finger while dragging', () => {
    render(<Stage showGuides dancers={[clara]} edit={editing(['cast-1'])} />);
    fireEvent.pointerDown(hitOf('Clara'), { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(hitOf('Clara'), { pointerId: 1, clientX: 220, clientY: 100 });
    expect(parseFloat(screen.getByTestId('dancer').style.left)).toBeCloseTo(58);
  });

  test('selects a dancer who was not selected before dragging her', () => {
    const edit = editing(['cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    dragBy(hitOf('Clara'), 120, 0);
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-1']);
  });

  test('moves only the dragged dancer when she was not selected', () => {
    const edit = editing(['cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    dragBy(hitOf('Clara'), 120, 0);
    expect(edit.onMove).toHaveBeenCalledWith([expect.objectContaining({ castMemberId: 'cast-1' })]);
  });

  test('treats a press that barely moves as a tap', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    dragBy(hitOf('Clara'), 2, 2);
    expect(edit.onMove).not.toHaveBeenCalled();
  });

  test('stops a dancer at the downstage edge', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    dragBy(hitOf('Clara'), 0, 800);
    expect(edit.onMove).toHaveBeenCalledWith([expect.objectContaining({ y: 1 })]);
  });

  test('ignores a second finger while one dancer is dragged', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    fireEvent.pointerDown(hitOf('Clara'), { pointerId: 1, clientX: 100, clientY: 100 });
    dragBy(hitOf('Odile'), 120, 0, 2);
    expect(edit.onMove).not.toHaveBeenCalled();
  });

  test('moves nobody when the drag is cancelled', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    fireEvent.pointerDown(hitOf('Clara'), { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(hitOf('Clara'), { pointerId: 1, clientX: 220, clientY: 100 });
    fireEvent.pointerCancel(hitOf('Clara'), { pointerId: 1 });
    expect(screen.getByTestId('dancer')).toHaveStyle({ left: '50%' });
  });
});
