import * as THREE from 'three';
import type { Obstacle } from '../navigation/grid';
import { distanceToRoad, terrainHeight } from './ground';

const materials = new Map<number, THREE.MeshStandardMaterial>();
function mat(color: number) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({
    color, roughness: 0.88, metalness: 0.04, flatShading: true,
  }));
  return materials.get(color)!;
}
function cuboid(parent: THREE.Object3D, color: number, x: number, y: number, z: number,
  w: number, h: number, d: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cylinder(parent: THREE.Object3D, color: number, radiusTop: number, radiusBottom: number,
  height: number, segments: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), mat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function siteGroup(scene: THREE.Scene, x: number, z: number) {
  const group = new THREE.Group();
  group.position.set(x, terrainHeight(x, z), z);
  scene.add(group);
  return group;
}
function shed(scene: THREE.Scene, obstacles: Obstacle[], x: number, z: number) {
  const g = siteGroup(scene, x, z);
  cuboid(g, 0x69746d, 0, 2.05, 0, 10.2, 4.1, 7);
  cuboid(g, 0x4c5654, 0, 1.52, 3.55, 3.3, 3.04, 0.18);
  cuboid(g, 0xb79c61, 0, 3.25, 3.68, 2.55, 0.19, 0.22);
  cuboid(g, 0xadb09b, -3.15, 2.5, 3.58, 1.42, 1.12, 0.12);
  cuboid(g, 0x32474b, -3.15, 2.5, 3.68, 1.20, 0.90, 0.09);
  cuboid(g, 0xa58f60, 0, 1.9, 3.69, 0.07, 2.2, 0.12);
  for (const zSign of [-1, 1]) {
    const roof = cuboid(g, 0x465c58, 0, 4.67, zSign * 1.83, 11.0, 0.24, 4.4);
    roof.rotation.x = zSign * -0.29;
    cuboid(g, 0x998b68, -4.4, 2.75, zSign * 3.56, 0.12, 1.3, 0.12);
  }
  for (let i = 0; i < 7; i++) {
    cuboid(g, 0x5b6964, -4.5 + i * 1.5, 4.55, -1.83, 0.08, 0.13, 4.0).rotation.x = 0.29;
  }
  // Service pipes, loading apron, and a painted utility placard.
  cylinder(g, 0x3c4c50, 0.18, 0.18, 4.9, 8, 3.9, 2.5, -3.25);
  cuboid(g, 0xa88752, 2.85, 2.85, 3.7, 1.3, 0.5, 0.1);
  cuboid(g, 0x77705a, 0, 0.12, 4.52, 4.0, 0.16, 2.2);
  obstacles.push({ kind: 'box', x, z, halfX: 5.4, halfZ: 3.9 });
}
function utilityCabin(scene: THREE.Scene, obstacles: Obstacle[], x: number, z: number) {
  const g = siteGroup(scene, x, z);
  cuboid(g, 0x8f8062, 0, 1.35, 0, 5.9, 2.7, 4.5);
  cuboid(g, 0x435659, 0, 2.9, 0, 6.5, 0.28, 5.0);
  cuboid(g, 0x3a4f54, 0, 1.1, 2.32, 1.38, 2.08, 0.12);
  cuboid(g, 0xb7a56f, 1.75, 1.95, 2.33, 0.85, 0.4, 0.1);
  cylinder(g, 0x38484b, 0.37, 0.37, 1.2, 7, -2.15, 3.62, -1.32);
  obstacles.push({ kind: 'box', x, z, halfX: 3.3, halfZ: 2.65 });
}
function radioMast(scene: THREE.Scene, obstacles: Obstacle[], x: number, z: number) {
  const g = siteGroup(scene, x, z);
  const steel = 0x697472, yellow = 0xb9a064;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pole = cylinder(g, steel, 0.065, 0.095, 12, 6, sx * 0.92, 6, sz * 0.92);
    pole.rotation.z = sx * -0.058;
    pole.rotation.x = sz * 0.058;
  }
  for (let y = 1.5; y < 12; y += 2.2) {
    cuboid(g, steel, 0, y, 0.8, 2.3, 0.08, 0.11);
    cuboid(g, steel, 0, y, -0.8, 2.3, 0.08, 0.11);
    cuboid(g, steel, 0.8, y, 0, 0.11, 0.08, 2.3);
    cuboid(g, steel, -0.8, y, 0, 0.11, 0.08, 2.3);
  }
  cylinder(g, yellow, 0.22, 0.22, 0.55, 8, 0, 12.35, 0);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xeeb77c, emissive: 0x8c492c, emissiveIntensity: 1 }));
  lamp.position.y = 12.8;
  g.add(lamp);
  obstacles.push({ kind: 'circle', x, z, radius: 1.5 });
}
function truck(scene: THREE.Scene, obstacles: Obstacle[], x: number, z: number) {
  const g = siteGroup(scene, x, z);
  g.rotation.y = -0.23;
  cuboid(g, 0x354747, 0, 0.84, 0, 6.2, 0.45, 2.48);
  cuboid(g, 0x92855f, -0.8, 1.9, 0, 3.55, 1.58, 2.45);
  cuboid(g, 0x576d69, 2.08, 1.66, 0, 1.97, 1.74, 2.45);
  cuboid(g, 0x2c4147, 2.93, 2.02, 0, 0.14, 0.88, 2.1);
  cuboid(g, 0xb3a984, 1.0, 1.8, 1.28, 0.12, 0.9, 0.24);
  cuboid(g, 0xb3a984, 1.0, 1.8, -1.28, 0.12, 0.9, 0.24);
  for (const wx of [-2.15, 2.05]) for (const wz of [-1.28, 1.28]) {
    const wheel = cylinder(g, 0x282e2c, 0.59, 0.59, 0.28, 12, wx, 0.6, wz);
    wheel.rotation.x = Math.PI / 2;
    const hub = cylinder(g, 0x77796e, 0.24, 0.24, 0.31, 9, wx, 0.6, wz);
    hub.rotation.x = Math.PI / 2;
  }
  for (const side of [-1, 1]) {
    cuboid(g, 0xdec28c, 3.17, 1.17, side * 0.84, 0.13, 0.22, 0.47);
  }
  obstacles.push({ kind: 'box', x, z, halfX: 3.6, halfZ: 2.2 });
}
function crate(scene: THREE.Scene, x: number, z: number, s = 1) {
  const g = siteGroup(scene, x, z);
  cuboid(g, 0x9d885f, 0, 0.55 * s, 0, s, 1.1 * s, s);
  cuboid(g, 0x605847, 0, 0.25 * s, 0.5 * s, 1.02 * s, 0.12 * s, 0.1 * s);
  cuboid(g, 0x605847, 0, 0.83 * s, 0.5 * s, 1.02 * s, 0.12 * s, 0.1 * s);
}
function fence(scene: THREE.Scene, x: number, z: number, length: number, rotation = 0) {
  const g = siteGroup(scene, x, z);
  g.rotation.y = rotation;
  for (let i = 0; i <= length; i += 2.5) {
    cuboid(g, 0x5b5c4e, i - length / 2, 0.85, 0, 0.14, 1.7, 0.15);
  }
  for (const y of [0.52, 1.23]) cuboid(g, 0x77765e, 0, y, 0, length, 0.11, 0.1);
}
function tree(scene: THREE.Scene, x: number, z: number, size: number, variant: number) {
  const g = siteGroup(scene, x, z);
  g.rotation.y = variant * 0.47;
  cylinder(g, 0x504b3c, 0.15 * size, 0.24 * size, 2.0 * size, 6, 0, 0.95 * size, 0);
  const foliage = [0x3a574b, 0x4d6650, 0x526b55, 0x405b50][variant % 4];
  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(new THREE.ConeGeometry((1.48 - i * 0.22) * size, 2.7 * size, 6), mat(foliage));
    crown.position.y = (2.55 + i * 0.92) * size;
    crown.rotation.y = i * 0.34;
    crown.castShadow = true;
    g.add(crown);
  }
}
function boulder(scene: THREE.Scene, x: number, z: number, size: number) {
  const g = siteGroup(scene, x, z);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), mat(0x828578));
  rock.scale.set(1.3, 0.58, 0.96);
  rock.position.y = size * 0.22;
  rock.rotation.set(0, x * 0.19, z * 0.05);
  rock.castShadow = true;
  g.add(rock);
}
function shrubs(scene: THREE.Scene, x: number, z: number, s: number) {
  const g = siteGroup(scene, x, z);
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65 * s, 0), mat(0x64795a));
  bush.scale.set(1.5, 0.75, 1);
  bush.position.y = 0.42 * s;
  bush.castShadow = true;
  g.add(bush);
}
function grass(scene: THREE.Scene, obstacles: readonly Obstacle[], random: () => number) {
  const geometry = new THREE.ConeGeometry(0.11, 0.64, 3);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const blades = new THREE.InstancedMesh(geometry, material, 650);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < blades.count; i++) {
    const x = random() * 82 - 41, z = random() * 62 - 31;
    const blocked = obstacles.some(o => o.kind === 'circle'
      ? Math.hypot(o.x - x, o.z - z) < o.radius + 1.2
      : Math.abs(x - o.x) < o.halfX + 1 && Math.abs(z - o.z) < o.halfZ + 1);
    if (blocked || distanceToRoad(x, z) < 3.9) {
      dummy.scale.setScalar(0.001);
    } else {
      const s = 0.55 + random() * 1.3;
      dummy.scale.set(s, s, s);
    }
    dummy.position.set(x, terrainHeight(x, z) + 0.21, z);
    dummy.rotation.y = random() * Math.PI * 2;
    dummy.updateMatrix();
    blades.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.24 + random() * 0.065, 0.16 + random() * 0.12, 0.31 + random() * 0.16);
    blades.setColorAt(i, color);
  }
  blades.instanceMatrix.needsUpdate = true;
  scene.add(blades);
}

