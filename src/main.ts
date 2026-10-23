import * as THREE from 'three';
import { Operator } from './actors/operator';
import { FieldAudio } from './audio/field-audio';
import { OPERATOR_START } from './constants';
import { CompanionController } from './crew/companion-controller';
import { CrewMission } from './crew/crew-mission';
import { FieldIncident, planIncident, type IncidentPhase } from './fieldwork/field-incident';
import { TacticalCamera } from './input/tactical-camera';
import { TouchControls } from './input/touch-controls';
import type { Axis } from './input/control-math';
import { NavigationGrid, type Point2 } from './navigation/grid';
import { createWorld } from './world/create-world';
import './style.css';

const viewport = document.querySelector<HTMLElement>('#viewport')!;
const message = document.querySelector<HTMLElement>('#message')!;
const contextAction = document.querySelector<HTMLButtonElement>('#contextAction')!;
const deferAction = document.querySelector<HTMLButtonElement>('#deferAction')!;
const renderer = new THREE.WebGLRenderer({
  antialias: true, alpha: false, powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const world = createWorld();
const nav = new NavigationGrid(world.obstacles);
const rook = new Operator(world.scene, OPERATOR_START, 'rook');
const mica = new Operator(world.scene, { x: 8.2, z: 10.8 }, 'mica');
const companion = new CompanionController(mica, nav);
const mission = new CrewMission();
const camera = new TacticalCamera(renderer.domElement);
const audio = new FieldAudio();
const historyKey = 'fieldwork3d.incident-history.v1';
let incidentIndex = 0;
let restoredCount = 0, deferredCount = 0;
try {
  const history = JSON.parse(localStorage.getItem(historyKey) || '{}') as {
    next?: number; restored?: number; deferred?: number;
  };
  incidentIndex = Math.max(0, Math.min(10000, Math.floor(Number(history.next) || 0)));
  restoredCount = Math.max(0, Math.floor(Number(history.restored) || 0));
  deferredCount = Math.max(0, Math.floor(Number(history.deferred) || 0));
} catch { /* Keep the current session playable without browser storage. */ }
let incident = new FieldIncident(planIncident(incidentIndex));
let previousPhase: IncidentPhase = incident.phase;
let previousStage = mission.stage;
let approachRelay = false, autoReturn = false;
let toastDeadline = 0, markerTime = 0, runtimeSeconds = 0;
let footDistance = 0, micaFootDistance = 0;
let lastFootLocation = rook.position, lastMicaFootLocation = mica.position;
let handoffInProgress = false;
let outcomeRecorded = false;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const distance = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.z - b.z);
function showMessage(text: string, seconds = 1.9) {
  message.textContent = text;
  message.classList.add('visible');
  toastDeadline = performance.now() + seconds * 1000;
}
function nearRelay() { return distance(rook.position, world.relay.standPoint) < 0.50; }
function crewAtTruck() {
  return distance(rook.position, world.depot.returnPoint) < 1.85 &&
    distance(mica.position, world.depot.secondReturnPoint) < 1.24;
}
function readyForWork(): boolean {
  if (!nearRelay()) return false;
  if (incident.phase === 'secondary') return mission.powerIsolated;
  if (incident.requiresIsolation && !mission.powerIsolated) return false;
  return incident.needsSupply ? mission.rookHasFuse : true;
}

function getRay(x: number, y: number) {
  const rect = renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  pointer.set(((x - rect.left) / rect.width) * 2 - 1,
    -(((y - rect.top) / rect.height) * 2 - 1));
  raycaster.setFromCamera(pointer, camera.camera);
  return true;
}
function hit(x: number, y: number, target: THREE.Object3D) {
  return getRay(x, y) && raycaster.intersectObject(target, false).length > 0;
}
function pathRook(target: Point2, auto = false) {
  const path = nav.findPath(rook.position, target);
  if (!path.length) {
    showMessage('NO ACCESSIBLE ROUTE');
    return false;
  }
  rook.follow(path);
  world.placeWaypoint(path[path.length - 1]);
  markerTime = 0;
  autoReturn = auto;
  return true;
}
function goHome() {
  if (mission.stage !== 'returning') return;
  pathRook(world.depot.returnPoint, true);
  showMessage('CREW RETURNING TO TRUCK', 2.0);
}
function recordOutcome() {
  if (outcomeRecorded || !incident.outcome) return;
  outcomeRecorded = true;
  if (incident.outcome === 'restored') restoredCount++;
  else deferredCount++;
  try {
    localStorage.setItem(historyKey, JSON.stringify({
      next: incidentIndex + 1, restored: restoredCount, deferred: deferredCount,
    }));
  } catch { /* session only */ }
}
function newJob() {
  if (mission.stage !== 'finished') return;
  incidentIndex++;
  incident = new FieldIncident(planIncident(incidentIndex));
  previousPhase = incident.phase;
  mission.reset();
  companion.reset();
  world.depot.resetItem();
  world.depot.setIsolated(false);
  world.relay.resetIncident();
  previousStage = mission.stage;
  outcomeRecorded = false;
  approachRelay = false;
  autoReturn = false;
  handoffInProgress = false;
  world.waypoint.visible = false;
  contextAction.hidden = true;
  deferAction.hidden = true;
  showMessage('CEDAR RELAY · NEW SERVICE CALL', 2.5);
}

function workAction() {
  audio.unlock();
  if (incident.finished) {
    if (mission.stage === 'returning') goHome();
    return;
  }
  if (incident.busy) return;
  if (incident.phase === 'prepared' && mission.powerIsolated) {
    showMessage('WAITING FOR MICA TO RECONNECT POWER', 2.2);
    return;
  }
  if (!nearRelay()) {
    if (pathRook(world.relay.standPoint)) {
      approachRelay = true;
      incident.interact(false, false);
    }
    return;
  }
  if (incident.workReady && !readyForWork()) {
    showMessage(incident.requiresIsolation ? 'MICA ISOLATING THE SUPPLY' :
      'MICA FETCHING REQUIRED PART', 2.0);
    return;
  }
  if (incident.interact(true, readyForWork())) {
    rook.clearRoute();
    world.waypoint.visible = false;
    approachRelay = false;
    if (incident.phase === 'working') audio.play('tool');
  }
}

function deferJob() {
  if (!nearRelay() || !incident.defer()) return;
  incident.stopHolding();
  mission.finishJob(false);
  recordOutcome();
  showMessage('JOB DEFERRED · RELAY STILL OFFLINE', 2.8);
  goHome();
}
function depotAction() {
  audio.unlock();
  if (mission.stage === 'returning') goHome();
  else if (mission.stage === 'finished') newJob();
  else showMessage('TRUCK EQUIPMENT · SERVICE SUPPLIES', 1.5);
}

renderer.domElement.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
contextAction.addEventListener('pointerdown', (event) => {
  audio.unlock();
  if (incident.workReady || incident.phase === 'working') {
    workAction();
    // Prevent a synthetic click after the hold gesture completes.
    event.preventDefault();
  }
});
contextAction.addEventListener('click', () => {
  if (mission.stage === 'finished' || mission.stage === 'returning') depotAction();
  else if (incident.phase !== 'working') workAction();
});
deferAction.addEventListener('click', deferJob);
const stopHold = () => incident.stopHolding();
window.addEventListener('pointerup', stopHold);
window.addEventListener('pointercancel', stopHold);
window.addEventListener('blur', stopHold);

const touch = new TouchControls(renderer.domElement, camera, (x, y) => {
  if (hit(x, y, world.relay.hitbox)) { workAction(); return; }
  if (hit(x, y, world.depot.hitbox)) { depotAction(); return; }
  const point = camera.groundPoint(x, y);
  if (!point) { showMessage('OUTSIDE THE FIELD AREA'); return; }
  if (distance(point, world.relay.location) < 1.35) { workAction(); return; }
  if (distance(point, { x: 8, z: 7 }) < 1.35) { depotAction(); return; }
  if (incident.busy || incident.isHolding) return;
  if (pathRook(point)) {
    approachRelay = false;
    incident.cancelApproach();
  }
});
const pressed = new Set<string>();
const movementCodes = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);
window.addEventListener('keydown', event => {
  if (event.code === 'KeyF' && !event.repeat) camera.focus(rook.position);
  else if (event.code === 'KeyQ' && !event.repeat) camera.orbit(Math.PI / 8, 0);
  else if (event.code === 'KeyE' && !event.repeat) camera.orbit(-Math.PI / 8, 0);
  else if (event.code === 'Equal' || event.code === 'NumpadAdd') camera.zoom(0.87);
  else if (event.code === 'Minus' || event.code === 'NumpadSubtract') camera.zoom(1.13);
  else if (event.code === 'KeyM' && !event.repeat) audio.toggleMute();
  else if (event.code === 'KeyR' && event.shiftKey && !event.repeat && mission.stage === 'finished') newJob();
  else if (event.code === 'KeyT' && !event.repeat) depotAction();
  else if (event.code === 'Space' && !event.repeat) workAction();
  else if (movementCodes.has(event.code)) pressed.add(event.code);
  else return;
  event.preventDefault();
});
window.addEventListener('keyup', event => {
  pressed.delete(event.code);
  if (event.code === 'Space') stopHold();
});
window.addEventListener('blur', () => pressed.clear());
function keyboardAxis(): Axis {
  const x = Number(pressed.has('ArrowRight') || pressed.has('KeyD')) -
    Number(pressed.has('ArrowLeft') || pressed.has('KeyA'));
  const y = Number(pressed.has('ArrowUp') || pressed.has('KeyW')) -
    Number(pressed.has('ArrowDown') || pressed.has('KeyS'));
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}
let lastWidth = 0, lastHeight = 0, lastRatio = 0;
function resize() {
  const box = viewport.getBoundingClientRect();
  const width = Math.max(1, Math.round(box.width));
  const height = Math.max(1, Math.round(box.height));
  const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
  if (width === lastWidth && height === lastHeight && ratio === lastRatio) return;
  lastWidth = width; lastHeight = height; lastRatio = ratio;
  renderer.setPixelRatio(ratio); renderer.setSize(width, height, false);
  camera.resize(width, height);
}
const observer = new ResizeObserver(resize);
observer.observe(viewport);
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => {
  requestAnimationFrame(() => { resize(); requestAnimationFrame(resize); });
});
resize(); camera.focus(rook.position); camera.update(0);

