import * as THREE from 'three';
import type { Point2 } from '../navigation/grid';

type Contact = { x: number; y: number };
export class TacticalCamera {
  readonly camera = new THREE.OrthographicCamera();
  private readonly canvas: HTMLCanvasElement;
  private readonly onTap: (x: number, y: number) => void;
  private readonly pointers = new Map<number, Contact>();
  private readonly origins = new Map<number, Contact>();
  private target = new THREE.Vector3(-8, 0, -1);
  private desiredTarget = this.target.clone();
  private height = 36;
  private desiredHeight = 36;
  private yaw = 0.78;
  private pitch = 0.82;
  private width = 1;
  private viewportHeight = 1;
  private dragged = false;
  private multiTouch = false;

  constructor(canvas: HTMLCanvasElement, onTap: (x: number, y: number) => void) {
    this.canvas = canvas;
    this.onTap = onTap;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerCancel);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private pointerDown = (event: PointerEvent) => {
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    if (this.pointers.size === 0) { this.dragged = false; this.multiTouch = false; }
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.origins.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size > 1) { this.multiTouch = true; this.dragged = true; }
  };

  private pointerMove = (event: PointerEvent) => {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;
    event.preventDefault();
    if (this.pointers.size === 1) {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      // Tiny movements are deliberately ignored, so a tap isn't interpreted as a pan.
      const origin = this.origins.get(event.pointerId)!;
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 5) this.dragged = true;
      if (this.dragged && !this.multiTouch) {
        if (event.buttons === 2 || (event.pointerType === 'mouse' && event.shiftKey)) {
          this.orbit(dx * 0.007, -dy * 0.005);
        } else {
          this.pan(dx, dy);
        }
      }
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      return;
    }
    const all = [...this.pointers.entries()];
    if (all.length < 2) return;
    const first = all[0][1], second = all[1][1];
    const centerBefore = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const distanceBefore = Math.hypot(first.x - second.x, first.y - second.y);
    const angleBefore = Math.atan2(second.y - first.y, second.x - first.x);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = [...this.pointers.values()];
    const a = current[0], b = current[1];
    const centerAfter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const distanceAfter = Math.hypot(a.x - b.x, a.y - b.y);
    const angleAfter = Math.atan2(b.y - a.y, b.x - a.x);
    this.pan(centerAfter.x - centerBefore.x, centerAfter.y - centerBefore.y);
    if (distanceBefore > 5 && distanceAfter > 5) this.zoom(distanceBefore / distanceAfter);
    let twist = angleAfter - angleBefore;
    twist = Math.atan2(Math.sin(twist), Math.cos(twist));
    this.orbit(-twist, 0);
  };

  private pointerUp = (event: PointerEvent) => {
    if (!this.pointers.has(event.pointerId)) return;
    const original = this.origins.get(event.pointerId)!;
    const isTap = this.pointers.size === 1 && !this.dragged && !this.multiTouch &&
      event.button !== 2 && Math.hypot(event.clientX - original.x, event.clientY - original.y) < 9;
    this.pointers.delete(event.pointerId);
    this.origins.delete(event.pointerId);
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    if (isTap) this.onTap(event.clientX, event.clientY);
  };
  private pointerCancel = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    this.origins.delete(event.pointerId);
  };
  private wheel = (event: WheelEvent) => {
    event.preventDefault();
    this.zoom(Math.exp(event.deltaY * 0.0011));
  };

  private pan(dx: number, dy: number) {
    const scale = this.desiredHeight / this.viewportHeight;
    const rightX = Math.cos(this.yaw), rightZ = -Math.sin(this.yaw);
    const nearX = Math.sin(this.yaw), nearZ = Math.cos(this.yaw);
    this.desiredTarget.x -= (dx * rightX + dy * nearX) * scale;
    this.desiredTarget.z -= (dx * rightZ + dy * nearZ) * scale;
    this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -38, 38);
    this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -28, 28);
  }

  zoom(factor: number) {
    this.desiredHeight = THREE.MathUtils.clamp(this.desiredHeight * factor, 14, 70);
  }

  orbit(horizontal: number, vertical: number) {
    this.yaw += horizontal;
    this.pitch = THREE.MathUtils.clamp(this.pitch + vertical, 0.46, 1.32);
  }

  focus(point: Point2) {
    this.desiredTarget.set(point.x, 0, point.z);
    this.desiredHeight = Math.min(this.desiredHeight, 33);
  }

  groundPoint(clientX: number, clientY: number): Point2 | null {
    const bounds = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    if (Math.abs(hit.x) > 41 || Math.abs(hit.z) > 31) return null;
    return { x: hit.x, z: hit.z };
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    this.reframe();
  }

  private reframe() {
    const aspect = this.width / this.viewportHeight;
    this.camera.left = -this.height * aspect / 2;
    this.camera.right = this.height * aspect / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.camera.near = 0.1;
    this.camera.far = 210;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number) {
    const alpha = 1 - Math.exp(-Math.min(dt, 0.05) * 9);
    this.target.lerp(this.desiredTarget, alpha);
    const before = this.height;
    this.height = THREE.MathUtils.lerp(this.height, this.desiredHeight, alpha);
    if (Math.abs(this.height - before) > 0.00001) this.reframe();
    const distance = 65;
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * distance,
      this.target.y + Math.sin(this.pitch) * distance,
      this.target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * distance,
    );
    this.camera.lookAt(this.target);
  }
}
