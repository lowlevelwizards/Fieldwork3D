import * as THREE from 'three';
import { cameraOffset, clampZoom, viewSize } from './camera-model';
import { CloudField } from './clouds';
import { cloudCoverAtHour } from './cloud-model';
import { RainField } from './rain';
import { StandingWater } from './standing-water';
import { PuddleField } from './puddles';
import { rainAtHour } from './rain-model';
import {
  DAY_LENGTH_SECONDS, INITIAL_HOUR, advanceHour, clockLabel, cssColor,
  environmentAtHour, type EnvironmentState,
} from './environment-conditions';
import './style.css';

// Ground Zero: one slab. The clock drives light, clouds, rainfall, mist and damp ground.
// No gameplay characters, navigation, economy or faction logic.
const mount = document.querySelector<HTMLCanvasElement>('#app');
if (!mount) throw new Error('Missing ground viewport');
const canvas: HTMLCanvasElement = mount;
const timeToggle = document.querySelector<HTMLButtonElement>('#timeToggle');
const timeScrub = document.querySelector<HTMLInputElement>('#timeScrub');
const timeLabel = document.querySelector<HTMLOutputElement>('#timeLabel');
const phaseLabel = document.querySelector<HTMLElement>('#phaseLabel');
const cloudCoverInput = document.querySelector<HTMLInputElement>('#cloudCover');
const cloudCoverLabel = document.querySelector<HTMLElement>('#cloudCoverLabel');
const cloudAuto = document.querySelector<HTMLButtonElement>('#cloudAuto');
const rainLabel = document.querySelector<HTMLElement>('#rainLabel');
const waterLabel = document.querySelector<HTMLElement>('#waterLabel');
const clearWaterButton = document.querySelector<HTMLButtonElement>('#waterClear');
if (!timeToggle || !timeScrub || !timeLabel || !phaseLabel ||
    !cloudCoverInput || !cloudCoverLabel || !cloudAuto || !rainLabel ||
    !waterLabel || !clearWaterButton) {
  throw new Error('Missing time-of-day inspector');
}
const controls = { toggle: timeToggle, scrub: timeScrub, clock: timeLabel, phase: phaseLabel,
  cloudCover: cloudCoverInput, cloudLabel: cloudCoverLabel, cloudAuto,
  rainLabel, waterLabel, clearWater: clearWaterButton };

let hour = INITIAL_HOUR;
let playing = true;
// Null restores natural cover. An override is inspection only, not another clock.
let cloudCoverOverride: number | null = null;
// Surface water is an accumulated world quantity, deliberately separate from
// the reversible time-of-day preview (scrubbing time deposits nothing).
const WATER_SAVE_KEY = 'fieldwork-ground-zero-water-007';
let savedVolumes: unknown;
try {
  const json = window.localStorage.getItem(WATER_SAVE_KEY);
  if (json) savedVolumes = JSON.parse(json);
} catch { /* private browsing or disabled storage still supports water */ }
const standingWater = new StandingWater(savedVolumes);
let waterNeedsSave = false;
function saveStandingWater(): void {
  try {
    window.localStorage.setItem(WATER_SAVE_KEY,
      JSON.stringify(standingWater.snapshot().volumesLiters));
    waterNeedsSave = false;
  } catch { /* storage is optional; water still accumulates this session */ }
}

const scene = new THREE.Scene();
// Transparent rendering exposes the time-varying gradient beneath canvas.
const initial = environmentAtHour(hour);
scene.fog = new THREE.FogExp2(initial.hazeColor, initial.hazeDensity);

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
renderer.localClippingEnabled = true;

// Fill and directional sunlight are physically distinct illumination sources.
const skyFill = new THREE.HemisphereLight(
  initial.fillColor, initial.groundFillColor, initial.fillIntensity,
);
scene.add(skyFill);
const sun = new THREE.DirectionalLight(initial.sunColor, initial.sunlight);
sun.position.set(
  initial.sunDirection.x * 25,
  initial.sunDirection.y * 25,
  initial.sunDirection.z * 25,
);
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
const dryGrass = grass.color.clone();
const wetGrass = new THREE.Color(0x3d5e53);
const dryEarth = earth.color.clone();
const wetEarth = new THREE.Color(0x484641);

// Shadow catcher: a transparent presentation surface, not another world tile.
// It lets the one block actually occlude the directional light.
const shadowMaterial = new THREE.ShadowMaterial({
  color: 0x344136, opacity: initial.shadowOpacity,
});
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(19, 19), shadowMaterial,
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
      hazeColor: { value: new THREE.Color(initial.mistColor) },
      opacity: { value: initial.mistOpacity },
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

// All clouds and their projected shadows are clipped to the original slab.
const clouds = new CloudField(scene);
const rainField = new RainField(scene);
const puddles = new PuddleField(scene);
const rainFogTone = new THREE.Color(0x91a0a6);

