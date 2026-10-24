import * as THREE from 'three';
import { cameraOffset, clampZoom, viewSize } from './camera-model';
import './style.css';

// Build 000: one slab in an otherwise empty scene. No actors or game loop.
const canvas = document.querySelector<HTMLCanvasElement>('#app');
if (!canvas) throw new Error('Missing ground viewport');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfc9c2);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'low-power',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;

scene.add(new THREE.HemisphereLight(0xeaf1e2, 0x655a49, 2.1));
const sun = new THREE.DirectionalLight(0xffe5b9, 2.2);
sun.position.set(-6, 14, 10);
scene.add(sun);

// A single physical mesh, 10 m by 10 m, with its top at y = 0.
// Different top/side materials still represent ONE continuous block.
const grass = new THREE.MeshStandardMaterial({
  color: 0x7c9072, roughness: 1, flatShading: true,
});
const earth = new THREE.MeshStandardMaterial({
  color: 0x756959, roughness: 1, flatShading: true,
});
const ground = new THREE.Mesh(
  new THREE.BoxGeometry(10, 0.8, 10),
  [earth, earth, grass, earth, earth, earth],
);
ground.position.y = -0.4;
scene.add(ground);

const camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 120);
const state = { yaw: Math.PI / 4, zoom: 1 };
const orbitDistance = 28;
const target = new THREE.Vector3(0, -0.12, 0);

function render() {
  const offset = cameraOffset(state.yaw, orbitDistance);
  camera.position.set(offset.x, offset.y, offset.z);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  renderer.render(scene, camera);
}

function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  renderer.setSize(width, height, false);
  const frame = viewSize(width, height, state.zoom);
  camera.left = -frame.width / 2;
  camera.right = frame.width / 2;
  camera.top = frame.height / 2;
  camera.bottom = -frame.height / 2;
  camera.updateProjectionMatrix();
  render();
}

function rotate(pixelDelta: number) {
  state.yaw -= pixelDelta * 0.008;
  render();
}
function zoom(factor: number) {
  state.zoom = clampZoom(state.zoom * factor);
  resize();
}

type Pointer = { x: number; y: number };
const pointers = new Map<number, Pointer>();
let lastX = 0;
let initialPinch = 0;
let initialZoom = 1;

function pinchDistance() {
  const [a, b] = [...pointers.values()];
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1) lastX = event.clientX;
  if (pointers.size === 2) {
    initialPinch = pinchDistance();
    initialZoom = state.zoom;
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (!pointers.has(event.pointerId)) return;
  event.preventDefault();
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1) {
    rotate(event.clientX - lastX); // Only horizontal orbit: pitch never changes.
    lastX = event.clientX;
  } else if (pointers.size === 2 && initialPinch > 0) {
    state.zoom = clampZoom(initialZoom * pinchDistance() / initialPinch);
    resize();
  }
});

function release(event: PointerEvent) {
  pointers.delete(event.pointerId);
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  if (pointers.size === 1) {
    lastX = [...pointers.values()][0].x;
  }
  if (pointers.size < 2) initialPinch = 0;
}

canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
window.addEventListener('blur', () => {
  pointers.clear();
  initialPinch = 0;
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  zoom(Math.exp(-event.deltaY * 0.0015));
}, { passive: false });
canvas.addEventListener('contextmenu', event => event.preventDefault());

window.addEventListener('keydown', (event) => {
  switch (event.key.toLowerCase()) {
    case 'q': case 'arrowleft': rotate(-25); break;
    case 'e': case 'arrowright': rotate(25); break;
    case '=': case '+': zoom(1.15); break;
    case '-': case '_': zoom(1 / 1.15); break;
    default: return;
  }
  event.preventDefault();
});
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);

resize();
