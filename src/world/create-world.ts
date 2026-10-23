import * as THREE from 'three';
import type { Obstacle, Point2 } from '../navigation/grid';
import { terrainHeight, createGround } from './ground';
import { createProps } from './props';
import type { RelaySite } from '../fieldwork/relay-site';

export type Diorama = {
  scene: THREE.Scene;
  obstacles: Obstacle[];
  relay: RelaySite;
  waypoint: THREE.Group;
  placeWaypoint: (point: Point2) => void;
};

export function createWorld(): Diorama {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa5ada0);
  scene.fog = new THREE.FogExp2(0xa5ada0, 0.009);
  const sky = new THREE.HemisphereLight(0xdde7d2, 0x667066, 2.0);
  scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffe1b3, 2.5);
  sun.position.set(-19, 38, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -50;
  sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 110;
  sun.shadow.bias = -0.00045;
  scene.add(sun);
  scene.add(sun.target);
  createGround(scene);
  const { obstacles, relay } = createProps(scene);
  const waypoint = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.53, 0.68, 32),
    new THREE.MeshBasicMaterial({ color: 0xf0d193, transparent: true, opacity: 0.93,
      depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  waypoint.add(ring);
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xf9deb0 }),
  );
  dot.position.y = 0.11;
  waypoint.add(dot);
  waypoint.visible = false;
  scene.add(waypoint);

  const placeWaypoint = (point: Point2) => {
    waypoint.position.set(point.x, terrainHeight(point.x, point.z) + 0.1, point.z);
    waypoint.visible = true;
  };
  return { scene, obstacles, relay, waypoint, placeWaypoint };
}
