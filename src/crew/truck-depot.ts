import * as THREE from 'three';
import type { Obstacle, Point2 } from '../navigation/grid';
import { terrainHeight } from '../world/ground';

/** Truck-side equipment box, with a single tangible fuse that changes hands. */
export class TruckDepot {
  readonly group = new THREE.Group();
  readonly standPoint: Point2 = { x: 7.7, z: 8.4 };
  readonly returnPoint: Point2 = { x: 10.7, z: 8.9 };
  readonly secondReturnPoint: Point2 = { x: 8.0, z: 8.5 };
  readonly hitbox: THREE.Mesh;
  readonly labelPoint = new THREE.Vector3(8, 3.05, 7);
  readonly item: THREE.Group;
  private lid = new THREE.Group();
  private indicator: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, obstacles: Obstacle[]) {
    this.group.position.set(8.0, terrainHeight(8.0, 7.0), 7.0);
    scene.add(this.group);
    const mat = (color: number) => new THREE.MeshStandardMaterial({
      color, roughness: 0.82, metalness: 0.14, flatShading: true,
    });
    const body = mat(0x495f5b), edge = mat(0xb8a36f), dark = mat(0x354541);
    const cube = (parent: THREE.Object3D, x: number, y: number, z: number,
      w: number, h: number, d: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true; mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    // Hollow enclosure rather than a solid block under the closed lid.
    cube(this.group, 0, 0.16, 0, 1.75, 0.32, 1.2, body);
    for (const sign of [-1, 1]) {
      cube(this.group, 0, 0.59, sign * 0.53, 1.75, 0.54, 0.14, body);
      cube(this.group, sign * 0.81, 0.59, 0, 0.13, 0.54, 1.18, body);
    }
    for (const x of [-0.76, 0.76]) cube(this.group, x, 0.46, 0.61, 0.12, 0.69, 0.1, edge);
    cube(this.group, 0, 0.15, 0.68, 1.78, 0.11, 0.13, dark);
    cube(this.group, 0, 0.51, 0.64, 0.38, 0.20, 0.08, edge);
    this.indicator = mat(0xdec17e);
    cube(this.group, 0.54, 0.58, 0.65, 0.20, 0.17, 0.09, this.indicator);
    this.lid.position.set(0, 0.86, -0.58);
    this.group.add(this.lid);
    cube(this.lid, 0, 0.055, 0.58, 1.83, 0.14, 1.25, dark);
    for (const x of [-0.55, 0.55]) cube(this.lid, x, 0.15, 0.6, 0.13, 0.09, 1.17, edge);

    // Unique component, never an abstract inventory counter. This same mesh
    // transfers from the crate to Mica, to Rook, and into the cabinet.
    this.item = new THREE.Group();
    const plug = cube(this.item, 0, 0, 0, 0.17, 0.42, 0.14, mat(0xd8b973));
    cube(this.item, 0, 0.22, 0, 0.28, 0.07, 0.16, dark);
    cube(this.item, 0, -0.22, 0, 0.28, 0.07, 0.16, dark);
    plug.castShadow = true;
    this.group.add(this.item);
    this.item.position.set(0.3, 0.58, 0.15);

    this.hitbox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 1.9),
      new THREE.MeshBasicMaterial({ opacity: 0, transparent: true, colorWrite: false, depthWrite: false }));
    this.hitbox.position.set(0, 0.96, 0);
    this.group.add(this.hitbox);
    obstacles.push({ kind: 'box', x: 8, z: 7, halfX: 0.96, halfZ: 0.70 });
  }

  attachTo(anchor: THREE.Object3D) {
    anchor.add(this.item);
    this.item.position.set(0, 0, 0);
    this.item.rotation.set(0, 0, Math.PI * 0.06);
    this.item.scale.setScalar(1.1);
    this.item.visible = true;
  }

  update(retrieving: boolean, hasTruckFuse: boolean, phaseTime: number) {
    const desired = retrieving ? -1.35 : 0;
    this.lid.rotation.x += (desired - this.lid.rotation.x) * 0.15;
    this.indicator.color.setHex(hasTruckFuse ? 0xc7b780 : 0x515957);
    if (this.item.parent === this.group) {
      this.item.visible = hasTruckFuse;
      this.item.position.set(0.3, 0.58 + (retrieving ? Math.sin(phaseTime * 3.3) * 0.03 : 0), 0.15);
    }
  }

  resetItem() {
    this.group.add(this.item);
    this.item.position.set(0.3, 0.58, 0.15);
    this.item.rotation.set(0, 0, 0);
    this.item.scale.setScalar(1);
    this.item.visible = true;
    this.lid.rotation.x = 0;
  }
}