export function createProps(scene: THREE.Scene): Obstacle[] {
  const obstacles: Obstacle[] = [];
  shed(scene, obstacles, -9, -13);
  utilityCabin(scene, obstacles, 19, -17);
  radioMast(scene, obstacles, 29, -19);
  truck(scene, obstacles, 12, 4);
  for (const [x, z, size] of [[-23, -8, 1.1], [-21.6, -8, 0.82], [2, -10, 1.0], [3.3, -10.5, 0.8],
    [16.5, -11, 1.2], [17.9, -11, 0.85]] as const) {
    crate(scene, x, z, size);
    obstacles.push({ kind: 'box', x, z, halfX: size * 0.56, halfZ: size * 0.56 });
  }
  fence(scene, -18, -19, 12, 0.03);
  fence(scene, -27, -17, 7, 1.57);
  fence(scene, 26, -12, 7, -0.15);

  // Small service fixtures that give the location a readable working purpose.
  const relay = siteGroup(scene, 1.3, -9.3);
  cuboid(relay, 0x485b59, 0, 1.1, 0, 1.4, 2.2, 0.9);
  cuboid(relay, 0xd1b879, 0, 1.66, 0.48, 0.9, 0.42, 0.1);
  cylinder(relay, 0x3c514f, 0.045, 0.045, 2.6, 6, 0.4, 3.25, -0.12);
  obstacles.push({ kind: 'box', x: 1.3, z: -9.3, halfX: 0.9, halfZ: 0.7 });

  let state = 230926;
  const random = () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 155; i++) {
    const x = random() * 79 - 39.5, z = random() * 59 - 29.5;
    const important = (Math.abs(x + 9) < 10 && Math.abs(z + 13) < 8) ||
      (Math.abs(x - 19) < 8 && Math.abs(z + 17) < 7) ||
      (Math.abs(x - 29) < 5 && Math.abs(z + 19) < 6) ||
      (Math.abs(x - 12) < 8 && Math.abs(z - 4) < 6) ||
      (Math.abs(x + 27) < 5 && Math.abs(z - 10) < 5);
    if (important || distanceToRoad(x, z) < 5 || obstacles.some(o => o.kind === 'circle'
      ? Math.hypot(o.x - x, o.z - z) < o.radius + 2.4
      : Math.abs(x - o.x) < o.halfX + 2.3 && Math.abs(z - o.z) < o.halfZ + 2.3)) continue;
    const size = 0.75 + random() * 0.75;
    tree(scene, x, z, size, Math.floor(random() * 4));
    obstacles.push({ kind: 'circle', x, z, radius: size * 0.56 });
  }
  for (let i = 0; i < 95; i++) {
    const x = random() * 80 - 40, z = random() * 60 - 30;
    if (distanceToRoad(x, z) < 4) continue;
    const nearStructure = obstacles.some(o => o.kind === 'box' &&
      Math.abs(x - o.x) < o.halfX + 1 && Math.abs(z - o.z) < o.halfZ + 1);
    if (nearStructure) continue;
    if (i % 4 === 0) boulder(scene, x, z, 0.38 + random() * 0.6);
    else shrubs(scene, x, z, 0.55 + random() * 0.75);
  }
  grass(scene, obstacles, random);
  return obstacles;
}
