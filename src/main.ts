import * as THREE from 'three';
import { Operator } from './actors/operator';
import { FieldAudio } from './audio/field-audio';
import { OPERATOR_START } from './constants';
import { RelayProcedure, type RelayPhase } from './fieldwork/relay-procedure';
import { TacticalCamera } from './input/tactical-camera';
import { TouchControls } from './input/touch-controls';
import type { Axis } from './input/control-math';
import { NavigationGrid } from './navigation/grid';
import { createWorld } from './world/create-world';
import './style.css';

const viewport = document.querySelector<HTMLElement>('#viewport')!;
const message = document.querySelector<HTMLElement>('#message')!;
const contextAction = document.querySelector<HTMLButtonElement>('#contextAction')!;

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true, alpha: false, powerPreference: 'high-performance',
  });
} catch {
  viewport.innerHTML = '<div style="padding:28px;color:#fff;background:#253a39">Unable to start WebGL. Try a browser with hardware acceleration enabled.</div>';
  throw new Error('Fieldwork 3D requires WebGL');
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const world = createWorld();
const nav = new NavigationGrid(world.obstacles);
const operator = new Operator(world.scene, OPERATOR_START);
const camera = new TacticalCamera(renderer.domElement);
const audio = new FieldAudio();
const storageKey = 'fieldwork3d.cedar-relay-restored-v1';
let restored = false;
try { restored = localStorage.getItem(storageKey) === 'true'; } catch { /* private storage disabled */ }
const procedure = new RelayProcedure(restored);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let toastDeadline = 0;
let markerTime = 0;
let runtimeSeconds = 0;
let previousPhase: RelayPhase = procedure.phase;
let pendingRelayAction = false;
let footDistance = 0;
let lastFootPosition = operator.position;

function showMessage(text: string, seconds = 1.65) {
  message.textContent = text;
  message.classList.add('visible');
  toastDeadline = performance.now() + seconds * 1000;
}

function nearRelay() {
  return Math.hypot(operator.position.x - world.relay.standPoint.x,
    operator.position.z - world.relay.standPoint.z) < 0.48;
}

function pickRelay(clientX: number, clientY: number) {
  const rect = renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  pointer.set((clientX - rect.left) / rect.width * 2 - 1,
    -((clientY - rect.top) / rect.height * 2 - 1));
  raycaster.setFromCamera(pointer, camera.camera);
  return raycaster.intersectObject(world.relay.hitbox, false).length > 0;
}

function relayInteract() {
  audio.unlock();
  if (procedure.complete) {
    showMessage('RELAY ONLINE');
    return;
  }
  if (procedure.busy || procedure.travelling) return;
  if (nearRelay()) {
    if (procedure.interact(true)) {
      operator.clearRoute();
      world.waypoint.visible = false;
    }
    return;
  }
  // Works equally for the initial approach or resuming an open cabinet after
  // stepping away. Reuse the same physical destination and navigation rules.
  const path = nav.findPath(operator.position, world.relay.standPoint);
  if (!path.length) {
    showMessage('NO ROUTE TO CABINET');
    return;
  }
  pendingRelayAction = true;
  if (procedure.phase === 'idle') procedure.interact(false);
  operator.follow(path);
  world.placeWaypoint(path[path.length - 1]);
  markerTime = 0;
}

renderer.domElement.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
contextAction.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
contextAction.addEventListener('click', () => relayInteract());

const touch = new TouchControls(renderer.domElement, camera, (clientX, clientY) => {
  if (pickRelay(clientX, clientY)) {
    relayInteract();
    return;
  }
  const point = camera.groundPoint(clientX, clientY);
  if (!point) { showMessage('OUTSIDE THE FIELD AREA'); return; }
  if (!procedure.complete && Math.hypot(point.x - world.relay.location.x,
    point.z - world.relay.location.z) < 1.25) {
    relayInteract();
    return;
  }
  if (procedure.busy) return;
  const path = nav.findPath(operator.position, point);
  if (!path.length) { showMessage('NO ACCESSIBLE ROUTE'); return; }
  pendingRelayAction = false;
  procedure.cancelApproach();
  operator.follow(path);
  world.placeWaypoint(path[path.length - 1]);
  markerTime = 0;
});

const pressed = new Set<string>();
const movementCodes = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);
window.addEventListener('keydown', event => {
  if (event.code === 'KeyF' && !event.repeat) camera.focus(operator.position);
  else if (event.code === 'KeyQ' && !event.repeat) camera.orbit(Math.PI / 8, 0);
  else if (event.code === 'KeyE' && !event.repeat) camera.orbit(-Math.PI / 8, 0);
  else if (event.code === 'Equal' || event.code === 'NumpadAdd') camera.zoom(0.87);
  else if (event.code === 'Minus' || event.code === 'NumpadSubtract') camera.zoom(1.13);
  else if (event.code === 'KeyM' && !event.repeat) audio.toggleMute();
  else if (event.code === 'KeyR' && event.shiftKey && !event.repeat) {
    try { localStorage.removeItem(storageKey); } catch { /* no storage */ }
    location.reload();
  }
  else if (movementCodes.has(event.code)) pressed.add(event.code);
  else return;
  event.preventDefault();
});
window.addEventListener('keyup', event => pressed.delete(event.code));
window.addEventListener('blur', () => pressed.clear());

