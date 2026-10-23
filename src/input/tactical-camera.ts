import * as THREE from 'three';
import type { Point2 } from '../navigation/grid';
import { initialViewHeight, maxViewHeight, screenToGround, type Axis } from './control-math';
import { WORLD_DEPTH, WORLD_WIDTH } from '../constants';

export class TacticalCamera {
  readonly camera = new THREE.OrthographicCamera();
  private readonly canvas: HTMLCanvasElement;
  private readonly target = new THREE.Vector3(-8, 0, -1);
  private readonly desiredTarget = this.target.clone();
  private height = 38;
  private desiredHeight = 38;
  private yaw = 0.78;
  private pitch = 0.82;
  private width = 1;
  private viewportHeight = 1;
  private isSized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  get heading(): number { return this.yaw; }

  get aspect(): number { return this.width / this.viewportHeight; }

  get framing(): { height: number; width: number; aspect: number } {
    return { height: this.height, width: this.height * this.aspect, aspect: this.aspect };
  }

  screenDirection(axis: Axis): Point2 {
    return screenToGround(axis, this.yaw);
  }

  pan(dx: number, dy: number) {
    // Signed against pointer displacement so the map follows the hand.
    const scale = this.desiredHeight / this.viewportHeight;
    const near = screenToGround({ x: 0, y: 1 }, this.yaw);
    const right = screenToGround({ x: 1, y: 0 }, this.yaw);
    const depthCorrection = 1 / Math.max(0.55, Math.sin(this.pitch));
    this.desiredTarget.x -= dx * scale * right.x - dy * scale * depthCorrection * near.x;
    this.desiredTarget.z -= dx * scale * right.z - dy * scale * depthCorrection * near.z;
    this.constrain();
  }

  zoom(factor: number) {
    this.desiredHeight = THREE.MathUtils.clamp(
      this.desiredHeight * factor, 13, maxViewHeight(this.aspect),
    );
  }

  orbit(horizontal: number, vertical: number) {
    this.yaw += horizontal;
    this.pitch = THREE.MathUtils.clamp(this.pitch + vertical, 0.50, 1.31);
    this.constrain();
  }

  focus(point: Point2) {
    this.desiredTarget.set(point.x, 0, point.z);
    this.constrain();
    this.desiredHeight = Math.min(this.desiredHeight, 30);
  }

  private constrain() {
    // Keep the camera's point of attention well inside the playable terrain.
    // Retain a smaller travel range as the orthographic viewport grows.
    const xMargin = THREE.MathUtils.clamp(this.desiredHeight * this.aspect * 0.20, 5, 27);
    const zMargin = THREE.MathUtils.clamp(this.desiredHeight * 0.18, 5, 17);
    this.desiredTarget.x = THREE.MathUtils.clamp(
      this.desiredTarget.x, -WORLD_WIDTH / 2 + xMargin, WORLD_WIDTH / 2 - xMargin,
    );
    this.desiredTarget.z = THREE.MathUtils.clamp(
      this.desiredTarget.z, -WORLD_DEPTH / 2 + zMargin, WORLD_DEPTH / 2 - zMargin,
    );
  }

  resize(width: number, height: number) {
    const oldAspect = this.aspect;
    this.width = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    const newAspect = this.aspect;
    if (!this.isSized) {
      this.height = this.desiredHeight = initialViewHeight(newAspect);
      this.isSized = true;
    } else if ((oldAspect < 1) !== (newAspect < 1)) {
      // Explicit rotation policy: landscape is wider, not a stretched portrait crop.
      this.height = this.desiredHeight = initialViewHeight(newAspect);
    } else {
      this.desiredHeight = Math.min(this.desiredHeight, maxViewHeight(newAspect));
      this.height = Math.min(this.height, maxViewHeight(newAspect));
    }
    this.constrain();
    this.reframe();
    this.update(0);
  }

  private reframe() {
    const aspect = this.aspect;
    this.camera.left = -this.height * aspect / 2;
    this.camera.right = this.height * aspect / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.camera.near = 0.1;
    this.camera.far = 220;
    this.camera.updateProjectionMatrix();
  }

  groundPoint(clientX: number, clientY: number): Point2 | null {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    const ndc = new THREE.Vector2(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    if (Math.abs(hit.x) > WORLD_WIDTH / 2 - 1 || Math.abs(hit.z) > WORLD_DEPTH / 2 - 1) return null;
    return { x: hit.x, z: hit.z };
  }

  update(dt: number) {
    const alpha = 1 - Math.exp(-Math.min(Math.max(dt, 0), 0.06) * 10);
    this.target.lerp(this.desiredTarget, alpha);
    const previousHeight = this.height;
    this.height = THREE.MathUtils.lerp(this.height, this.desiredHeight, alpha);
    if (Math.abs(previousHeight - this.height) > 0.00001) this.reframe();

    const distance = 75;
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * distance,
      this.target.y + Math.sin(this.pitch) * distance,
      this.target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * distance,
    );
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }
}