function onIncidentChange(phase: IncidentPhase) {
  if (phase === 'opening') { audio.play('latch'); showMessage('OPENING SERVICE PANEL'); }
  else if (phase === 'open') showMessage('PANEL OPEN · CHECK COMPONENTS');
  else if (phase === 'inspecting') { audio.play('inspect'); showMessage('INSPECTING RELAY'); }
  else if (phase === 'diagnosed') {
    const assignment = incident.fault === 'fuse' ? 'fuse' :
      incident.fault === 'terminal' ? 'terminal' : 'isolation';
    mission.diagnose(assignment);
    world.depot.setAssignment(assignment);
    audio.play('radio');
    showMessage(incident.diagnosis + (assignment === 'isolation' ?
      ' · MICA ISOLATING POWER' : ' · MICA RETRIEVING EQUIPMENT'), 3.5);
  } else if (phase === 'prepared') {
    if (incident.needsSupply && incident.testsPerformed === 0) {
      mission.installFuse(); world.depot.item.visible = false;
    }
    audio.play('tool');
    if (mission.powerIsolated && mission.requestReenergize()) {
      audio.play('radio');
      showMessage('MICA · RE-ENERGIZING SUPPLY BEFORE TEST', 3);
    } else showMessage('MECHANISM SECURED · READY TO TEST', 2.5);
  } else if (phase === 'testing') { audio.play('switch'); showMessage('TESTING UNDER POWER'); }
  else if (phase === 'secondary') {
    audio.play('arc'); audio.play('radio');
    if (!mission.reassignIsolation()) showMessage('PROTECTION TRIPPED · ISOLATE POWER', 3.2);
    else showMessage('TERMINAL ARC · MICA ISOLATING SUPPLY', 3.6);
  } else if (phase === 'closing') { audio.play('latch'); showMessage('TEST PASSED · CLOSING PANEL'); }
  else if (phase === 'complete') {
    mission.finishJob(true);
    recordOutcome();
    audio.play('power');
    showMessage('RELAY RESTORED · RETURN TO TRUCK', 3.3);
    goHome();
  } else if (phase === 'deferred') {
    showMessage('RELAY OFFLINE · FOLLOW-UP REQUIRED', 2.5);
  }
}