function keyboardAxis(): Axis {
  const x = Number(pressed.has('ArrowRight') || pressed.has('KeyD')) -
    Number(pressed.has('ArrowLeft') || pressed.has('KeyA'));
  const y = Number(pressed.has('ArrowUp') || pressed.has('KeyW')) -
    Number(pressed.has('ArrowDown') || pressed.has('KeyS'));
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

let previousWidth = 0, previousHeight = 0, previousPixelRatio = 0;
function resize() {
  const box = viewport.getBoundingClientRect();
  const width = Math.max(1, Math.round(box.width));
  const height = Math.max(1, Math.round(box.height));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
  if (width === previousWidth && height === previousHeight && pixelRatio === previousPixelRatio) return;
  previousWidth = width; previousHeight = height; previousPixelRatio = pixelRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.resize(width, height);
}
const observer = new ResizeObserver(resize);
observer.observe(viewport);
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => {
  requestAnimationFrame(() => {
    resize();
    requestAnimationFrame(resize);
  });
});
resize();
camera.update(0);

function onPhaseChanged(phase: RelayPhase) {
  switch (phase) {
    case 'opening':
      audio.play('latch');
      showMessage('OPENING SERVICE PANEL');
      break;
    case 'open': showMessage('EXPOSED ELECTRICAL ASSEMBLY'); break;
    case 'inspecting':
      audio.play('inspect');
      showMessage('INSPECTING FUSE');
      break;
    case 'inspected': showMessage('BLOWN FUSE FOUND'); break;
    case 'replacing':
      audio.play('tool');
      showMessage('REPLACING COMPONENT');
      break;
    case 'replaced': showMessage('FUSE SECURED'); break;
    case 'closing':
      audio.play('switch');
      showMessage('CLOSING PANEL / RESTORING POWER');
      break;
    case 'complete':
      audio.play('power');
      showMessage('CEDAR RELAY · POWER RESTORED', 3.5);
      try { localStorage.setItem(storageKey, 'true'); } catch { /* session-only */ }
      break;
  }
}

// Context is localized to the physical machine and is absent elsewhere.
function positionPrompt() {
  const visible = !procedure.complete && !procedure.busy &&
    !procedure.travelling && nearRelay() && !!procedure.prompt;
  contextAction.hidden = !visible;
  if (!visible) return;
  contextAction.textContent = procedure.prompt!;
  const p = world.relay.labelPoint.clone().project(camera.camera);
  if (p.z < -1 || p.z > 1) {
    contextAction.hidden = true;
    return;
  }
  const box = viewport.getBoundingClientRect();
  const x = (p.x * 0.5 + 0.5) * box.width;
  const y = (-p.y * 0.5 + 0.5) * box.height;
  contextAction.style.left = Math.min(box.width - 86, Math.max(86, x)) + 'px';
  contextAction.style.top = Math.min(box.height - 38, Math.max(48, y)) + 'px';
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  runtimeSeconds += dt;
  touch.update(dt);

  const keys = keyboardAxis();
  const wantsDrive = touch.driving || keys.x !== 0 || keys.y !== 0;
  const driving = wantsDrive && !procedure.busy;
  if (driving && procedure.travelling) {
    pendingRelayAction = false;
    procedure.cancelApproach();
    operator.clearRoute();
  }
  const axis = touch.driving ? touch.move : keys;
  operator.setDrive(driving ? camera.screenDirection(axis) : null);
  operator.setWork(nearRelay() ? procedure.phase : 'idle', world.relay.location);
  operator.update(dt, nav);
  if (driving) camera.follow(operator.position, dt);
  camera.update(dt);

  const near = nearRelay();
  // An ordered task keeps its obligation while navigating to the service point.
  if (pendingRelayAction && near) {
    if (procedure.travelling) procedure.update(0, true);
    else procedure.interact(true);
    pendingRelayAction = false;
    operator.clearRoute();
    world.waypoint.visible = false;
  }
  procedure.update(dt, near);
  if (procedure.phase !== previousPhase) {
    onPhaseChanged(procedure.phase);
    previousPhase = procedure.phase;
  }
  world.relay.update(procedure.phase, procedure.progress, runtimeSeconds, camera.camera);
  audio.update(procedure.complete);

  const position = operator.position;
  const walked = Math.hypot(position.x - lastFootPosition.x, position.z - lastFootPosition.z);
  footDistance += walked;
  if (footDistance > 1.45) {
    audio.play('footstep');
    footDistance %= 1.45;
  }
  lastFootPosition = position;

  if (world.waypoint.visible) {
    markerTime += dt;
    world.waypoint.scale.setScalar(1 + Math.sin(markerTime * 4) * 0.08);
    if (!operator.moving && markerTime > 0.25) world.waypoint.visible = false;
  }
  if (toastDeadline && performance.now() > toastDeadline) {
    message.classList.remove('visible');
    toastDeadline = 0;
  }
  positionPrompt();
  renderer.render(world.scene, camera.camera);
});
