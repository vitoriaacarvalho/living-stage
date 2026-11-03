import {
  CanvasTexture,
  CapsuleGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three';

// Metres, standing on the floor and facing the audience (+z). Every ballerina
// shares these, so 60 of them cost one copy of each shape.
const shapes = {
  leg: new CylinderGeometry(0.045, 0.028, 0.86, 10).translate(0, 0.43, 0),
  tutu: new CylinderGeometry(0.15, 0.4, 0.07, 28),
  bodice: new CylinderGeometry(0.115, 0.092, 0.34, 16),
  arm: new CapsuleGeometry(0.03, 0.42, 4, 8).translate(0, -0.25, 0),
  neck: new CylinderGeometry(0.034, 0.038, 0.1, 10),
  head: new SphereGeometry(0.095, 20, 14),
  hair: new SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
  bun: new SphereGeometry(0.05, 12, 8),
  shadow: new PlaneGeometry(0.95, 0.95).rotateX(-Math.PI / 2),
};

const shadowTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const halo = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  halo.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  halo.addColorStop(0.55, 'rgba(255, 255, 255, 0.4)');
  halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = halo;
  context.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
})();

const WING_OPACITY = 0.8;

const bodyMaterials = new Map<string, MeshLambertMaterial>();
const shadowMaterials = new Map<string, MeshBasicMaterial>();

function bodyMaterial(color: string, inWing: boolean) {
  const key = `${color}:${inWing}`;
  let material = bodyMaterials.get(key);
  if (!material) {
    material = new MeshLambertMaterial({
      color,
      transparent: inWing,
      opacity: inWing ? WING_OPACITY : 1,
    });
    bodyMaterials.set(key, material);
  }
  return material;
}

function shadowMaterial(color: string, inWing: boolean) {
  const key = `${color}:${inWing}`;
  let material = shadowMaterials.get(key);
  if (!material) {
    material = new MeshBasicMaterial({
      color,
      map: shadowTexture,
      transparent: true,
      opacity: inWing ? WING_OPACITY : 1,
      depthWrite: false,
    });
    shadowMaterials.set(key, material);
  }
  return material;
}

export type BallerinaColors = {
  costume: string;
  skin: string;
  hair: string;
  tights: string;
  shadow: string;
};

type BallerinaProps = {
  position: [x: number, y: number, z: number];
  colors: BallerinaColors;
  inWing: boolean;
};

// One shared pose: a soft second position, arms rounded slightly forward.
export function Ballerina({ position, colors, inWing }: BallerinaProps) {
  const costume = bodyMaterial(colors.costume, inWing);
  const skin = bodyMaterial(colors.skin, inWing);
  const hair = bodyMaterial(colors.hair, inWing);
  const tights = bodyMaterial(colors.tights, inWing);
  return (
    <group position={position}>
      <mesh
        geometry={shapes.shadow}
        material={shadowMaterial(colors.shadow, inWing)}
        position-y={0.003}
        renderOrder={-1}
      />
      <mesh geometry={shapes.leg} material={tights} position-x={-0.055} rotation-z={-0.03} />
      <mesh geometry={shapes.leg} material={tights} position-x={0.055} rotation-z={0.03} />
      <mesh geometry={shapes.tutu} material={costume} position-y={0.9} />
      <mesh geometry={shapes.bodice} material={costume} position-y={1.09} />
      <mesh
        geometry={shapes.arm}
        material={skin}
        position={[-0.11, 1.23, 0]}
        rotation={[-0.5, 0, -0.85]}
      />
      <mesh
        geometry={shapes.arm}
        material={skin}
        position={[0.11, 1.23, 0]}
        rotation={[-0.5, 0, 0.85]}
      />
      <mesh geometry={shapes.neck} material={skin} position-y={1.29} />
      <mesh geometry={shapes.head} material={skin} position-y={1.42} />
      <mesh geometry={shapes.hair} material={hair} position-y={1.425} rotation-x={-0.25} />
      <mesh geometry={shapes.bun} material={hair} position={[0, 1.5, -0.07]} />
    </group>
  );
}
