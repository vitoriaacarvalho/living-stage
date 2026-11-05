import { type RefObject, useEffect, useState } from 'react';

// Pixels per metre and the dancer circle's diameter, so lines drawn in metres can stop
// at a circle's edge. Before the plan is measured (and in tests) it assumes 100 px a
// metre and the iPad circle.
export type PlanScale = { pxPerM: number; dotPx: number };

const unmeasured: PlanScale = { pxPerM: 100, dotPx: 40 };

// Matches the phone breakpoint in Stage.module.css.
const phone = '(max-width: 599px)';

export function usePlanScale(
  svgRef: RefObject<SVGSVGElement | null>,
  planWidthM: number,
): PlanScale {
  const [scale, setScale] = useState(unmeasured);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    function measure() {
      const width = svg!.getBoundingClientRect().width;
      if (width === 0) return;
      const token = window.matchMedia?.(phone).matches ? '--dancer-dot-phone' : '--dancer-dot-ipad';
      const dotPx = parseFloat(getComputedStyle(svg!).getPropertyValue(token)) || unmeasured.dotPx;
      setScale({ pxPerM: width / planWidthM, dotPx });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [svgRef, planWidthM]);

  return scale;
}