function onCrewEvent(event: string) {
  if (event === 'collect') {
    world.depot.attachTo(mica.itemAnchor);
    audio.play('latch'); audio.play('radio');
    showMessage('MICA · EQUIPMENT RETRIEVED', 1.8);
  } else if (event === 'isolated') {
    world.depot.setIsolated(true);
    audio.play('switch');
    showMessage('MICA · CIRCUIT ISOLATED', 2.1);
  } else if (event === 'energized') {
    world.depot.setIsolated(false);
    audio.play('switch');
    showMessage('SUPPLY RECONNECTED · READY FOR TEST', 2.3);
  } else if (event === 'delivered') {
    world.depot.attachTo(rook.itemAnchor);
    audio.play('tool'); audio.play('radio');
    showMessage('MICA → ROOK · EQUIPMENT HANDOFF', 2.3);
  } else if (event === 'finished') {
    world.depot.setIsolated(false);
    world.waypoint.visible = false;
    autoReturn = false;
    showMessage(incident.outcome === 'restored' ?
      'CREW HOME · SERVICE COMPLETE' : 'CREW HOME · RETURN VISIT NEEDED', 3.1);
  }
}

function positionPrompt() {
  let label: string | null = null;
  let pos: THREE.Vector3 | null = null;
  if (mission.stage === 'finished') {
    label = 'ANOTHER JOB'; pos = world.depot.labelPoint;
  } else if (mission.stage === 'returning') {
    label = 'RETURN TO TRUCK'; pos = world.depot.labelPoint;
  } else if (nearRelay() && !incident.busy && !incident.finished) {
    label = incident.actionLabel;
    if (incident.workReady && !readyForWork()) label = null;
    if (incident.phase === 'prepared' && mission.powerIsolated) label = null;
    pos = world.relay.labelPoint;
  }
  const mayDefer = nearRelay() && ['diagnosed','secondary','prepared'].includes(incident.phase);
  contextAction.hidden = !label || !pos;
  deferAction.hidden = !mayDefer;
  if (!pos && mayDefer) pos = world.relay.labelPoint;
  if (!pos) return;
  const projected = pos.clone().project(camera.camera);
  if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 0.95 ||
      Math.abs(projected.y) > 0.86) {
    contextAction.hidden = true;
    deferAction.hidden = true;
    return;
  }
  const box = viewport.getBoundingClientRect();
  const x = (projected.x * 0.5 + 0.5) * box.width;
  const y = (-projected.y * 0.5 + 0.5) * box.height;
  const px = Math.min(box.width - 95, Math.max(95, x));
  const py = Math.min(box.height - 50, Math.max(50, y));
  if (label) {
    contextAction.textContent = label;
    contextAction.setAttribute('aria-label', label);
  }
  contextAction.style.left = px + 'px';
  contextAction.style.top = py + 'px';
  contextAction.style.setProperty('--progress', incident.completion * 100 + '%');
  deferAction.style.left = px + 'px';
  deferAction.style.top = Math.min(box.height - 22, py + 47) + 'px';
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  runtimeSeconds += dt;
  touch.update(dt);
  const keys = keyboardAxis();
  const wantsDrive = touch.driving || keys.x !== 0 || keys.y !== 0;
  const driving = wantsDrive && !incident.busy && !incident.isHolding;
  if (driving) {
    autoReturn = false;
    if (incident.phase === 'approaching') {
      approachRelay = false; incident.cancelApproach(); rook.clearRoute();
    }
  }
  const axis = touch.driving ? touch.move : keys;
  rook.setDrive(driving ? camera.screenDirection(axis) : null);
  const meeting = mission.stage === 'handoff';
  const workPhase = nearRelay() && !meeting ?
    incident.phase === 'working' ? 'replacing' :
    incident.phase === 'opening' ? 'opening' :
    incident.phase === 'inspecting' ? 'inspecting' :
    ['open','diagnosed','prepared','secondary','testing','closing'].includes(incident.phase)
      ? 'inspected' : 'idle' : 'idle';
  rook.setWork(workPhase, world.relay.location);
  rook.setSocialPose(meeting ? 'receive' : 'none', meeting ? mica.position : null);
  rook.update(dt, nav);
  if (driving || (rook.moving && (approachRelay || autoReturn))) camera.follow(rook.position, dt);
  camera.update(dt);

  if (approachRelay && nearRelay()) {
    incident.update(0, true, readyForWork(), mission.powerIsolated);
    if (incident.phase === 'idle') incident.interact(true, false);
    else if (incident.phase !== 'opening' && incident.phase !== 'working')
      incident.interact(true, readyForWork());
    approachRelay = false;
    rook.clearRoute();
    world.waypoint.visible = false;
  }
  const serviceEvent = incident.update(dt, nearRelay(), readyForWork(), mission.powerIsolated);
  if (incident.phase !== previousPhase) {
    onIncidentChange(incident.phase);
    previousPhase = incident.phase;
  }
  if (serviceEvent === 'trip') {
    world.depot.setIsolated(false);
  }

  companion.update(dt, rook, mission, world.depot);
  const micaAtTruck = distance(mica.position, world.depot.standPoint) < 0.88;
  const micaNearRook = distance(mica.position, rook.position) < 1.85;
  const event = mission.advance(dt, micaAtTruck, micaNearRook, crewAtTruck());
  if (event) onCrewEvent(event);

  if (mission.stage === 'handoff') {
    rook.group.updateMatrixWorld(true);
    mica.group.updateMatrixWorld(true);
    if (!handoffInProgress) {
      world.scene.add(world.depot.item);
      handoffInProgress = true;
    }
    const from = mica.itemAnchor.getWorldPosition(new THREE.Vector3());
    const to = rook.itemAnchor.getWorldPosition(new THREE.Vector3());
    const t = THREE.MathUtils.smoothstep(mission.timer / 1.25, 0, 1);
    world.depot.item.position.lerpVectors(from, to, t);
    world.depot.item.position.y += Math.sin(t * Math.PI) * 0.18;
    world.depot.item.rotation.z = Math.sin(t * Math.PI) * 0.28;
  } else if (handoffInProgress) {
    handoffInProgress = false;
    if (mission.micaHasFuse) world.depot.attachTo(mica.itemAnchor);
    else if (mission.rookHasFuse) world.depot.attachTo(rook.itemAnchor);
  }
  if (mission.stage !== previousStage) {
    previousStage = mission.stage;
    if (mission.stage === 'retrieving') {
      showMessage(mission.assignment === 'isolation' ?
        'MICA · SWITCHING OFF SUPPLY' : 'MICA · OPENING EQUIPMENT BOX', 1.9);
    }
  }
  world.depot.update(mission.stage === 'retrieving', mission.hasTruckFuse,
    mission.timer);
  world.relay.updateIncident(incident, runtimeSeconds, camera.camera);
  audio.update(incident.phase === 'complete');

  const here = rook.position, there = mica.position;
  footDistance += distance(here, lastFootLocation);
  micaFootDistance += distance(there, lastMicaFootLocation);
  if (footDistance >= 1.45) { audio.play('footstep'); footDistance %= 1.45; }
  if (micaFootDistance >= 1.45) {
    if (distance(here, there) < 16) audio.play('footstep');
    micaFootDistance %= 1.45;
  }
  lastFootLocation = here; lastMicaFootLocation = there;

  if (world.waypoint.visible) {
    markerTime += dt;
    world.waypoint.scale.setScalar(1 + Math.sin(markerTime * 4) * 0.08);
    if (!rook.moving && markerTime > 0.25) world.waypoint.visible = false;
  }
  if (toastDeadline && performance.now() > toastDeadline) {
    message.classList.remove('visible'); toastDeadline = 0;
  }
  positionPrompt();
  renderer.render(world.scene, camera.camera);
});
