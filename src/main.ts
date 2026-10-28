import * as THREE from 'three';
import { cameraOffset, clampZoom, viewSize } from './camera-model';
import { CloudField } from './clouds';
import { cloudCoverAtHour } from './cloud-model';
import { RainField } from './rain';
import { TerrainWater } from './hydrology';
import { makeTerrainGeometry, updateTerrainMoisture } from './terrain';
import { windAtHour, windDriftAtHour } from './wind-model';
import { ValleyRiverField } from './valley-river-field';
import { createGroundCoverMaterial } from './ground-cover-material';
import { groundCoverAt } from './ground-cover-model';
import { mountRegionInspector } from './region-inspector';
import { GroundLoad, type TrafficKind } from './traffic-model';
import { TrafficField } from './traffic-field';
import { cellIndexAt } from './terrain-model';
import { rainAtHour } from './rain-model';
import {
  DAY_LENGTH_SECONDS, INITIAL_HOUR, advanceHour, clockLabel, cssColor,
  environmentAtHour, type EnvironmentState,
} from './environment-conditions';
import './style.css';

// Ground Zero: continuous sculpted terrain; rainfall follows downhill drainage.
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
const windLabel = document.querySelector<HTMLElement>('#windLabel');
const evapLabel = document.querySelector<HTMLElement>('#evapLabel');
const flowLabel = document.querySelector<HTMLElement>('#flowLabel');
const coverToggle = document.querySelector<HTMLButtonElement>('#coverToggle');
const coverPanel = document.querySelector<HTMLElement>('#coverPanel');
const coverStatus = document.querySelector<HTMLOutputElement>('#coverStatus');
const trafficButton = document.querySelector<HTMLButtonElement>('#trafficToggle');
const trafficKindButton = document.querySelector<HTMLButtonElement>('#trafficKind');
const trafficResetButton = document.querySelector<HTMLButtonElement>('#trafficReset');
const trafficPanel = document.querySelector<HTMLElement>('#trafficPanel');
const trafficStatus = document.querySelector<HTMLElement>('#trafficStatus');
if (!timeToggle || !timeScrub || !timeLabel || !phaseLabel ||
    !cloudCoverInput || !cloudCoverLabel || !cloudAuto || !rainLabel ||
    !waterLabel || !clearWaterButton || !windLabel || !evapLabel || !flowLabel ||
    !trafficButton || !trafficKindButton || !trafficResetButton ||
    !trafficPanel || !trafficStatus || !coverToggle || !coverPanel ||
    !coverStatus) {
  throw new Error('Missing time-of-day inspector');
}
const controls = { toggle: timeToggle, scrub: timeScrub, clock: timeLabel, phase: phaseLabel,
  cloudCover: cloudCoverInput, cloudLabel: cloudCoverLabel, cloudAuto,
  rainLabel, waterLabel, clearWater: clearWaterButton, windLabel, evapLabel, flowLabel,
  trafficButton, trafficKindButton, trafficResetButton, trafficPanel, trafficStatus,
  coverToggle, coverPanel, coverStatus };

