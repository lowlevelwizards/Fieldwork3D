import * as THREE from 'three';
import { Operator } from './actors/operator';
import { FieldAudio } from './audio/field-audio';
import { OPERATOR_START } from './constants';
import { CompanionController } from './crew/companion-controller';
import { CrewMission } from './crew/crew-mission';
import { RelayProcedure, type RelayPhase } from './fieldwork/relay-procedure';
import { TacticalCamera } from './input/tactical-camera';
import { TouchControls } from './input/touch-controls';
import type { Axis } from './input/control-math';
import { NavigationGrid, type Point2 } from './navigation/grid';
import { createWorld } from './world/create-world';
import './style.css';

const viewport = document.querySelector<HTMLElement>('#viewport')!;
const message = document.querySelector<HTMLElement>('#message')!;
const contextAction = document.querySelector<HTMLButtonElement>('#contextAction')!;
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
const teammate = new CompanionController(mica, nav);
const mission = new CrewMission();
let procedure = new RelayProcedure();
const camera = new TacticalCamera(renderer.domElement);
const audio = new FieldAudio();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let toastDeadline = 0, markerTime = 0, runtimeSeconds = 0;
let previousPhase: RelayPhase = procedure.phase;
let previousStage = mission.stage;
let approachRelay = false, autoReturn = false;
let stepDistance = 0;
let lastStepLocation = rook.position;
let priorHanding = false;

const distance = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.z - b.z);
function showMessage(text: string, seconds = 1.7) {
  message.textContent = text;
  message.classList.add('visible');
  toastDeadline = performance.now() + seconds * 1000;
}
function nearRelay() { return distance(rook.position, world.relay.standPoint) < 0.49; }
function nearDepot() { return distance(rook.position, world.depot.returnPoint) < 1.8; }
function getRay(clientX: number, clientY: number) {
  const bounds = renderer.domElement.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return false;
  pointer.set(((clientX - bounds.left) / bounds.width) * 2 - 1,
    -(((clientY - bounds.top) / bounds.height) * 2 - 1));
  raycaster.setFromCamera(pointer, camera.camera);
  return true;
}
function pickObject(clientX: number, clientY: number, mesh: THREE.Object3D) {
  return getRay(clientX, clientY) && raycaster.intersectObject(mesh, false).length > 0;
}

function pathRook(target: Point2, auto = false) {
  const path = nav.findPath(rook.position, target);
  if (!path.length) { showMessage('NO ACCESSIBLE ROUTE'); return false; }
  rook.follow(path);
  world.placeWaypoint(path[path.length - 1]);
  markerTime = 0;
  autoReturn = auto;
  return true;
}

function goHome() {
  if (mission.stage !== 'returning') return;
  pathRook(world.depot.returnPoint, true);
  showMessage('CREW RETURNING TO TRUCK', 2);
}

function resetJob() {
  mission.reset();
  procedure.reset();
  previousPhase = procedure.phase;
  previousStage = mission.stage;
  approachRelay = false; autoReturn = false;
  world.depot.resetItem();
  teammate.reset();
  world.waypoint.visible = false;
  contextAction.hidden = true;
  showMessage('CEDAR RELAY · NEW SERVICE CALL', 2.4);
}

function relayInteract() {
  audio.unlock();
  if (procedure.complete) {
    if (mission.stage === 'returning') goHome();
    else showMessage('RELAY ONLINE');
    return;
  }
  if (procedure.busy || procedure.travelling) return;
  if (procedure.phase === 'inspected' && !mission.rookHasFuse) {
    showMessage('MICA IS BRINGING THE SPARE FUSE', 2.3);
    return;
  }
  if (nearRelay()) {
    if (procedure.interact(true, mission.rookHasFuse)) {
      rook.clearRoute();
      world.waypoint.visible = false;
      approachRelay = false;
    }
    return;
  }
  if (pathRook(world.relay.standPoint)) {
    approachRelay = true;
    if (procedure.phase === 'idle') procedure.interact(false);
  }
}

function depotInteract() {
  audio.unlock();
  if (mission.stage === 'returning') goHome();
  else if (mission.stage === 'finished') resetJob();
  else showMessage('TRUCK SUPPLIES · SPARE FUSE', 1.8);
}

renderer.domElement.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
contextAction.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
contextAction.addEventListener('click', () => {
  if (mission.stage === 'finished' || mission.stage === 'returning') depotInteract();
  else relayInteract();
});

