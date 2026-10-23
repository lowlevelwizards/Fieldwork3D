import * as THREE from 'three';
import { Operator } from './actors/operator';
import { OPERATOR_START } from './constants';
import { TacticalCamera } from './input/tactical-camera';
import { TouchControls } from './input/touch-controls';
import type { Axis } from './input/control-math';
import { NavigationGrid } from './navigation/grid';
import { createWorld } from './world/create-world';
import './style.css';

const viewport = document.querySelector<HTMLElement>('#viewport')!;
const message = document.querySelector<HTMLElement>('#message')!;

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
const controls = new TacticalCamera(renderer.domElement);
let toastDeadline = 0;
let markerTime = 0;

function showMessage(text: string, seconds = 1.7) {
  message.textContent = text;
  message.classList.add('visible');
  toastDeadline = performance.now() + seconds * 1000;
}

const touch = new TouchControls(renderer.domElement, controls, (clientX, clientY) => {
  const point = controls.groundPoint(clientX, clientY);
  if (!point) { showMessage('OUTSIDE THE FIELD AREA'); return; }
  const path = nav.findPath(operator.position, point);
  if (!path.length) { showMessage('NO ACCESSIBLE ROUTE'); return; }
  operator.follow(path);
  world.placeWaypoint(path[path.length - 1]);
  markerTime = 0;
});


const pressed = new Set<string>();
const movementCodes = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);
window.addEventListener('keydown', event => {
  if (event.code === 'KeyF' && !event.repeat) controls.focus(operator.position);
  else if (event.code === 'KeyQ' && !event.repeat) controls.orbit(Math.PI / 8, 0);
  else if (event.code === 'KeyE' && !event.repeat) controls.orbit(-Math.PI / 8, 0);
  else if (event.code === 'Equal' || event.code === 'NumpadAdd') controls.zoom(0.87);
  else if (event.code === 'Minus' || event.code === 'NumpadSubtract') controls.zoom(1.13);
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

// Canvas dimensions come from the element's actual CSS size, not screen.width,
// which can lag an iPhone orientation change. ResizeObserver also catches
// viewport/safe-area changes that never fire a traditional window resize.
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
  controls.resize(width, height);
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
controls.update(0);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  touch.update(dt);

  const keys = keyboardAxis();
  const driving = touch.driving || keys.x !== 0 || keys.y !== 0;
  const axis = touch.driving ? touch.move : keys;
  operator.setDrive(driving ? controls.screenDirection(axis) : null);
  operator.update(dt, nav);
  if (driving) controls.follow(operator.position, dt);
  controls.update(dt);

  if (world.waypoint.visible) {
    markerTime += dt;
    const scale = 1 + Math.sin(markerTime * 4) * 0.08;
    world.waypoint.scale.setScalar(scale);
    if (!operator.moving && markerTime > 0.25) world.waypoint.visible = false;
  }
  if (toastDeadline && performance.now() > toastDeadline) {
    message.classList.remove('visible');
    toastDeadline = 0;
  }
  renderer.render(world.scene, controls.camera);
});
