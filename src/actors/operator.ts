import * as THREE from 'three';
import { terrainHeight } from '../world/ground';
import type { NavigationGrid, Point2 } from '../navigation/grid';
import type { RelayPhase } from '../fieldwork/relay-procedure';

const material = (color: number) => new THREE.MeshStandardMaterial({
  color, roughness: 0.92, metalness: 0.02, flatShading: true,
});
type Leg = { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group };

export class Operator {
  readonly group = new THREE.Group();
  private readonly legs: Leg[] = [];
  private readonly arms: THREE.Group[] = [];
  private readonly torso = new THREE.Group();
  private readonly velocity: Point2 = { x: 0, z: 0 };
  private driveIntent: Point2 | null = null;
  private route: Point2[] = [];
  private stride = 0;
  private animationWeight = 0;
  private readonly maxSpeed = 3.4;
  private workPhase: RelayPhase = 'idle';
  private workWeight = 0;
  private workTime = 0;
  private faceTarget: Point2 | null = null;
  private readonly tool = new THREE.Group();
  private readonly meter = new THREE.Group();
  private readonly meterProbe = new THREE.Group();
  private meterTexture: THREE.CanvasTexture | null = null;
  private meterCanvas: HTMLCanvasElement | null = null;
  private lastVoltage = -1;
  readonly itemAnchor = new THREE.Group();
  private readonly head = new THREE.Group();
  private social: 'none' | 'carry' | 'collect' | 'handoff' | 'receive' | 'wait' = 'none';
  private socialTarget: Point2 | null = null;
  private socialClock = 0;
  private readonly alternate: boolean;

