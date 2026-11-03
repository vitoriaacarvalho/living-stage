// Stage units: 0–1 spans the visible floor, x from stage left to right as seen
// from the audience, y from upstage to downstage. The wings lie just outside.
export const STAGE_WIDTH_M = 12;
export const STAGE_DEPTH_M = 8;

export const SIDE_WING_DEPTH = 0.125;
export const UPSTAGE_WING_DEPTH = 0.125;

export const STAGE_CENTER = 0.5;
export const STAGE_QUARTERS = [0.25, 0.75] as const;

export type FloorPoint = { x: number; z: number };

// Metres from the centre of the floor: x to stage right as seen from the audience,
// z towards the audience, matching Three.js with the camera in the house.
export function stageToFloor({ x, y }: { x: number; y: number }): FloorPoint {
  return { x: (x - STAGE_CENTER) * STAGE_WIDTH_M, z: (y - STAGE_CENTER) * STAGE_DEPTH_M };
}