const touch = new TouchControls(renderer.domElement, camera, (x, y) => {
  if (pickObject(x, y, world.relay.hitbox)) { relayInteract(); return; }
  if (pickObject(x, y, world.depot.hitbox)) { depotInteract(); return; }
  const point = camera.groundPoint(x, y);
  if (!point) { showMessage('OUTSIDE THE FIELD AREA'); return; }
  if (distance(point, world.relay.location) < 1.35) { relayInteract(); return; }
  if (distance(point, { x: 8, z: 7 }) < 1.35) { depotInteract(); return; }
  if (procedure.busy) return;
  if (pathRook(point)) {
    approachRelay = false;
    procedure.cancelApproach();
  }
});

const pressed = new Set<string>();
const movementCodes = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);
window.addEventListener('keydown', event => {
  if (event.code === 'KeyF' && !event.repeat) camera.focus(rook.position);
  else if (event.code === 'KeyQ' && !event.repeat) camera.orbit(Math.PI / 8, 0);
  else if (event.code === 'KeyE' && !event.repeat) camera.orbit(-Math.PI / 8, 0);
  else if (event.code === 'Equal' || event.code === 'NumpadAdd') camera.zoom(0.87);
  else if (event.code === 'Minus' || event.code === 'NumpadSubtract') camera.zoom(1.13);
  else if (event.code === 'KeyM' && !event.repeat) audio.toggleMute();
  else if (event.code === 'KeyR' && event.shiftKey && !event.repeat) resetJob();
  else if (event.code === 'KeyT' && !event.repeat) depotInteract();
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
  const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
  if (width === previousWidth && height === previousHeight && ratio === previousPixelRatio) return;
  previousWidth = width; previousHeight = height; previousPixelRatio = ratio;
  renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);
  camera.resize(width, height);
}
const observer = new ResizeObserver(resize);
observer.observe(viewport);
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => {
  requestAnimationFrame(() => { resize(); requestAnimationFrame(resize); });
});
resize();
camera.focus(rook.position);
camera.update(0);

function onPhaseChanged(phase: RelayPhase) {
  switch (phase) {
    case 'opening': audio.play('latch'); showMessage('OPENING SERVICE PANEL'); break;
    case 'open': showMessage('ELECTRICAL ASSEMBLY EXPOSED'); break;
    case 'inspecting': audio.play('inspect'); showMessage('INSPECTING FUSE'); break;
    case 'inspected':
      mission.diagnose();
      showMessage('BLOWN FUSE · MICA FETCHING SPARE', 2.5);
      break;
    case 'replacing':
      audio.play('tool'); showMessage('INSTALLING REPLACEMENT');
      break;
    case 'replaced':
      if (mission.installFuse()) {
        world.depot.item.visible = false;
      }
      showMessage('FUSE SECURED');
      break;
    case 'closing': audio.play('switch'); showMessage('CLOSING SERVICE PANEL'); break;
    case 'complete':
      if (mission.restorePower()) {
        audio.play('power');
        showMessage('CEDAR RELAY ONLINE · RETURN TO TRUCK', 3);
        goHome();
      }
      break;
  }
}

function crewEvent(which: string) {
  if (which === 'collect') {
    world.depot.attachTo(mica.itemAnchor);
    audio.play('latch');
    showMessage('MICA · SPARE RETRIEVED', 1.8);
  } else if (which === 'delivered') {
    world.depot.attachTo(rook.itemAnchor);
    audio.play('tool');
    showMessage('MICA → ROOK · SPARE HANDED OVER', 2.2);
  } else if (which === 'finished') {
    audio.play('power');
    showMessage('CREW HOME · OPERATION COMPLETE', 3.1);
    world.waypoint.visible = false;
    autoReturn = false;
  }
}

