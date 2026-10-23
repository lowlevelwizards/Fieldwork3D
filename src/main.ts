import * as THREE from 'three';
import { Operator } from './actors/operator';
import { BUILD_VERSION, OPERATOR_START } from './constants';
import { TacticalCamera } from './input/tactical-camera';
import { NavigationGrid } from './navigation/grid';
import { createWorld } from './world/create-world';
import './style.css';

const viewport = document.querySelector<HTMLElement>('#viewport')!;
const status = document.querySelector<HTMLElement>('#operatorState')!;
const coordinates = document.querySelector<HTMLElement>('#operatorCoords')!;
const message = document.querySelector<HTMLElement>('#message')!;
document.querySelector<HTMLElement>('#buildVersion')!.textContent = BUILD_VERSION;

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch {
  viewport.innerHTML = '<div style="padding:28px;color:#fff;background:#253a39">Unable to start WebGL. Try a browser with hardware acceleration enabled.</div>';
  throw new Error('Fieldwork 3D requires WebGL');
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const world = createWorld();
const nav = new NavigationGrid(world.obstacles);
const operator = new Operator(world.scene, OPERATOR_START);
let toastDeadline = 0;
let lastState = '';
let markerTime = 0;
let keyMovement = { x: 0, z: 0 };

function showMessage(text: string, seconds = 2) {
  message.textContent = text;
  message.classList.add('visible');
  toastDeadline = performance.now() + seconds * 1000;
}

const controls = new TacticalCamera(renderer.domElement, (clientX, clientY) => {
  const point = controls.groundPoint(clientX, clientY);
  if (!point) { showMessage('OUTSIDE THE FIELD AREA'); return; }
  const path = nav.findPath(operator.position, point);
  if (!path.length) { showMessage('NO ACCESSIBLE ROUTE'); return; }
  operator.follow(path);
  world.placeWaypoint(path[path.length - 1]);
  markerTime = 0;
});
controls.resize(viewport.clientWidth, viewport.clientHeight);

const activate = (id: string, callback: () => void) => {
  document.querySelector<HTMLButtonElement>(id)!.addEventListener('click', callback);
};
activate('#zoomIn', () => controls.zoom(0.78));
activate('#zoomOut', () => controls.zoom(1.28));
activate('#orbitLeft', () => controls.orbit(-Math.PI / 8, 0));
activate('#orbitRight', () => controls.orbit(Math.PI / 8, 0));
activate('#focusOperator', () => controls.focus(operator.position));

window.addEventListener('keydown', event => {
  if (event.repeat && ['KeyF', 'KeyQ', 'KeyE'].includes(event.code)) return;
  switch (event.code) {
    case 'KeyF': controls.focus(operator.position); break;
    case 'KeyQ': controls.orbit(-Math.PI / 8, 0); break;
    case 'KeyE': controls.orbit(Math.PI / 8, 0); break;
    case 'Equal': case 'NumpadAdd': controls.zoom(0.83); break;
    case 'Minus': case 'NumpadSubtract': controls.zoom(1.2); break;
    case 'ArrowLeft': case 'KeyA': keyMovement.x = -1; break;
    case 'ArrowRight': case 'KeyD': keyMovement.x = 1; break;
    case 'ArrowUp': case 'KeyW': keyMovement.z = -1; break;
    case 'ArrowDown': case 'KeyS': keyMovement.z = 1; break;
    default: return;
  }
  event.preventDefault();
});
window.addEventListener('keyup', event => {
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) keyMovement.x = 0;
  if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(event.code)) keyMovement.z = 0;
});
window.addEventListener('blur', () => { keyMovement = { x: 0, z: 0 }; });
function resize() {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  renderer.setSize(width, height, false);
  controls.resize(width, height);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

const clock = new THREE.Clock();
let elapsed = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  // Keyboard navigation is useful on desktop and avoids a second control path for the operator.
  if (keyMovement.x || keyMovement.z) {
    const p = operator.position;
    const step = 2.0;
    const target = { x: p.x + keyMovement.x * step, z: p.z + keyMovement.z * step };
    if (nav.isWalkable(target)) operator.follow([target]);
  }
  operator.update(dt);
  controls.update(dt);
  if (world.waypoint.visible) {
    markerTime += dt;
    const scale = 1 + Math.sin(markerTime * 4) * 0.08;
    world.waypoint.scale.setScalar(scale);
    if (!operator.moving && markerTime > 0.25) world.waypoint.visible = false;
  }
  const state = operator.moving ? 'MOVING TO WAYPOINT' : 'STANDING BY';
  if (state !== lastState) {
    status.textContent = state;
    lastState = state;
  }
  if (elapsed > 0.2) {
    const p = operator.position;
    coordinates.textContent = `GRID ${p.x.toFixed(1)} / ${p.z.toFixed(1)}`;
    elapsed = 0;
  }
  if (toastDeadline && performance.now() > toastDeadline) {
    message.classList.remove('visible');
    toastDeadline = 0;
  }
  renderer.render(world.scene, controls.camera);
});
