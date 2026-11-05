import { PLAN_BOUNDS, STAGE_DEPTH_M, STAGE_WIDTH_M, type StagePoint } from '@living-stage/shared';
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
    return { selectedIds, snap: false, onSelect: vi.fn(), onMove: vi.fn() };
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

  function floor() {
    return screen.getByRole('group').firstElementChild as HTMLElement;
  }

  // The plan is 1500 × 900 px at the top left of the page, spanning PLAN_BOUNDS.
  function client({ x, y }: { x: number; y: number }) {
    return {
      clientX: ((x - PLAN_BOUNDS.minX) / (PLAN_BOUNDS.maxX - PLAN_BOUNDS.minX)) * 1500,
      clientY: ((y - PLAN_BOUNDS.minY) / (PLAN_BOUNDS.maxY - PLAN_BOUNDS.minY)) * 900,
    };
  }

  function boxFrom(target: HTMLElement, from: StagePoint, to: StagePoint) {
    fireEvent.pointerDown(target, { pointerId: 1, ...client(from) });
    fireEvent.pointerMove(target, { pointerId: 1, ...client(to) });
    fireEvent.pointerUp(target, { pointerId: 1, ...client(to) });
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

  test('is a group named as the stage while editing', () => {
    render(<Stage showGuides dancers={[clara]} edit={editing()} />);
    expect(
      screen.getByRole('group', { name: 'Stage seen from above, audience at the bottom' }),
    ).toBeInTheDocument();
  });

  test('makes each dancer a button named after her', () => {
    render(<Stage showGuides dancers={[clara]} edit={editing()} />);
    expect(screen.getByRole('button', { name: 'Clara' })).toBeInTheDocument();
  });

  test('names a dancer button with her role too', () => {
    render(<Stage showGuides dancers={[{ ...clara, role: 'Kitri' }]} edit={editing()} />);
    expect(screen.getByRole('button', { name: 'Clara, Kitri' })).toBeInTheDocument();
  });

  test('shows a selected dancer button as pressed', () => {
    render(<Stage showGuides dancers={[clara]} edit={editing(['cast-1'])} />);
    expect(screen.getByRole('button', { name: 'Clara' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('shows a dancer button that is not selected as not pressed', () => {
    render(<Stage showGuides dancers={[clara]} edit={editing()} />);
    expect(screen.getByRole('button', { name: 'Clara' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('selects only the dancer when Enter is pressed on her', () => {
    const edit = editing(['cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Clara' }), { key: 'Enter' });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-1']);
  });

  test('selects the dancer when Space is pressed on her', () => {
    const edit = editing();
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Clara' }), { key: ' ' });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-1']);
  });

  test('adds the dancer to the selection with Shift and Enter', () => {
    const edit = editing(['cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Clara' }), {
      key: 'Enter',
      shiftKey: true,
    });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-2', 'cast-1']);
  });

  test('takes a selected dancer out of the selection with Shift and Enter', () => {
    const edit = editing(['cast-1', 'cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Clara' }), {
      key: 'Enter',
      shiftKey: true,
    });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-2']);
  });

  test('ignores other keys on a dancer', () => {
    const edit = editing();
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Clara' }), { key: 'a' });
    expect(edit.onSelect).not.toHaveBeenCalled();
  });

  function press(label: string, keys: { key: string; shiftKey?: boolean }) {
    fireEvent.keyDown(screen.getByRole('button', { name: label }), keys);
  }

  test('moves the dancer 0.25 m to the right with the right arrow', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    press('Clara', { key: 'ArrowRight' });
    expect(edit.onMove).toHaveBeenCalledWith([
      { castMemberId: 'cast-1', x: 0.5 + 0.25 / STAGE_WIDTH_M, y: 0.5 },
    ]);
  });

  test('moves the dancer 1 m with Shift and an arrow', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    press('Clara', { key: 'ArrowRight', shiftKey: true });
    expect(edit.onMove).toHaveBeenCalledWith([
      { castMemberId: 'cast-1', x: 0.5 + 1 / STAGE_WIDTH_M, y: 0.5 },
    ]);
  });

  test('moves the dancer upstage with the up arrow', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    press('Clara', { key: 'ArrowUp' });
    expect(edit.onMove).toHaveBeenCalledWith([
      { castMemberId: 'cast-1', x: 0.5, y: 0.5 - 0.25 / STAGE_DEPTH_M },
    ]);
  });

  test('moves the whole selection with an arrow', () => {
    const edit = editing(['cast-1', 'cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    press('Clara', { key: 'ArrowLeft' });
    const step = 0.25 / STAGE_WIDTH_M;
    expect(edit.onMove).toHaveBeenCalledWith([
      { castMemberId: 'cast-1', x: 0.5 - step, y: 0.5 },
      { castMemberId: 'cast-2', x: 0.25 - step, y: 0.5 },
    ]);
  });

  test('selects a dancer who is not selected when an arrow moves her', () => {
    const edit = editing(['cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    press('Clara', { key: 'ArrowRight' });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-1']);
  });

  test('moves only a dancer who is not selected, not the selection', () => {
    const edit = editing(['cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    press('Clara', { key: 'ArrowRight' });
    expect(edit.onMove).toHaveBeenCalledWith([expect.objectContaining({ castMemberId: 'cast-1' })]);
  });

  test('stops a dancer at the downstage edge', () => {
    const edit = editing(['cast-1']);
    const front = { ...clara, y: 1 - 0.1 / STAGE_DEPTH_M };
    render(<Stage showGuides dancers={[front]} edit={edit} />);
    press('Clara', { key: 'ArrowDown' });
    expect(edit.onMove).toHaveBeenCalledWith([{ castMemberId: 'cast-1', x: 0.5, y: 1 }]);
  });

  test('saves nothing when the dancer is already at the edge', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[{ ...clara, y: 1 }]} edit={edit} />);
    press('Clara', { key: 'ArrowDown' });
    expect(edit.onMove).not.toHaveBeenCalled();
  });

  test('keeps the page from scrolling when an arrow moves a dancer', () => {
    render(<Stage showGuides dancers={[clara]} edit={editing(['cast-1'])} />);
    const pressed = fireEvent.keyDown(screen.getByRole('button', { name: 'Clara' }), {
      key: 'ArrowDown',
    });
    expect(pressed).toBe(false);
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
    dragBy(floor(), 0, 0);
    expect(edit.onSelect).toHaveBeenCalledWith([]);
  });

  test('selects every dancer inside a box drawn on the floor', () => {
    const edit = editing();
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    boxFrom(floor(), { x: 0.2, y: 0.4 }, { x: 0.6, y: 0.6 });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-1', 'cast-2']);
  });

  test('leaves out a dancer outside the box', () => {
    const edit = editing();
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    boxFrom(floor(), { x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-1']);
  });

  test('selects a dancer in the wing with a box drawn there', () => {
    const edit = editing();
    const waiting = { ...clara, x: -0.0625, y: 0.05 };
    render(<Stage showGuides dancers={[waiting]} edit={edit} />);
    boxFrom(floor(), { x: -0.1, y: 0 }, { x: 0, y: 0.1 });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-1']);
  });

  test('selects a box drawn from its bottom right corner', () => {
    const edit = editing();
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    boxFrom(floor(), { x: 0.6, y: 0.6 }, { x: 0.4, y: 0.4 });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-1']);
  });

  test('clears the selection with a box around nobody', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    boxFrom(floor(), { x: 0, y: 0 }, { x: 0.2, y: 0.2 });
    expect(edit.onSelect).toHaveBeenCalledWith([]);
  });

  test('draws the box while it is dragged', () => {
    render(<Stage showGuides dancers={[clara]} edit={editing()} />);
    fireEvent.pointerDown(floor(), { pointerId: 1, ...client({ x: 0, y: 0 }) });
    fireEvent.pointerMove(floor(), { pointerId: 1, ...client({ x: 0.5, y: 0.5 }) });
    expect(screen.getByTestId('selection-box')).toBeInTheDocument();
  });

  test('takes the box away once it is let go', () => {
    render(<Stage showGuides dancers={[clara]} edit={editing()} />);
    boxFrom(floor(), { x: 0, y: 0 }, { x: 0.5, y: 0.5 });
    expect(screen.queryByTestId('selection-box')).not.toBeInTheDocument();
  });

  test('adds a dancer to the selection with Shift-click', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    fireEvent.pointerDown(hitOf('Odile'), { pointerId: 1, shiftKey: true });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-1', 'cast-2']);
  });

  test('takes a dancer out of the selection with Shift-click', () => {
    const edit = editing(['cast-1', 'cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    fireEvent.pointerDown(hitOf('Clara'), { pointerId: 1, shiftKey: true });
    expect(edit.onSelect).toHaveBeenCalledWith(['cast-2']);
  });

  test('moves the whole selection when one of its dancers is dragged', () => {
    const edit = editing(['cast-1', 'cast-2']);
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    dragBy(hitOf('Odile'), 120, 0);
    expect(edit.onMove).toHaveBeenCalledWith([
      { castMemberId: 'cast-1', x: expect.closeTo(0.6), y: 0.5 },
      { castMemberId: 'cast-2', x: expect.closeTo(0.35), y: 0.5 },
    ]);
  });

  test('snaps the dragged dancer onto a quarter line', () => {
    const edit = { ...editing(['cast-1']), snap: true };
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    dragBy(hitOf('Clara'), 276, 0);
    expect(edit.onMove).toHaveBeenCalledWith([{ castMemberId: 'cast-1', x: 0.75, y: 0.5 }]);
  });

  test('leaves the dragged dancer where she is dropped when snapping is off', () => {
    const edit = editing(['cast-1']);
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    dragBy(hitOf('Clara'), 276, 0);
    expect(edit.onMove).toHaveBeenCalledWith([
      { castMemberId: 'cast-1', x: expect.closeTo(0.73), y: 0.5 },
    ]);
  });

  test('does not snap a dancer dropped far from every guide', () => {
    const edit = { ...editing(['cast-1']), snap: true };
    render(<Stage showGuides dancers={[clara]} edit={edit} />);
    dragBy(hitOf('Clara'), 120, 0);
    expect(edit.onMove).toHaveBeenCalledWith([
      { castMemberId: 'cast-1', x: expect.closeTo(0.6), y: 0.5 },
    ]);
  });

  test('keeps the offsets of the rest of the group when snapping', () => {
    const edit = { ...editing(['cast-1', 'cast-2']), snap: true };
    render(<Stage showGuides dancers={[clara, odile]} edit={edit} />);
    dragBy(hitOf('Clara'), 276, 0);
    expect(edit.onMove).toHaveBeenCalledWith([
      expect.objectContaining({ x: 0.75 }),
      expect.objectContaining({ x: expect.closeTo(0.5) }),
    ]);
  });

  test('stops the whole selection when one dancer reaches the edge', () => {
    const edit = editing(['cast-1', 'cast-2']);
    const front = { ...odile, y: 0.9 };
    render(<Stage showGuides dancers={[clara, front]} edit={edit} />);
    dragBy(hitOf('Odile'), 0, 800);
    expect(edit.onMove).toHaveBeenCalledWith([
      expect.objectContaining({ y: expect.closeTo(0.6) }),
      expect.objectContaining({ y: 1 }),
    ]);
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

describe('paths', () => {
  const crossing = { ...clara, x: 0.8, y: 0.5 };
  const fromLeft = { id: crossing.id, from: { x: 0.2, y: 0.5 }, points: [] };

  function linePoints(container: HTMLElement) {
    const points = container.querySelector('polyline')!.getAttribute('points')!;
    return points.split(' ').map((pair) => pair.split(',').map(Number) as [number, number]);
  }

  test('draws the path of a dancer who has one', () => {
    render(<Stage showGuides dancers={[crossing]} paths={[fromLeft]} />);
    expect(screen.getAllByTestId('path')).toHaveLength(1);
  });

  test('marks where she stood in the figure before', () => {
    render(<Stage showGuides dancers={[crossing]} paths={[fromLeft]} />);
    const start = screen.getByTestId('path-start');
    expect([Number(start.getAttribute('cx')), Number(start.getAttribute('cy'))]).toEqual([
      expect.closeTo(2.4),
      expect.closeTo(4),
    ]);
  });

  test('stops the line short of her circle', () => {
    const { container } = render(<Stage showGuides dancers={[crossing]} paths={[fromLeft]} />);
    const [x] = linePoints(container).at(-1)!;
    expect(x).toBeLessThan(0.8 * STAGE_WIDTH_M - 0.2);
  });

  test('starts the line outside the circle where she stood', () => {
    const { container } = render(<Stage showGuides dancers={[crossing]} paths={[fromLeft]} />);
    const [x] = linePoints(container)[0]!;
    expect(x).toBeGreaterThan(0.2 * STAGE_WIDTH_M + 0.2);
  });

  test('ends the line in an arrowhead', () => {
    const { container } = render(<Stage showGuides dancers={[crossing]} paths={[fromLeft]} />);
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });

  test('bends the line through its point', () => {
    const bent = { ...fromLeft, points: [{ along: 0.5, side: 0.25 }] };
    const { container } = render(<Stage showGuides dancers={[crossing]} paths={[bent]} />);
    const upstageMost = Math.min(...linePoints(container).map(([, y]) => y));
    expect(upstageMost).toBeCloseTo(0.5 * STAGE_DEPTH_M - 0.25 * 7.2, 1);
  });

  test('draws no path for a dancer who stays put', () => {
    const still = { ...fromLeft, from: { x: 0.8, y: 0.5 } };
    render(<Stage showGuides dancers={[crossing]} paths={[still]} />);
    expect(screen.queryByTestId('path')).not.toBeInTheDocument();
  });

  test('draws no path for a dancer not on the plan', () => {
    render(<Stage showGuides dancers={[]} paths={[fromLeft]} />);
    expect(screen.queryByTestId('path')).not.toBeInTheDocument();
  });
});
