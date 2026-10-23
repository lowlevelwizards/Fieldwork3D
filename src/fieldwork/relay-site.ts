import * as THREE from 'three';
import type { Obstacle, Point2 } from '../navigation/grid';
import { terrainHeight } from '../world/ground';
import type { RelayPhase } from './relay-procedure';
import type { FieldIncident } from './field-incident';

export type RelayBeacon = { lamp: THREE.Mesh; light: THREE.PointLight };
const metal = (color: number, emissive = 0x000000) =>
  new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.8, metalness: 0.25, flatShading: true });

function block(parent: THREE.Object3D, size: [number, number, number],
  position: [number, number, number], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A field asset exposes a world-space working point, a selection volume and
 * physical state. Later repairables can implement the same shape. */
export class RelaySite {
  readonly group = new THREE.Group();
  readonly location: Point2;
  readonly standPoint: Point2;
  readonly hitbox: THREE.Mesh;
  readonly labelPoint = new THREE.Vector3();
  readonly marker = new THREE.Group();
  private readonly door = new THREE.Group();
  private readonly fuse: THREE.Mesh;
  private readonly fuseMaterial: THREE.MeshStandardMaterial;
  private readonly indicator: THREE.Mesh;
  private readonly indicatorMaterial: THREE.MeshStandardMaterial;
  private readonly beacon: RelayBeacon;
  private readonly serviceLight: THREE.PointLight;
  private readonly terminal: THREE.Mesh;
  private readonly contactor: THREE.Group;
  private readonly spark: THREE.Group;
  private readonly cable: THREE.Mesh;

  constructor(scene: THREE.Scene, obstacles: Obstacle[], location: Point2, beacon: RelayBeacon) {
    this.location = location;
    this.standPoint = { x: location.x, z: location.z + 1.32 };
    this.beacon = beacon;
    this.group.position.set(location.x, terrainHeight(location.x, location.z), location.z);
    scene.add(this.group);

    const olive = metal(0x566960);
    const trim = metal(0x334d4b);
    const black = metal(0x273737);
    const bronze = metal(0xc3a66c);
    block(this.group, [1.52, 2.25, 0.9], [0, 1.18, 0], olive);
    block(this.group, [1.27, 1.9, 0.06], [0, 1.2, 0.485], black);
    block(this.group, [1.0, 0.12, 0.14], [0, 2.04, 0.55], trim);
    block(this.group, [0.75, 0.10, 0.10], [0, 1.15, 0.57], olive);
    for (const y of [0.69, 1.22, 1.74]) {
      block(this.group, [0.17, 0.32, 0.10], [-0.45, y, 0.57], bronze);
    }
    const connectors = [0.04, 0.35];
    for (const x of connectors) {
      const fitting = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.17, 8), bronze);
      fitting.rotation.x = Math.PI / 2;
      fitting.position.set(x, 0.77, 0.63);
      this.group.add(fitting);
    }
    this.fuseMaterial = metal(0xb44f39);
    this.fuse = block(this.group, [0.23, 0.55, 0.18], [0.25, 1.58, 0.64], this.fuseMaterial);
    block(this.group, [0.38, 0.1, 0.21], [0.25, 1.88, 0.61], bronze);
    block(this.group, [0.38, 0.1, 0.21], [0.25, 1.28, 0.61], bronze);

    // Distinct serviceable internals: terminal clamp, wired feed, contactor.
    this.terminal = block(this.group, [0.36,0.26,0.27], [-0.28,1.46,0.70], metal(0xbca773));
    this.cable = block(this.group, [0.11,0.70,0.12], [-0.30,1.07,0.73], trim);
    this.contactor = new THREE.Group();
    this.contactor.position.set(0.34,0.97,0.68);
    this.group.add(this.contactor);
    block(this.contactor, [0.42,0.42,0.22], [0,0,0], black);
    block(this.contactor, [0.19,0.30,0.14], [0,0.13,0.14], bronze);
    this.spark = new THREE.Group();
    this.spark.position.set(-0.28,1.47,0.82);
    this.group.add(this.spark);
    const glow = new THREE.MeshBasicMaterial({ color: 0xffd18c, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 5; i++) {
      const arc = new THREE.Mesh(new THREE.ConeGeometry(0.06,0.42,3), glow);
      arc.rotation.z = i * Math.PI * 2 / 5;
      arc.position.set(Math.cos(i * 1.25) * 0.17, Math.sin(i * 1.25) * 0.12,0);
      this.spark.add(arc);
    }
    this.spark.visible = false;

    // Door hinge on the left, swinging physically outward to the operator.
    this.door.position.set(-0.76, 0, 0.58);
    this.group.add(this.door);
    block(this.door, [1.46, 2.22, 0.10], [0.73, 1.17, 0.02], olive);
    block(this.door, [1.16, 0.12, 0.065], [0.74, 1.83, 0.087], trim);
    block(this.door, [0.18, 0.48, 0.08], [1.30, 1.20, 0.11], bronze);
    block(this.door, [0.77, 0.43, 0.07], [0.61, 1.46, 0.10], trim);
    block(this.door, [0.56, 0.12, 0.075], [0.61, 1.46, 0.15], bronze);

    this.indicatorMaterial = metal(0x9e533b, 0xb44a2e);
    this.indicator = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), this.indicatorMaterial);
    this.indicator.position.set(0.51, 2.48, 0.39);
    this.group.add(this.indicator);
    this.serviceLight = new THREE.PointLight(0xf1b564, 0, 5, 2);
    this.serviceLight.position.set(0.51, 2.5, 0.5);
    this.group.add(this.serviceLight);

    // Selection volume is deliberately larger than the cabinet's narrow face
    // so taps remain easy at phone scale. Transparent geometry is raycastable.
    this.hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 3.0, 1.7),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    this.hitbox.position.set(0, 1.45, 0.25);
    this.group.add(this.hitbox);

    const mark = new THREE.Mesh(
      new THREE.RingGeometry(0.29, 0.39, 24),
      new THREE.MeshBasicMaterial({ color: 0xe6cd92, transparent: true, opacity: 0.9,
        depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.marker.add(mark);
    this.marker.position.set(0, 2.87, 0.1);
    this.group.add(this.marker);

    // A local conduit visibly carries restored power away from the enclosure.
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 1.3, 8),
      trim,
    );
    cable.position.set(-0.5, 0.36, -0.1);
    cable.rotation.z = -Math.PI / 2;
    this.group.add(cable);

    obstacles.push({ kind: 'box', x: location.x, z: location.z, halfX: 0.84, halfZ: 0.55 });
    this.labelPoint.set(location.x, this.group.position.y + 3.35, location.z);
  }

  resetIncident() {
    this.door.rotation.y = 0;
    this.spark.visible = false;
    this.marker.visible = true;
  }

  updateIncident(incident: FieldIncident, seconds: number, camera: THREE.Camera) {
    const p = incident.phase;
    const phase: RelayPhase =
      p === 'idle' || p === 'approaching' ? 'idle' :
      p === 'opening' || p === 'open' || p === 'inspecting' ? p :
      p === 'working' ? 'replacing' :
      p === 'prepared' || p === 'testing' || p === 'secondary' || p === 'diagnosed' ? 'inspected' :
      p === 'closing' ? 'closing' :
      p === 'complete' ? 'complete' : 'open';
    const progress = p === 'opening' ? incident.timer / 1.25 :
      p === 'closing' ? incident.timer / 1.35 : incident.completion;
    this.update(phase, progress, seconds, camera);
    const exposed = ['open','inspecting','diagnosed','working','prepared','testing','secondary','deferred'].includes(p);
    this.fuse.visible = incident.fault === 'fuse' || !incident.diagnosed;
    this.terminal.visible = incident.fault === 'terminal' || !incident.diagnosed;
    this.cable.visible = incident.fault === 'terminal' || !incident.diagnosed;
    this.contactor.visible = incident.fault === 'contactor' || !incident.diagnosed;
    const affected = incident.diagnosed && !incident.replacementInstalled;
    this.fuseMaterial.color.setHex(affected ? 0xb44f39 : 0xcbb77d);
    (this.terminal.material as THREE.MeshStandardMaterial).color.setHex(
      incident.fault === 'terminal' && affected ? 0x94523f : 0xbca773);
    this.cable.rotation.z = incident.fault === 'terminal' && affected ? -0.28 : 0;
    this.contactor.rotation.x = incident.fault === 'contactor' && affected ? 0.52 : 0.0;
    this.spark.visible = exposed && incident.tripped && incident.phase === 'secondary' &&
      Math.sin(seconds * 27) > 0.55;
    this.spark.rotation.z = seconds * 4;
    const deferred = incident.phase === 'deferred';
    if (deferred) {
      this.indicatorMaterial.color.setHex(0xa59458);
      this.indicatorMaterial.emissive.setHex(0x8f5c28);
      this.indicatorMaterial.emissiveIntensity = 0.75;
      this.marker.visible = false;
    }
  }

  update(phase: RelayPhase, progress: number, seconds: number, camera: THREE.Camera) {
    const repaired = phase === 'complete';
    const opening = phase === 'opening';
    const closing = phase === 'closing';
    const open = ['open', 'inspecting', 'inspected', 'replacing', 'replaced'].includes(phase);
    const openFactor = opening ? progress : closing ? 1 - progress : open ? 1 : 0;
    const desired = -1.78 * openFactor;
    this.door.rotation.y += (desired - this.door.rotation.y) * 0.2;

    const fuseChanged = phase === 'replaced' || closing || repaired;
    this.fuseMaterial.color.setHex(fuseChanged ? 0xc7b47a : 0xb44f39);
    this.fuse.position.z = phase === 'replacing'
      ? 0.64 + Math.sin(progress * Math.PI) * 0.37
      : 0.64;
    this.fuse.rotation.z = phase === 'replacing' ? Math.sin(progress * Math.PI * 2) * 0.11 : 0;

    this.indicatorMaterial.color.setHex(repaired ? 0x79b79a : 0xa46f50);
    this.indicatorMaterial.emissive.setHex(repaired ? 0x60db9c : 0x7b281d);
    this.indicatorMaterial.emissiveIntensity = repaired ? 1.8 : 0.25;
    this.serviceLight.intensity = repaired ? 1.5 : 0;

    const beaconOn = repaired && Math.sin(seconds * 3.2) > -0.05;
    const material = this.beacon.lamp.material as THREE.MeshStandardMaterial;
    material.color.setHex(repaired ? 0xf3c98a : 0x847969);
    material.emissive.setHex(0xffab49);
    material.emissiveIntensity = beaconOn ? 2.7 : 0;
    this.beacon.light.intensity = beaconOn ? 1.8 : 0;

    this.marker.visible = !repaired;
    this.marker.quaternion.copy(camera.quaternion);
    this.marker.scale.setScalar(1 + Math.sin(seconds * 3.7) * 0.12);
  }
}
