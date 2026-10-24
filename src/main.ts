import * as THREE from 'three';
import { cameraOffset, clampZoom, viewSize } from './camera-model';
import { ATMOSPHERE, DAYLIGHT } from './environment-conditions';
import './style.css';

// Ground Zero: a slab, incident light, its cast shadow, and a misty sky.
 // No actors, objects, game events, or simulated weather cycle.
const mount = document.querySelector<HTMLCanvasElement>('#app');
if (!mount) throw new Error('Missing ground viewport');
const canvas: HTMLCanvasElement = mount;

const scene = new THREE.Scene();
// Transparent clear reveals the sky gradient behind the canvas.
 // The world itself uses explicit distance-dependent atmospheric scattering.
scene.fog = new THREE.FogExp2(ATMOSPHERE.hazeColor, ATMOSPHERE.hazeDensity);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'low-power',
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.setClearColor(0xffffff, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Sky fill and a directional light are separate, verifiable illumination.
scene.add(new THREE.HemisphereLight(
  DAYLIGHT.skyFillColor, DAYLIGHT.groundFillColor, DAYLIGHT.skyFillIntensity,
));
const sun = new THREE.DirectionalLight(DAYLIGHT.color, DAYLIGHT.intensity);
sun.position.set(DAYLIGHT.direction.x, DAYLIGHT.direction.y, DAYLIGHT.direction.z);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -10;
sun.shadow.camera.right = 10;
sun.shadow.camera.top = 10;
sun.shadow.camera.bottom = -10;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 38;
sun.shadow.bias = -0.00012;
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
ground.castShadow = true;
ground.receiveShadow = true;
scene.add(ground);

// Shadow catcher: a transparent presentation surface, not another world tile.
// It lets the one block actually occlude the directional light.
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(19, 19),
  new THREE.ShadowMaterial({ color: 0x344136, opacity: 0.26 }),
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = -0.92;
shadow.receiveShadow = true;
scene.add(shadow);

// A thin, soft-edged fog veil is a visual representation of low-lying mist.
// It has no collision, resources, weather logic, or gameplay state.
const veil = new THREE.Mesh(
  new THREE.PlaneGeometry(13, 13),
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      hazeColor: { value: new THREE.Color(ATMOSPHERE.mistColor) },
      opacity: { value: ATMOSPHERE.groundMistOpacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 hazeColor;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float edgeFade = 1.0 - smoothstep(0.47, 0.97, max(abs(p.x), abs(p.y)));
        float wisp = 0.5 + 0.5 * sin(vUv.x * 18.0 + sin(vUv.y * 11.0) * 2.6)
                                   * cos(vUv.y * 12.0 - vUv.x * 5.0);
        gl_FragColor = vec4(hazeColor, opacity * edgeFade * (0.55 + 0.8 * wisp));
      }
    `,
  }),
);
veil.rotation.x = -Math.PI / 2;
veil.position.y = 0.14;
veil.renderOrder = 1;
scene.add(veil);

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
