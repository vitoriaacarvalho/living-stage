import {
  SIDE_WING_DEPTH,
  STAGE_CENTER,
  STAGE_DEPTH_M,
  STAGE_QUARTERS,
  STAGE_WIDTH_M,
  UPSTAGE_WING_DEPTH,
  stageToFloor,
} from '@living-stage/shared';
import { Line } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useLayoutEffect, useState } from 'react';
import { type PerspectiveCamera, Vector3 } from 'three';
import { cssToken } from './css-token.ts';
import type { StageProps } from './Stage.tsx';
import styles from './Stage3D.module.css';

const sideWing = SIDE_WING_DEPTH * STAGE_WIDTH_M;
const upstageWing = UPSTAGE_WING_DEPTH * STAGE_DEPTH_M;
const halfWidth = STAGE_WIDTH_M / 2;
const halfDepth = STAGE_DEPTH_M / 2;
const lineLift = 0.005;

const legWidth = 1.2;
const legHeight = 4;
const legDepths = [0.1, 0.45, 0.8];

const figureHeight = 2;
const outerX = halfWidth + sideWing;
const upstageZ = -halfDepth - upstageWing;
const framedPoints = [-outerX, outerX].flatMap((x) =>
  [upstageZ, halfDepth].flatMap((z) => [0, figureHeight].map((y) => new Vector3(x, y, z))),
);

const cameraElevation = (30 * Math.PI) / 180;
const cameraTarget = new Vector3(0, 0.6, -0.4);
const frameMargin = 0.94;

function palette() {
  return {
    floor: cssToken('--stage-floor'),
    line: cssToken('--stage-line'),
    wing: cssToken('--stage-wing'),
    edge: cssToken('--stage-ink-muted'),
  };
}

type Palette = ReturnType<typeof palette>;

export function Stage3D({ showGuides }: StageProps) {
  const [colors] = useState(palette);
  return (
    <div className={styles.stage} role="img" aria-label="Stage seen from the audience">
      <Canvas flat frameloop="demand" dpr={[1, 2]} camera={{ fov: 35, near: 0.5, far: 80 }}>
        <color attach="background" args={[colors.wing]} />
        <FittedCamera />
        <Floor colors={colors} />
        {showGuides && <Guides color={colors.line} />}
        <Legs colors={colors} />
      </Canvas>
    </div>
  );
}

function Floor({ colors }: { colors: Palette }) {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[STAGE_WIDTH_M, STAGE_DEPTH_M]} />
        <meshBasicMaterial color={colors.floor} />
      </mesh>
      <Line
        points={[
          [-halfWidth, lineLift, halfDepth],
          [halfWidth, lineLift, halfDepth],
        ]}
        color={colors.edge}
        lineWidth={2}
      />
    </>
  );
}

function Guides({ color }: { color: string }) {
  return (
    <>
      {STAGE_QUARTERS.map((at) => (
        <GuidePair key={at} at={at} color={color} dashed />
      ))}
      <GuidePair at={STAGE_CENTER} color={color} />
    </>
  );
}

function GuidePair({ at, color, dashed = false }: { at: number; color: string; dashed?: boolean }) {
  const lines = [
    [stageToFloor({ x: at, y: 0 }), stageToFloor({ x: at, y: 1 })],
    [stageToFloor({ x: 0, y: at }), stageToFloor({ x: 1, y: at })],
  ];
  return lines.map((ends, index) => (
    <Line
      key={index}
      points={ends.map(({ x, z }) => [x, lineLift, z] as const)}
      color={color}
      lineWidth={dashed ? 1 : 1.5}
      dashed={dashed}
      dashSize={0.2}
      gapSize={0.3}
    />
  ));
}

// The dark flats stand just outside the wings, so they frame the stage without
// hiding the dancers waiting there. A lit edge on the stage side keeps
// overlapping flats apart.
function Legs({ colors }: { colors: Palette }) {
  return [-1, 1].flatMap((side) =>
    legDepths.map((depth) => {
      const z = stageToFloor({ x: 0, y: depth }).z;
      return (
        <group key={`${side}-${depth}`} position={[side * outerX, 0, z]}>
          <mesh position={[(side * legWidth) / 2, legHeight / 2, 0]}>
            <planeGeometry args={[legWidth, legHeight]} />
            <meshBasicMaterial color={colors.floor} />
          </mesh>
          <Line
            points={[
              [0, 0, lineLift],
              [0, legHeight, lineLift],
            ]}
            color={colors.line}
            lineWidth={1.5}
          />
        </group>
      );
    }),
  );
}

function FittedCamera() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const { width, height } = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    if (width === 0 || height === 0) return;
    fitCamera(camera, width / height);
    invalidate();
  }, [camera, width, height, invalidate]);
  return null;
}

const viewDirection = new Vector3(0, Math.sin(cameraElevation), Math.cos(cameraElevation));
const projected = new Vector3();
const cameraUp = new Vector3();

// Backs the camera away until the floor, both wings and a dancer's height at
// every corner fit the canvas, whatever its shape, then pans so they sit centred.
function fitCamera(camera: PerspectiveCamera, aspect: number) {
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  const target = cameraTarget.clone();
  const halfViewHeight = Math.tan((camera.fov * Math.PI) / 360);
  for (let pass = 0; pass < 3; pass++) {
    const distance = fitDistance(camera, target);
    cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    target.addScaledVector(cameraUp, verticalCentre(camera) * distance * halfViewHeight);
  }
  fitDistance(camera, target);
}

function fitDistance(camera: PerspectiveCamera, target: Vector3): number {
  let near = 1;
  let far = 60;
  for (let step = 0; step < 24; step++) {
    const distance = (near + far) / 2;
    placeCamera(camera, target, distance);
    if (fits(camera)) far = distance;
    else near = distance;
  }
  placeCamera(camera, target, far);
  return far;
}

function placeCamera(camera: PerspectiveCamera, target: Vector3, distance: number) {
  camera.position.copy(target).addScaledVector(viewDirection, distance);
  camera.lookAt(target);
  camera.updateMatrixWorld();
}

function fits(camera: PerspectiveCamera): boolean {
  return framedPoints.every((point) => {
    projected.copy(point).project(camera);
    return Math.abs(projected.x) <= frameMargin && Math.abs(projected.y) <= frameMargin;
  });
}

function verticalCentre(camera: PerspectiveCamera): number {
  const heights = framedPoints.map((point) => projected.copy(point).project(camera).y);
  return (Math.min(...heights) + Math.max(...heights)) / 2;
}
