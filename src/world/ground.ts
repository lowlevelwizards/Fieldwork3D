import * as THREE from 'three';
import { WORLD_DEPTH, WORLD_WIDTH } from '../constants';

export const ROAD_POINTS: readonly [number, number][] = [
  [-43, 13], [-29, 10], [-18, 7], [-7, 4], [5, 1], [18, -3], [29, -8], [43, -11],
];

export function terrainHeight(x: number, z: number): number {
  return 0.19 * Math.sin(x * 0.13) * Math.cos(z * 0.18) +
    0.13 * Math.sin(z * 0.22 + x * 0.05) +
    0.09 * Math.cos(x * 0.32 - z * 0.24);
}

export function distanceToRoad(x: number, z: number): number {
  let minimum = Infinity;
  for (let i = 0; i < ROAD_POINTS.length - 1; i++) {
    const [ax, az] = ROAD_POINTS[i];
    const [bx, bz] = ROAD_POINTS[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    minimum = Math.min(minimum, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return minimum;
}

function ribbon(scene: THREE.Scene, curve: THREE.CatmullRomCurve3, width: number, color: number, lift: number) {
  const steps = 170;
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const nx = -tangent.z, nz = tangent.x;
    for (const sign of [-1, 1]) {
      const x = p.x + nx * width * 0.5 * sign;
      const z = p.z + nz * width * 0.5 * sign;
      vertices.push(x, terrainHeight(x, z) + lift, z);
    }
    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color, roughness: 1, side: THREE.DoubleSide,
  }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

export function createGround(scene: THREE.Scene) {
  const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH, 84, 64);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    positions.setY(i, terrainHeight(x, z));
    const variation = Math.sin(x * 0.78 + Math.cos(z * 0.43)) * 0.055 +
      Math.sin(z * 0.69 - x * 0.18) * 0.04;
    const road = distanceToRoad(x, z);
    color.setRGB(0.395 + variation, 0.47 + variation, 0.355 + variation);
    if (road < 5.6) color.lerp(new THREE.Color(0x91846a), (5.6 - road) / 5.6 * 0.65);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0, flatShading: false,
  }));
  ground.receiveShadow = true;
  scene.add(ground);

  const curve = new THREE.CatmullRomCurve3(
    ROAD_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.22,
  );
  ribbon(scene, curve, 5.2, 0x666755, 0.022);
  ribbon(scene, curve, 4.65, 0x89806b, 0.031);

  for (const shift of [-1.3, 1.3]) {
    const rut = new THREE.CatmullRomCurve3(
      ROAD_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z + shift)), false, 'catmullrom', 0.22,
    );
    ribbon(scene, rut, 0.23, 0x625e4e, 0.043);
  }

  // Damp depressions beside the route: thin surfaces, not heavy water shaders.
  const puddleMaterial = new THREE.MeshStandardMaterial({
    color: 0x657a78, roughness: 0.21, metalness: 0.15, transparent: true, opacity: 0.88,
    side: THREE.DoubleSide,
  });
  for (const [x, z, rx, rz] of [[-17, 11, 2.3, 0.9], [-1, 6.5, 1.4, 0.75], [23, 0.5, 1.6, 0.5]] as const) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 26), puddleMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(rx, rz, 1);
    mesh.position.set(x, terrainHeight(x, z) + 0.05, z);
    scene.add(mesh);
  }
}