// A single world-projected control, never a persistent mission HUD.
function positionPrompt() {
  let label: string | null = null;
  let p: THREE.Vector3 | null = null;
  if (mission.stage === 'finished') {
    label = 'ANOTHER JOB';
    p = world.depot.labelPoint;
  } else if (mission.stage === 'returning') {
    label = 'RETURN TO TRUCK';
    p = world.depot.labelPoint;
  } else if (nearRelay() && !procedure.busy && !procedure.travelling &&
    !procedure.complete && procedure.prompt) {
    label = procedure.phase === 'inspected' && !mission.rookHasFuse
      ? null : procedure.prompt;
    p = world.relay.labelPoint;
  }
  contextAction.hidden = !label || !p;
  if (!label || !p) return;
  const projected = p.clone().project(camera.camera);
  if (projected.z < -1 || projected.z > 1 ||
    Math.abs(projected.x) > 0.95 || Math.abs(projected.y) > 0.87) {
    contextAction.hidden = true;
    return;
  }
  const box = viewport.getBoundingClientRect();
  contextAction.textContent = label;
  contextAction.setAttribute('aria-label', label);
  const x = (projected.x * 0.5 + 0.5) * box.width;
  const y = (-projected.y * 0.5 + 0.5) * box.height;
  contextAction.style.left = Math.min(box.width - 89, Math.max(89, x)) + 'px';
  contextAction.style.top = Math.min(box.height - 35, Math.max(49, y)) + 'px';
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  runtimeSeconds += dt;
  touch.update(dt);

  const keys = keyboardAxis();
  const wantsDrive = touch.driving || keys.x !== 0 || keys.y !== 0;
  const driving = wantsDrive && !procedure.busy;
  if (driving) {
    autoReturn = false;
    if (procedure.travelling) {
      approachRelay = false;
      procedure.cancelApproach();
      rook.clearRoute();
    }
  }
  const axis = touch.driving ? touch.move : keys;
  rook.setDrive(driving ? camera.screenDirection(axis) : null);
  const meeting = mission.stage === 'handoff';
  rook.setWork(nearRelay() && !meeting ? procedure.phase : 'idle', world.relay.location);
  rook.setSocialPose(meeting ? 'receive' : 'none', meeting ? mica.position : null);
  rook.update(dt, nav);
  if (driving || (rook.moving && (approachRelay || autoReturn))) camera.follow(rook.position, dt);
  camera.update(dt);

  const near = nearRelay();
  if (approachRelay && near) {
    if (procedure.travelling) procedure.update(0, true);
    else procedure.interact(true, mission.rookHasFuse);
    approachRelay = false;
    rook.clearRoute();
    world.waypoint.visible = false;
  }
  procedure.update(dt, near);
  if (procedure.phase !== previousPhase) {
    onPhaseChanged(procedure.phase);
    previousPhase = procedure.phase;
  }

  teammate.update(dt, rook, mission, world.depot);
  const micaAtTruck = distance(mica.position, world.depot.standPoint) < 0.86;
  const micaNearRook = distance(mica.position, rook.position) < 1.85;
  const crewHome = nearDepot() &&
    distance(mica.position, world.depot.secondReturnPoint) < 1.2;
  const event = mission.advance(dt, micaAtTruck, micaNearRook, crewHome);
  if (event) crewEvent(event);

  // During handoff the unique fuse visibly travels between two extended hands.
  if (mission.stage === 'handoff') {
    rook.group.updateMatrixWorld(true);
    mica.group.updateMatrixWorld(true);
    if (!priorHanding) {
      world.scene.add(world.depot.item);
      priorHanding = true;
    }
    const from = mica.itemAnchor.getWorldPosition(new THREE.Vector3());
    const to = rook.itemAnchor.getWorldPosition(new THREE.Vector3());
    const t = THREE.MathUtils.smoothstep(mission.timer / 1.25, 0, 1);
    world.depot.item.position.lerpVectors(from, to, t);
    world.depot.item.position.y += Math.sin(t * Math.PI) * 0.18;
    world.depot.item.rotation.set(0, 0, Math.sin(t * Math.PI) * 0.28);
  } else if (priorHanding) {
    priorHanding = false;
    if (mission.micaHasFuse) world.depot.attachTo(mica.itemAnchor);
    else if (mission.rookHasFuse) world.depot.attachTo(rook.itemAnchor);
  }

  if (mission.stage !== previousStage) {
    previousStage = mission.stage;
    if (mission.stage === 'retrieving') showMessage('MICA · OPENING EQUIPMENT BOX', 1.7);
    if (mission.stage === 'returning') {
      autoReturn = true;
    }
  }
  world.depot.update(mission.stage === 'retrieving', mission.hasTruckFuse,
    mission.timer);
  world.relay.update(procedure.phase, procedure.progress, runtimeSeconds, camera.camera);
  audio.update(procedure.complete);

  const p = rook.position;
  stepDistance += distance(p, lastStepLocation);
  if (stepDistance > 1.45) {
    audio.play('footstep');
    stepDistance %= 1.45;
  }
  lastStepLocation = p;

  if (world.waypoint.visible) {
    markerTime += dt;
    world.waypoint.scale.setScalar(1 + Math.sin(markerTime * 4) * 0.08);
    if (!rook.moving && markerTime > 0.25) world.waypoint.visible = false;
  }
  if (toastDeadline && performance.now() > toastDeadline) {
    message.classList.remove('visible');
    toastDeadline = 0;
  }
  positionPrompt();
  renderer.render(world.scene, camera.camera);
});