function applyEnvironment(e: EnvironmentState) {
  const cover = cloudCoverOverride ?? cloudCoverAtHour(e.hour);
  const rain = rainAtHour(e.hour, cover, cloudCoverOverride !== null);
  const storm = rain.amount;

  // A heavy rain layer blocks/directly scatters light, adding soft haze.
  grass.color.copy(dryGrass).lerp(wetGrass, rain.wetness * .82);
  earth.color.copy(dryEarth).lerp(wetEarth, rain.wetness * .57);
  // Visual output is entirely derived from the single authoritative clock.
  sun.position.set(
    e.sunDirection.x * 25,
    e.sunDirection.y * 25,
    e.sunDirection.z * 25,
  );
  sun.intensity = e.sunlight * (1 - storm * .46);
  sun.color.setHex(e.sunColor);
  skyFill.color.setHex(e.fillColor);
  skyFill.groundColor.setHex(e.groundFillColor);
  skyFill.intensity = e.fillIntensity * (1 - storm * .20);
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.setHex(e.hazeColor).lerp(rainFogTone, storm * .26);
    scene.fog.density = e.hazeDensity + storm * .012;
  }
  shadowMaterial.opacity = e.shadowOpacity;
  const material = veil.material as THREE.ShaderMaterial;
  (material.uniforms.hazeColor.value as THREE.Color).setHex(e.mistColor);
  material.uniforms.opacity.value = Math.min(.65, e.mistOpacity + storm * .10);

  clouds.update(e.hour, e, cloudCoverOverride, storm);
  rainField.update(e.hour, rain);
  puddles.update(standingWater, e, storm);
  controls.waterLabel.textContent =
    'WATER ' + standingWater.totalLiters().toFixed(1) + ' L';
  controls.rainLabel.textContent =
    'RAIN ' + Math.round(storm * 100) + '% · ' + rain.phase.toUpperCase();
  controls.rainLabel.dataset.phase = rain.phase;
  controls.cloudCover.value = String(Math.round(cover * 100));
  controls.cloudLabel.textContent = 'CLOUDS ' + Math.round(cover * 100) + '%';
  controls.cloudAuto.setAttribute('aria-pressed', String(cloudCoverOverride === null));
  controls.cloudAuto.classList.toggle('manual', cloudCoverOverride !== null);

  const sky = document.documentElement.style;
  sky.setProperty('--storm-dim', String(storm * .25));
  sky.setProperty('--sky-top', cssColor(e.skyTop));
  sky.setProperty('--sky-middle', cssColor(e.skyMiddle));
  sky.setProperty('--sky-horizon', cssColor(e.skyHorizon));
  sky.setProperty('--sky-bottom', cssColor(e.skyBottom));
  controls.clock.value = clockLabel(e.hour);
  controls.clock.textContent = clockLabel(e.hour);
  controls.phase.textContent = e.phase.toUpperCase();
  controls.scrub.value = String(Math.round(e.hour * 60));
}

function updatePlayButton() {
  controls.toggle.textContent = playing ? 'Ⅱ' : '▶';
  controls.toggle.setAttribute('aria-label', playing ? 'Pause time' : 'Resume time');
  controls.toggle.setAttribute('aria-pressed', String(!playing));
  controls.toggle.title = playing ? 'Pause' : 'Play';
}

controls.toggle.addEventListener('click', () => {
  playing = !playing;
  updatePlayButton();
});
controls.scrub.addEventListener('input', () => {
  // Manual inspection pauses the clock rather than fighting the user's thumb.
  playing = false;
  updatePlayButton();
  hour = Number(controls.scrub.value) / 60;
  applyEnvironment(environmentAtHour(hour));
  render();
});

controls.cloudCover.addEventListener('input', () => {
  cloudCoverOverride = Number(controls.cloudCover.value) / 100;
  applyEnvironment(environmentAtHour(hour));
  render();
});
controls.cloudAuto.addEventListener('click', () => {
  cloudCoverOverride = null;
  applyEnvironment(environmentAtHour(hour));
  render();
});
controls.clearWater.addEventListener('click', () => {
  standingWater.clear();
  saveStandingWater();
  applyEnvironment(environmentAtHour(hour));
  render();
});

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

// Simulated time advances only with elapsed wall-clock time while playing.
// Cap the update rate for battery life, but retain responsive camera input.
applyEnvironment(initial);
updatePlayButton();
resize();

let lastFrame = performance.now();
let lastWaterSave = lastFrame;
let accumulated = 0;
function tick(now: number) {
  const dt = Math.max(0, Math.min((now - lastFrame) / 1000, 0.2));
  lastFrame = now;
  if (playing) {
    accumulated += dt;
    if (accumulated >= 1 / 30) {
      // Integrate REAL deposited water before advancing the world clock.
      // The cloud slider changes future rainfall, not past puddle history.
      const elapsedWorldHours = accumulated * 24 / DAY_LENGTH_SECONDS;
      const addedLitres = standingWater.advance(hour, elapsedWorldHours, cloudCoverOverride);
      if (addedLitres > 0) waterNeedsSave = true;
      hour = advanceHour(hour, accumulated, DAY_LENGTH_SECONDS);
      accumulated = 0;
      applyEnvironment(environmentAtHour(hour));
      render();
    }
  } else {
    accumulated = 0;
  }
  if (waterNeedsSave && now - lastWaterSave > 1800) {
    saveStandingWater();
    lastWaterSave = now;
  }
  requestAnimationFrame(tick);
}
window.addEventListener('pagehide', () => {
  if (waterNeedsSave) saveStandingWater();
});
requestAnimationFrame(tick);