let hour = INITIAL_HOUR;
let playing = true;
// Null restores natural cover. An override is inspection only, not another clock.
let cloudCoverOverride: number | null = null;
let trafficInspection=false;
let coverInspection=false;
let trafficKind:TrafficKind='foot';
let trafficSelected:number|null=null;
let lastPaintedCell:number|null=null;
// Surface water is an accumulated world quantity, deliberately separate from
// the reversible time-of-day preview (scrubbing time deposits nothing).
const WATER_SAVE_KEY = 'fieldwork-ground-zero-water-017';
const PREVIOUS_WATER_SAVE_KEY = 'fieldwork-ground-zero-water-011';
const LEGACY_WATER_SAVE_KEY = 'fieldwork-ground-zero-water-007';
let savedVolumes: unknown;
try {
  const json = window.localStorage.getItem(WATER_SAVE_KEY);
  if (json) savedVolumes = JSON.parse(json);
  else {
    const previous=window.localStorage.getItem(PREVIOUS_WATER_SAVE_KEY)
      ?? window.localStorage.getItem('fieldwork-ground-zero-water-008');
    if(previous) savedVolumes=JSON.parse(previous);
  }
} catch { /* private browsing or disabled storage still supports water */ }
const standingWater = new TerrainWater(undefined, savedVolumes);
// First upgrade: translate previously saved decorative puddle quantities
// into the new measurable terrain catchments, then let any surplus spill.
if (!savedVolumes) {
  try {
    const legacy = window.localStorage.getItem(LEGACY_WATER_SAVE_KEY);
    if (legacy) standingWater.migrateLegacy(JSON.parse(legacy));
  } catch { /* storage remains optional */ }
}
// Physical rut/deformation state persists independently of water history.
const TRAFFIC_SAVE_KEY='fieldwork-ground-load-016';
let groundSaved:unknown;
try {
  const json=window.localStorage.getItem(TRAFFIC_SAVE_KEY);
  if(json)groundSaved=JSON.parse(json);
} catch { /* development mode also works without storage */ }
const groundLoad=new GroundLoad(groundSaved);
let groundNeedsSave=false;
function saveGroundLoad():void{
  try {
    window.localStorage.setItem(TRAFFIC_SAVE_KEY,JSON.stringify(groundLoad.snapshot()));
    groundNeedsSave=false;
  } catch { /* local save is optional */ }
}
let waterNeedsSave = false;
function saveStandingWater(): void {
  try {
    window.localStorage.setItem(WATER_SAVE_KEY,
      JSON.stringify(standingWater.snapshot()));
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
renderer.toneMappingExposure = .96;
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
const grass = createGroundCoverMaterial();
const earth = new THREE.MeshStandardMaterial({
  color: 0x756959, roughness: 1, flatShading: true,
});
const ground = new THREE.Mesh(
  makeTerrainGeometry(),
  [grass, earth],
);
// The terrain top is now a continuous measured heightfield; the substrate
// remains one physically continuous solid extending down to -0.8m.
ground.castShadow = true;
ground.receiveShadow = true;
scene.add(ground);
// Earth sides remain the original solid substrate; material identity and
// actual soil moisture appear on the top vertices of this one mesh.

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
      windShift: { value: new THREE.Vector2() },
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
      uniform vec2 windShift;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float edgeFade = 1.0 - smoothstep(0.47, 0.97, max(abs(p.x), abs(p.y)));
        float wisp = 0.5 + 0.5 * sin(vUv.x * 18.0 + windShift.x + sin(vUv.y * 11.0) * 2.6)
                                   * cos(vUv.y * 12.0 - windShift.y - vUv.x * 5.0);
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
const waterSurface = new ValleyRiverField(scene);
// Individual blades remain in their prototype for a future, much closer zoom.
// At this landscape scale the ground-cover colors carry the vegetation.
mountRegionInspector();
const trafficField = new TrafficField(scene,standingWater);
const rainFogTone = new THREE.Color(0x91a0a6);

function applyEnvironment(e: EnvironmentState) {
  const cover = cloudCoverOverride ?? cloudCoverAtHour(e.hour);
  const rain = rainAtHour(e.hour, cover, cloudCoverOverride !== null);
  const storm = rain.amount;

  // Actual moisture controls local color, not recently authored rain.
  updateTerrainMoisture(ground.geometry,standingWater,coverInspection);
  const wind=windAtHour(e.hour);
  const drift=windDriftAtHour(e.hour);
  // Visual output is entirely derived from the single authoritative clock.
  sun.position.set(
    e.sunDirection.x * 25,
    e.sunDirection.y * 25,
    e.sunDirection.z * 25,
  );
  sun.intensity = e.sunlight * .91 * (1 - storm * .46);
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
  material.uniforms.opacity.value = Math.min(.55, e.mistOpacity * .85 + storm * .08);
  (material.uniforms.windShift.value as THREE.Vector2).set(drift.x*.07,drift.z*.18);

  clouds.update(e.hour, e, cloudCoverOverride, storm);
  rainField.update(e.hour, rain);
  waterSurface.update(standingWater);
  trafficField.update(standingWater,groundLoad,e.hour,trafficKind);
  updateTrafficStatus();
  controls.waterLabel.textContent =
    'SURFACE ' + standingWater.totalLiters().toFixed(0) + ' L'
    + ' · SOIL ' + standingWater.totalSoilLiters().toFixed(0) + ' L'
    + ' · EXIT ' + standingWater.exportedLiters().toFixed(0) + ' L';
  controls.flowLabel.textContent=
    'UPSTREAM ' + standingWater.importedLiters().toFixed(0) + ' L'
    + ' · CHANNEL ' + standingWater.totalChannelLiters().toFixed(0) + ' L'
    + ' · FLOOD ' + standingWater.totalFloodLiters().toFixed(0) + ' L';
  controls.windLabel.textContent='WIND ' + wind.speed.toFixed(1) + ' m/h';
  controls.evapLabel.textContent='EVAP ' +
    standingWater.evaporatedLiters().toFixed(1) + ' L';
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
  waterSurface.update(standingWater,true);
  applyEnvironment(environmentAtHour(hour));
  render();
});

// This inspector is intentionally not a soldier/vehicle controller.
// It probes real terrain and applies one passage per grid cell touched.
function updateTrafficStatus():void{
  controls.trafficButton.textContent=trafficInspection?'GROUND ✓':'GROUND TEST';
  controls.trafficButton.setAttribute('aria-pressed',String(trafficInspection));
  controls.trafficPanel.hidden=!trafficInspection;
  controls.trafficKindButton.textContent=trafficKind==='foot'?'FOOT':'VEHICLE';
  if(trafficSelected===null){
    controls.trafficStatus.textContent='Touch or drag on the ground to test passage. Green = good, red = blocked.';
    return;
  }
  const foot=groundLoad.observe(trafficSelected,standingWater,'foot');
  const vehicle=groundLoad.observe(trafficSelected,standingWater,'vehicle');
  const chosen=trafficKind==='foot'?foot:vehicle;
  controls.trafficStatus.textContent=
    chosen.material.toUpperCase()+' · '+Math.round(chosen.saturation*100)+'% WET'
    +' · '+chosen.bearingKPa.toFixed(0)+' kPa'
    +' · TRACTION '+Math.round(chosen.traction*100)+'%'
    +' · FOOT '+Math.round(foot.speedFactor*100)+'%'
    +' / VEH '+Math.round(vehicle.speedFactor*100)+'%'
    +' · RUT '+Math.round(chosen.rutDepthM*1000)+' mm';
}
controls.trafficButton.addEventListener('click',()=>{
  trafficInspection=!trafficInspection;
  if(trafficInspection&&coverInspection){
    coverInspection=false;
    controls.coverPanel.hidden=true;
    controls.coverToggle.setAttribute('aria-pressed','false');
    updateTerrainMoisture(ground.geometry,standingWater,false);
  }
  trafficField.setInspection(trafficInspection);
  trafficField.update(standingWater,groundLoad,hour,trafficKind,true);
  updateTrafficStatus();
  render();
});
controls.trafficKindButton.addEventListener('click',()=>{
  trafficKind=trafficKind==='foot'?'vehicle':'foot';
  trafficField.update(standingWater,groundLoad,hour,trafficKind,true);
  updateTrafficStatus();
  render();
});
controls.trafficResetButton.addEventListener('click',()=>{
  groundLoad.clear();
  saveGroundLoad();
  trafficField.update(standingWater,groundLoad,hour,trafficKind,true);
  updateTrafficStatus();
  render();
});

function inspectCoverAt(x:number,z:number):void{
  const sample=groundCoverAt(x,z);
  const soilNow=standingWater.soilFraction(cellIndexAt(x,z));
  controls.coverStatus.textContent=
    Math.round(sample.coverage*100)+'% COVER · '+
    Math.round(sample.longTermMoisture*100)+'% CLIMATE MOISTURE · '+
    sample.slope.toFixed(0)+'° SLOPE · '+
    Math.round(soilNow*100)+'% CURRENT SOIL WATER';
}
controls.coverToggle.addEventListener('click',()=>{
  coverInspection=!coverInspection;
  controls.coverPanel.hidden=!coverInspection;
  controls.coverToggle.setAttribute('aria-pressed',String(coverInspection));
  if(coverInspection){
    controls.coverStatus.textContent=
      'Tap or drag terrain to inspect ground cover. Tan = bare; green = vegetated.';
    if(trafficInspection){
      trafficInspection=false;
      trafficField.setInspection(false);
      trafficField.update(standingWater,groundLoad,hour,trafficKind,true);
      updateTrafficStatus();
    }
  }
  updateTerrainMoisture(ground.geometry,standingWater,coverInspection);
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
const groundRaycaster=new THREE.Raycaster();
const pointerNdc=new THREE.Vector2();
let previousWorldPoint:THREE.Vector2|null=null;
function worldPointAt(clientX:number,clientY:number):THREE.Vector2|null{
  const rect=canvas.getBoundingClientRect();
  pointerNdc.set((clientX-rect.left)/rect.width*2-1,
    -((clientY-rect.top)/rect.height*2-1));
  groundRaycaster.setFromCamera(pointerNdc,camera);
  const hit=groundRaycaster.intersectObject(ground,false)[0];
  if(!hit)return null;
  return new THREE.Vector2(hit.point.x,hit.point.z);
}
function stampGroundAt(clientX:number,clientY:number):void{
  const worldPoint=worldPointAt(clientX,clientY);
  if(!worldPoint)return;
  const index=cellIndexAt(worldPoint.x,worldPoint.y);
  if(index!==lastPaintedCell){
    const heading=previousWorldPoint
      ?Math.atan2(worldPoint.y-previousWorldPoint.y,worldPoint.x-previousWorldPoint.x):0;
    groundLoad.pass(index,standingWater,trafficKind,heading);
    trafficSelected=index;
    trafficField.select(index,standingWater);
    trafficField.update(standingWater,groundLoad,hour,trafficKind,true);
    groundNeedsSave=true;
    lastPaintedCell=index;
    updateTrafficStatus();
    render();
  }
  previousWorldPoint=worldPoint;
}
let lastX = 0;
let lastStrokeY = 0;
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
  if (pointers.size === 1){
    lastX = event.clientX;
    lastStrokeY=event.clientY;
    lastPaintedCell=null;
    previousWorldPoint=null;
    if(trafficInspection)stampGroundAt(event.clientX,event.clientY);
    else if(coverInspection){
      const p=worldPointAt(event.clientX,event.clientY);
      if(p)inspectCoverAt(p.x,p.y);
    }
  }
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
    if(coverInspection){
      const p=worldPointAt(event.clientX,event.clientY);
      if(p)inspectCoverAt(p.x,p.y);
    }else if(trafficInspection){
      // Fill in intermediate samples for fast finger drags; a route can
      // pass through several 0.3125m cells in one pointer event.
      const oldX=lastX;
      const oldY=lastStrokeY;
      const gap=Math.hypot(event.clientX-oldX,event.clientY-oldY);
      const samples=Math.min(32,Math.max(1,Math.ceil(gap/10)));
      for(let step=1;step<=samples;step++){
        const t=step/samples;
        stampGroundAt(oldX+(event.clientX-oldX)*t,
          oldY+(event.clientY-oldY)*t);
      }
    }else{
      rotate(event.clientX - lastX); // Otherwise orbit as before.
    }
    lastX = event.clientX;
    lastStrokeY=event.clientY;
  } else if (pointers.size === 2 && initialPinch > 0) {
    state.zoom = clampZoom(initialZoom * pinchDistance() / initialPinch);
    resize();
  }
});

function release(event: PointerEvent) {
  pointers.delete(event.pointerId);
  lastPaintedCell=null;
  previousWorldPoint=null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  if (pointers.size === 1) {
    const pointer=[...pointers.values()][0];
    lastX=pointer.x;
    lastStrokeY=pointer.y;
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
let lastGroundSave = lastFrame;
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
      if(groundLoad.advance(elapsedWorldHours,standingWater)){
        groundNeedsSave=true;
      }
      // Water can change even on a dry day due to evaporation/seepage.
      if (addedLitres > 0 || elapsedWorldHours > 0) waterNeedsSave = true;
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
  if(groundNeedsSave && now-lastGroundSave>2200){
    saveGroundLoad();
    lastGroundSave=now;
  }
  requestAnimationFrame(tick);
}
window.addEventListener('pagehide', () => {
  if (waterNeedsSave) saveStandingWater();
  if (groundNeedsSave) saveGroundLoad();
});
requestAnimationFrame(tick);
