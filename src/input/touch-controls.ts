import type { Axis } from './control-math';
import { stickAxis, stickZone } from './control-math';
import { TacticalCamera } from './tactical-camera';

type Role = 'pending' | 'left' | 'right' | 'pan' | 'orbit' | 'gesture';
type Pointer = {
  startX: number; startY: number;
  x: number; y: number;
  role: Role;
  zone: 'left' | 'right' | null;
  kind: string;
};
type Gesture = { x: number; y: number; distance: number; angle: number };

export class TouchControls {
  readonly move: Axis = { x: 0, y: 0 };
  private readonly right: Axis = { x: 0, y: 0 };
  private readonly canvas: HTMLCanvasElement;
  private readonly tacticalCamera: TacticalCamera;
  private readonly onTap: (x: number, y: number) => void;
  private readonly pointers = new Map<number, Pointer>();
  private readonly bases: Record<'left' | 'right', HTMLElement>;
  private readonly knobs: Record<'left' | 'right', HTMLElement>;
  private gesture: Gesture | null = null;
  private hadMultiple = false;
  private readonly radius = 54;

  constructor(canvas: HTMLCanvasElement, tacticalCamera: TacticalCamera, onTap: (x: number, y: number) => void) {
    this.canvas = canvas;
    this.tacticalCamera = tacticalCamera;
    this.onTap = onTap;
    const parent = canvas.parentElement!;
    this.bases = { left: this.createStick(parent, 'left'), right: this.createStick(parent, 'right') };
    this.knobs = {
      left: this.bases.left.querySelector<HTMLElement>('.stick-knob')!,
      right: this.bases.right.querySelector<HTMLElement>('.stick-knob')!,
    };
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.movePointer);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancel);
    canvas.addEventListener('lostpointercapture', this.cancel);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('blur', () => this.reset());
  }

  private createStick(parent: HTMLElement, zone: 'left' | 'right') {
    const base = document.createElement('div');
    base.className = 'floating-stick floating-stick--' + zone;
    base.setAttribute('aria-hidden', 'true');
    base.innerHTML = '<div class="stick-ring"></div><div class="stick-knob"></div><span class="stick-caption">' +
      (zone === 'left' ? 'MOVE' : 'ORBIT') + '</span>';
    parent.appendChild(base);
    return base;
  }

  private positionStick(zone: 'left' | 'right', x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = Math.max(61, Math.min(rect.width - 61, x - rect.left));
    const cy = Math.max(70, Math.min(rect.height - 66, y - rect.top));
    const base = this.bases[zone];
    base.style.left = cx + 'px';
    base.style.top = cy + 'px';
    base.classList.add('visible');
    this.knobs[zone].style.transform = 'translate(-50%, -50%)';
  }

  private hide(zone: 'left' | 'right') {
    this.bases[zone].classList.remove('visible');
    if (zone === 'left') { this.move.x = 0; this.move.y = 0; }
    else { this.right.x = 0; this.right.y = 0; }
  }

  private isTouch(event: PointerEvent) { return event.pointerType === 'touch' || event.pointerType === 'pen'; }

  private down = (event: PointerEvent) => {
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    const rect = this.canvas.getBoundingClientRect();
    const zone = this.isTouch(event)
      ? stickZone(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height)
      : null;
    this.pointers.set(event.pointerId, {
      x: event.clientX, y: event.clientY,
      startX: event.clientX, startY: event.clientY,
      role: event.button === 2 ? 'orbit' : 'pending',
      zone, kind: event.pointerType,
    });
    if (this.pointers.size === 1) {
      this.hadMultiple = false;
      this.gesture = null;
    }
    if (this.pointers.size === 2) {
      this.hadMultiple = true;
      const pair = [...this.pointers.values()];
      const independent = pair.every(p => p.zone) && pair[0].zone !== pair[1].zone;
      if (!independent) {
        pair.forEach(p => p.role = 'gesture');
        this.hide('left'); this.hide('right');
        this.gesture = this.gestureInfo(pair[0], pair[1]);
      }
    }
  };

  private gestureInfo(a: Pointer, b: Pointer): Gesture {
    return {
      x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
    };
  }

  private movePointer = (event: PointerEvent) => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;
    event.preventDefault();
    const previousX = pointer.x, previousY = pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (pointer.role === 'gesture') {
      const pair = [...this.pointers.values()].filter(p => p.role === 'gesture');
      if (pair.length !== 2) return;
      const now = this.gestureInfo(pair[0], pair[1]);
      const before = this.gesture ?? now;
      this.tacticalCamera.pan(now.x - before.x, now.y - before.y);
      if (now.distance > 8 && before.distance > 8) this.tacticalCamera.zoom(before.distance / now.distance);
      let twist = now.angle - before.angle;
      twist = Math.atan2(Math.sin(twist), Math.cos(twist));
      // Positive visual twist follows fingers, correcting the prior reversed yaw.
      this.tacticalCamera.orbit(twist, 0);
      this.gesture = now;
      return;
    }
    if (pointer.role === 'pending') {
      const distance = Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY);
      if (distance < (this.isTouch(event) ? 12 : 5)) return;
      if (pointer.zone && this.isTouch(event)) {
        const otherStick = [...this.pointers.values()].some(p => p !== pointer && p.zone === pointer.zone && (p.role === pointer.zone));
        pointer.role = otherStick ? 'pan' : pointer.zone;
        if (pointer.role === 'left' || pointer.role === 'right') {
          this.positionStick(pointer.role, pointer.startX, pointer.startY);
        }
      } else {
        pointer.role = event.buttons === 2 || (event.pointerType === 'mouse' && event.shiftKey) ? 'orbit' : 'pan';
      }
    }
    if (pointer.role === 'left' || pointer.role === 'right') {
      const zone = pointer.role;
      const axis = stickAxis(pointer.x - pointer.startX, pointer.y - pointer.startY, this.radius);
      const target = zone === 'left' ? this.move : this.right;
      target.x = axis.x; target.y = axis.y;
      const base = this.bases[zone];
      const baseRect = this.canvas.getBoundingClientRect();
      const centeredX = baseRect.left + parseFloat(base.style.left);
      const centeredY = baseRect.top + parseFloat(base.style.top);
      const dx = pointer.x - centeredX, dy = pointer.y - centeredY;
      const length = Math.hypot(dx, dy);
      const ratio = length ? Math.min(1, this.radius / length) : 0;
      this.knobs[zone].style.transform = `translate(calc(-50% + ${dx * ratio}px), calc(-50% + ${dy * ratio}px))`;
    } else if (pointer.role === 'pan') {
      this.tacticalCamera.pan(pointer.x - previousX, pointer.y - previousY);
    } else if (pointer.role === 'orbit') {
      // Dragging right should move the visible scene right, not backwards.
      this.tacticalCamera.orbit(-(pointer.x - previousX) * 0.008, (pointer.y - previousY) * 0.006);
    }
  };

  private finish(event: PointerEvent, cancelled: boolean) {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;
    const tap = !cancelled && pointer.role === 'pending' && !this.hadMultiple &&
      event.button !== 2 && Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) <= 12;
    if (pointer.role === 'left' || pointer.role === 'right') this.hide(pointer.role);
    this.pointers.delete(event.pointerId);
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    if (this.pointers.size < 2) {
      this.gesture = null;
      for (const remaining of this.pointers.values()) {
        if (remaining.role === 'gesture') remaining.role = 'pan';
      }
    }
    if (!this.pointers.size) this.hadMultiple = false;
    if (tap) this.onTap(event.clientX, event.clientY);
  }

  private up = (event: PointerEvent) => this.finish(event, false);
  private cancel = (event: PointerEvent) => this.finish(event, true);
  private wheel = (event: WheelEvent) => {
    event.preventDefault();
    this.tacticalCamera.zoom(Math.exp(event.deltaY * 0.0011));
  };

  update(dt: number) {
    if (this.right.x !== 0 || this.right.y !== 0) {
      const amount = Math.min(dt, 0.05);
      this.tacticalCamera.orbit(-this.right.x * amount * 1.85, this.right.y * amount * 0.95);
    }
  }

  get driving() {
    return this.pointers.size > 0 &&
      [...this.pointers.values()].some(p => p.role === 'left');
  }

  private reset() {
    this.pointers.clear();
    this.gesture = null;
    this.hide('left'); this.hide('right');
    this.hadMultiple = false;
  }
}