  constructor(scene: THREE.Scene, start: Point2, identity: 'rook' | 'mica' = 'rook') {
    this.alternate = identity === 'mica';
    const jacket = material(this.alternate ? 0x687f76 : 0x53665d);
    const jacketShade = material(this.alternate ? 0x3f595b : 0x364a45);
    const fabric = material(this.alternate ? 0x596268 : 0x66695b);
    const boots = material(0x313d3c);
    const kit = material(this.alternate ? 0x8b7662 : 0xa18a61);
    const face = material(this.alternate ? 0xab896e : 0xbda287);
    const accent = material(this.alternate ? 0xd0b67e : 0xc08a59);

    const part = (parent: THREE.Object3D, w: number, h: number, d: number,
      x: number, y: number, z: number, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    this.group.add(this.torso);
    part(this.torso, 0.86, 0.95, 0.47, 0, 1.69, 0, jacket);
    part(this.torso, 0.94, 0.22, 0.52, 0, 2.15, 0, jacketShade);
    part(this.torso, 0.12, 0.85, 0.07, -0.25, 1.72, 0.28, kit).rotation.z = -0.28;
    part(this.torso, 0.35, 0.47, 0.22, 0.31, 1.58, 0.34, jacketShade);
    part(this.torso, 0.66, 0.84, 0.25, 0, 1.67, -0.4, kit);
    part(this.torso, 0.47, 0.26, 0.28, 0, 2.0, -0.55, kit);
    part(this.torso, 0.12, 0.45, 0.12, 0.27, 2.29, -0.56, jacketShade);
    this.torso.add(this.head);
    part(this.head, 0.44, 0.42, 0.42, 0, 2.42, 0.04, face);
    part(this.head, 0.57, 0.25, 0.54, 0, 2.66, 0.01, jacketShade);
    part(this.head, 0.57, 0.06, 0.25, 0, 2.59, 0.34, jacketShade);
    part(this.head, 0.17, 0.1, 0.05, 0, 2.42, 0.265, boots);
    if (this.alternate) {
      part(this.torso, 0.93, 0.15, 0.56, 0, 2.09, 0, accent);
      part(this.torso, 0.25, 0.45, 0.17, -0.5, 1.65, 0.08, accent);
    }

    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.245, 1.23, 0);
      this.group.add(hip);
      part(hip, 0.33, 0.65, 0.36, 0, -0.33, 0, fabric);
      const knee = new THREE.Group();
      knee.position.set(0, -0.65, 0);
      hip.add(knee);
      part(knee, 0.38, 0.52, 0.4, 0, -0.27, 0.03, fabric);
      const ankle = new THREE.Group();
      ankle.position.set(0, -0.53, 0.04);
      knee.add(ankle);
      part(ankle, 0.4, 0.2, 0.66, 0, -0.012, 0.14, boots);
      this.legs.push({ hip, knee, ankle });
    }
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.56, 2.03, 0);
      this.torso.add(arm);
      part(arm, 0.31, 0.55, 0.35, 0, -0.3, 0, jacket);
      part(arm, 0.3, 0.46, 0.32, 0, -0.76, 0.05, fabric);
      part(arm, 0.33, 0.18, 0.34, 0, -1.01, 0.08, boots);
      if (side === -1) part(arm, 0.345, 0.20, 0.36, 0, -0.37, 0.01, accent);
      this.arms.push(arm);
    }

    // The folding work tool is attached to Rook's right forearm, visible
    // while handling the relay enclosure rather than an abstract progress bar.
    this.arms[1].add(this.itemAnchor);
    this.itemAnchor.position.set(0.15, -1.1, 0.37);
    this.arms[1].add(this.tool);
    part(this.tool, 0.11, 0.62, 0.10, 0.16, -0.95, 0.18, kit);
    part(this.tool, 0.38, 0.12, 0.12, 0.16, -0.64, 0.18, boots);
    this.tool.visible = false;

    if (!this.alternate) {
      // Handheld low-poly meter in the left hand; real probes contact the
      // inspected machine as the operator turns and reaches forward.
      this.arms[0].add(this.meter);
      part(this.meter, 0.33, 0.52, 0.17, 0, -1.07, 0.29, boots);
      part(this.meter, 0.28, 0.35, 0.035, 0, -1.02, 0.39, kit);
      for (let i = 0; i < 2; i++) {
        part(this.meter, 0.065, 0.065, 0.04, -0.075 + i * 0.15, -1.22, 0.43, accent);
      }
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 96;
      this.meterCanvas = canvas;
      this.meterTexture = new THREE.CanvasTexture(canvas);
      this.meterTexture.magFilter = THREE.NearestFilter;
      this.meterTexture.minFilter = THREE.NearestFilter;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.20),
        new THREE.MeshBasicMaterial({ map: this.meterTexture, transparent: false }));
      screen.position.set(0, -0.96, 0.414);
      this.meter.add(screen);
      this.setMeterReading(0);
      this.arms[1].add(this.meterProbe);
      part(this.meterProbe, 0.07, 0.58, 0.07, 0.12, -1.13, 0.41, accent);
      part(this.meterProbe, 0.045, 0.25, 0.045, 0.12, -0.71, 0.41, boots);
      const cable = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(-.03,-1.30,.33),
          new THREE.Vector3(.07,-1.43,.51),
          new THREE.Vector3(.16,-1.25,.51),
          new THREE.Vector3(.12,-1.04,.41),
        ]), 10, 0.017, 4, false),
        material(0x9e4d3d));
      this.meterProbe.add(cable);
      this.meter.visible = false;
      this.meterProbe.visible = false;
    }

    const groundShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 20),
      new THREE.MeshBasicMaterial({ color: 0x152b2c, transparent: true, opacity: 0.17, depthWrite: false }),
    );
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = 0.045;
    this.group.add(groundShadow);
    this.group.position.set(start.x, terrainHeight(start.x, start.z), start.z);
    scene.add(this.group);
  }

  get position(): Point2 { return { x: this.group.position.x, z: this.group.position.z }; }

  setWork(phase: RelayPhase, target: Point2) {
    this.workPhase = phase;
    this.faceTarget = phase === 'idle' || phase === 'approaching' || phase === 'complete' ? null : target;
  }

  setMeterReading(voltage: number) {
    const rounded = Math.round(voltage * 10) / 10;
    if (rounded === this.lastVoltage || !this.meterCanvas || !this.meterTexture) return;
    this.lastVoltage = rounded;
    const g = this.meterCanvas.getContext('2d');
    if (!g) return;
    g.fillStyle = '#2c4032'; g.fillRect(0, 0, 128, 96);
    g.fillStyle = '#c8e5a2'; g.font = 'bold 46px monospace';
    g.textAlign = 'right';
    g.fillText(rounded.toFixed(1), 115, 53);
    g.font = '16px monospace';
    g.fillText('V AC', 111, 78);
    this.meterTexture.needsUpdate = true;
  }

  clearRoute() { this.route.length = 0; }

  setSocialPose(mode: 'none' | 'carry' | 'collect' | 'handoff' | 'receive' | 'wait',
    target: Point2 | null = null) {
    this.social = mode;
    this.socialTarget = target;
  }

  get velocityMagnitude() { return Math.hypot(this.velocity.x, this.velocity.z); }


  get moving(): boolean {
    return this.route.length > 0 || Math.hypot(this.velocity.x, this.velocity.z) > 0.13;
  }

  follow(path: Point2[]) {
    this.route = [...path];
    this.driveIntent = null;
  }

  setDrive(vector: Point2 | null) {
    this.driveIntent = vector ? { ...vector } : null;
    if (vector) this.route = [];
  }

  update(delta: number, navigation: NavigationGrid) {
    const dt = Math.min(Math.max(delta, 0), 0.05);
    const position = this.group.position;
    let desiredX = 0, desiredZ = 0;

    if (this.driveIntent) {
      const magnitude = Math.hypot(this.driveIntent.x, this.driveIntent.z);
      if (magnitude > 0.001) {
        const speed = Math.min(1, magnitude) * this.maxSpeed;
        desiredX = this.driveIntent.x / magnitude * speed;
        desiredZ = this.driveIntent.z / magnitude * speed;
      }
    } else {
      while (this.route.length > 0 &&
        Math.hypot(this.route[0].x - position.x, this.route[0].z - position.z) < 0.33) this.route.shift();
      if (this.route.length > 0) {
        const p = this.route[0];
        const dx = p.x - position.x, dz = p.z - position.z;
        const distance = Math.hypot(dx, dz);
        const final = this.route.length === 1;
        // Gradual braking at destination but full pace through longer routes.
        const speed = final ? Math.min(this.maxSpeed, Math.sqrt(2 * 6.5 * distance)) : this.maxSpeed;
        desiredX = dx / distance * speed;
        desiredZ = dz / distance * speed;
      }
    }

    // Procedural actions have exclusive locomotion ownership while their
    // timed phase is running. Thumb locomotion may resume between stages.
    const working = !['idle', 'approaching', 'complete'].includes(this.workPhase);
    const busy = ['opening', 'inspecting', 'replacing', 'closing'].includes(this.workPhase);
    if (busy) { desiredX = 0; desiredZ = 0; }
    const currentSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const targetSpeed = Math.hypot(desiredX, desiredZ);
    const limit = (targetSpeed > currentSpeed ? 8.2 : 12.0) * dt;
    const dvx = desiredX - this.velocity.x, dvz = desiredZ - this.velocity.z;
    const deltaLength = Math.hypot(dvx, dvz);
    if (deltaLength <= limit) {
      this.velocity.x = desiredX; this.velocity.z = desiredZ;
    } else if (deltaLength > 0) {
      this.velocity.x += dvx / deltaLength * limit;
      this.velocity.z += dvz / deltaLength * limit;
    }

    const dx = this.velocity.x * dt, dz = this.velocity.z * dt;
    let movedX = 0, movedZ = 0;
    if (navigation.canOccupy({ x: position.x + dx, z: position.z + dz })) {
      position.x += dx; position.z += dz;
      movedX = dx; movedZ = dz;
    } else {
      // Separate the axes: gently slide along obstacles rather than snagging.
      if (navigation.canOccupy({ x: position.x + dx, z: position.z })) {
        position.x += dx; movedX = dx;
      } else { this.velocity.x = 0; }
      if (navigation.canOccupy({ x: position.x, z: position.z + dz })) {
        position.z += dz; movedZ = dz;
      } else { this.velocity.z = 0; }
    }
    position.y = terrainHeight(position.x, position.z);
    const speed = Math.hypot(movedX, movedZ) / Math.max(dt, 0.0001);
    const gazeTarget = this.socialTarget ?? this.faceTarget;
    if (speed > 0.03 || (gazeTarget && this.velocityMagnitude < 0.4)) {
      const heading = gazeTarget && this.velocityMagnitude < 0.4
        ? Math.atan2(gazeTarget.x - position.x, gazeTarget.z - position.z)
        : Math.atan2(movedX, movedZ);
      const angularDifference = Math.atan2(
        Math.sin(heading - this.group.rotation.y),
        Math.cos(heading - this.group.rotation.y),
      );
      this.group.rotation.y += angularDifference * (1 - Math.exp(-dt * 9));
    }

    // Animate from actual foot travel rather than time: no marching in place.
    this.stride += Math.hypot(movedX, movedZ) * 4.65;
    const weight = Math.min(1, speed / 2.6);
    this.animationWeight += (weight - this.animationWeight) * (1 - Math.exp(-dt * 11));
    const w = this.animationWeight;
    const desiredWork = working ? 1 : 0;
    this.workWeight += (desiredWork - this.workWeight) * (1 - Math.exp(-dt * 5));
    if (working) this.workTime += dt;
    else this.workTime = 0;
    const work = this.workWeight;
    for (let i = 0; i < this.legs.length; i++) {
      const phase = this.stride + i * Math.PI;
      const swing = Math.sin(phase);
      const forwardSwing = swing * 0.40 * w;
      const kneeBend = Math.max(0, -swing) * 0.48 * w;
      const leg = this.legs[i];
      // A planted kneeling stance and one raised working knee.
      leg.hip.rotation.x = forwardSwing * (1 - work) + (i === 0 ? 0.57 : -0.18) * work;
      leg.knee.rotation.x = kneeBend * (1 - work) + (i === 0 ? -0.94 : 0.86) * work;
      leg.ankle.rotation.x = (-forwardSwing - kneeBend * 0.65) * (1 - work) +
        (i === 0 ? 0.37 : -0.35) * work;
      // Small swing-foot clearance, while the planted foot stays near the surface.
      leg.ankle.position.y = -0.53 + Math.max(0, -swing) * 0.12 * w * (1 - work);
    }
    const handMovement = Math.sin(this.workTime * 10) * 0.12 *
      (this.workPhase === 'replacing' || this.workPhase === 'inspecting' ? 1 : 0.2);
    this.arms[0].rotation.x = -Math.sin(this.stride) * 0.27 * w * (1 - work) -
      (0.59 + handMovement) * work;
    this.arms[1].rotation.x = Math.sin(this.stride) * 0.27 * w * (1 - work) -
      (0.97 - handMovement) * work;
    this.arms[0].rotation.z = -0.08 * work;
    this.arms[1].rotation.z = -0.18 * work;
    const measuring = this.workPhase === 'inspecting' && work > 0.35 && !this.alternate;
    this.meter.visible = measuring;
    this.meterProbe.visible = measuring;
    this.tool.visible = work > 0.4 && ['replacing', 'inspected'].includes(this.workPhase);
    if (measuring) {
      // Meter stays near Rook's chest; probe arm reaches the equipment.
      this.arms[0].rotation.x = -0.52;
      this.arms[1].rotation.x = -1.27 + Math.sin(this.workTime * 3.6) * 0.035;
    }
    this.torso.position.y = Math.abs(Math.sin(this.stride)) * 0.055 * w * (1 - work) -
      0.28 * work;
    this.torso.rotation.z = Math.sin(this.stride) * 0.024 * w * (1 - work);
    this.torso.rotation.x = -0.04 * w + 0.20 * work;
    this.socialClock += dt;
    this.head.rotation.y = 0.10 * Math.sin(this.socialClock * 0.47) +
      (this.socialTarget ? 0.045 * Math.sin(this.socialClock * 0.9) : 0);
    if (this.social === 'carry' || this.social === 'collect') {
      this.arms[1].rotation.x = -0.45;
      this.arms[1].rotation.z = -0.19;
    } else if (this.social === 'handoff') {
      this.arms[1].rotation.x = -1.18 - Math.sin(this.socialClock * 3.2) * 0.05;
      this.arms[1].rotation.z = -0.36;
    } else if (this.social === 'receive') {
      this.arms[1].rotation.x = -1.18;
      this.arms[1].rotation.z = -0.19;
      this.arms[0].rotation.x = -0.6;
    } else if (this.social === 'wait') {
      this.arms[1].rotation.x *= 0.3;
      this.arms[0].rotation.x *= 0.3;
    }

    // Use a small deadband for stable arrival, after deceleration completes.
    if (!this.driveIntent && !this.route.length && targetSpeed < 0.001 && currentSpeed < 0.035) {
      this.velocity.x = 0; this.velocity.z = 0;
    }
  }
}
