import * as THREE from 'three';
import type { Point2 } from '../navigation/grid';
import { terrainHeight } from '../world/ground';

const uniform = (color: number) => new THREE.MeshStandardMaterial({
  color, roughness: 0.92, metalness: 0.02, flatShading: true,
});

export class Operator {
  readonly group = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly torso = new THREE.Group();
  private route: Point2[] = [];
  private stride = 0;
  private readonly speed = 3.0;

  constructor(scene: THREE.Scene, start: Point2) {
    const jacket = uniform(0x53665d);
    const jacketShade = uniform(0x364a45);
    const fabric = uniform(0x66695b);
    const boots = uniform(0x313d3c);
    const kit = uniform(0xa18a61);
    const face = uniform(0xbda287);
    const accent = uniform(0xc08a59);

    const part = (parent: THREE.Object3D, w: number, h: number, d: number,
      x: number, y: number, z: number, material: THREE.Material) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };

    this.group.add(this.torso);
    part(this.torso, 0.86, 0.95, 0.47, 0, 1.69, 0, jacket);
    part(this.torso, 0.94, 0.22, 0.52, 0, 2.15, 0, jacketShade);
    part(this.torso, 0.12, 0.85, 0.07, -0.25, 1.72, 0.28, kit).rotation.z = -0.28;
    part(this.torso, 0.35, 0.47, 0.22, 0.31, 1.58, 0.34, jacketShade);
    part(this.torso, 0.66, 0.84, 0.25, 0, 1.67, -0.4, kit); // supply pack
    part(this.torso, 0.47, 0.26, 0.28, 0, 2.0, -0.55, 0.03 ? kit : kit);
    part(this.torso, 0.12, 0.45, 0.12, 0.27, 2.29, -0.56, jacketShade);
    part(this.torso, 0.44, 0.42, 0.42, 0, 2.42, 0.04, face);
    part(this.torso, 0.57, 0.25, 0.54, 0, 2.66, 0.01, jacketShade); // cap
    part(this.torso, 0.57, 0.06, 0.25, 0, 2.59, 0.34, jacketShade);
    part(this.torso, 0.17, 0.1, 0.05, 0, 2.42, 0.265, boots); // visor

    for (const [side, leg] of [[-1, this.leftLeg], [1, this.rightLeg]] as const) {
      leg.position.set(side * 0.245, 1.18, 0);
      this.group.add(leg);
      part(leg, 0.33, 0.64, 0.36, 0, -0.32, 0, fabric);
      part(leg, 0.38, 0.49, 0.40, 0, -0.82, 0.025, fabric);
      part(leg, 0.4, 0.22, 0.65, 0, -1.11, 0.13, boots);
    }
    for (const [side, arm] of [[-1, this.leftArm], [1, this.rightArm]] as const) {
      arm.position.set(side * 0.56, 2.03, 0);
      this.torso.add(arm);
      part(arm, 0.31, 0.55, 0.35, 0, -0.3, 0, jacket);
      part(arm, 0.3, 0.46, 0.32, 0, -0.76, 0.05, fabric);
      part(arm, 0.33, 0.18, 0.34, 0, -1.01, 0.08, boots);
      if (side === -1) part(arm, 0.345, 0.20, 0.36, 0, -0.37, 0.01, accent);
    }

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 20),
      new THREE.MeshBasicMaterial({ color: 0x152b2c, transparent: true, opacity: 0.17, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.04;
    this.group.add(shadow);
    this.group.position.set(start.x, terrainHeight(start.x, start.z), start.z);
    scene.add(this.group);
  }

  get position(): Point2 {
    return { x: this.group.position.x, z: this.group.position.z };
  }

  get moving(): boolean { return this.route.length > 0; }

  follow(path: Point2[]) {
    this.route = [...path];
  }

  update(delta: number) {
    const dt = Math.min(delta, 0.05);
    if (this.route.length) {
      const target = this.route[0];
      const dx = target.x - this.group.position.x;
      const dz = target.z - this.group.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < this.speed * dt + 0.07) {
        this.group.position.x = target.x;
        this.group.position.z = target.z;
        this.route.shift();
      } else {
        this.group.position.x += dx / distance * this.speed * dt;
        this.group.position.z += dz / distance * this.speed * dt;
      }
      if (distance > 0.001) {
        const heading = Math.atan2(dx, dz);
        const change = Math.atan2(Math.sin(heading - this.group.rotation.y),
          Math.cos(heading - this.group.rotation.y));
        this.group.rotation.y += change * Math.min(1, dt * 9);
      }
    }
    const moveWeight = this.moving ? 1 : 0;
    if (moveWeight) this.stride += dt * 10;
    const swing = Math.sin(this.stride) * 0.43 * moveWeight;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.8;
    this.rightArm.rotation.x = swing * 0.8;
    this.torso.position.y = Math.abs(Math.sin(this.stride)) * 0.045 * moveWeight;
    this.torso.rotation.z = Math.sin(this.stride) * 0.018 * moveWeight;
    this.group.position.y = terrainHeight(this.group.position.x, this.group.position.z);
  }
}
