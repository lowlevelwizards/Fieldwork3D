import * as THREE from 'three';
import { Operator } from './actors/operator';
import { FieldAudio } from './audio/field-audio';
import { OPERATOR_START } from './constants';
import { CompanionController } from './crew/companion-controller';
import { CrewMission } from './crew/crew-mission';
import { NetworkJob } from './fieldwork/network-job';
import { inspectionGuidance, diagnosedDestination, stationDisplayName } from './fieldwork/service-guidance';
import { TacticalCamera } from './input/tactical-camera';
import { TouchControls } from './input/touch-controls';
import type { Axis } from './input/control-math';
import { NavigationGrid, type Point2 } from './navigation/grid';
import type { StationId } from './systems/power-network';
import { createWorld } from './world/create-world';
import './style.css';

const viewport=document.querySelector<HTMLElement>('#viewport')!;
const message=document.querySelector<HTMLElement>('#message')!;
const contextAction=document.querySelector<HTMLButtonElement>('#contextAction')!;
const deferAction=document.querySelector<HTMLButtonElement>('#deferAction')!;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
renderer.outputColorSpace=THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const world=createWorld();
const nav=new NavigationGrid(world.obstacles);
const rook=new Operator(world.scene,OPERATOR_START,'rook');
const mica=new Operator(world.scene,{x:8.2,z:10.8},'mica');
const companion=new CompanionController(mica,nav);
const crew=new CrewMission();
const camera=new TacticalCamera(renderer.domElement);
const audio=new FieldAudio();
const historyKey='fieldwork3d.network-history.v1';
let jobNumber=0;
let restoredCount=0, deferredCount=0;
try {
  const saved=JSON.parse(localStorage.getItem(historyKey)||'{}') as {
    next?:number;restored?:number;deferred?:number;
  };
  jobNumber=Math.max(0,Math.min(10000,Math.floor(Number(saved.next)||0)));
  restoredCount=Math.max(0,Math.floor(Number(saved.restored)||0));
  deferredCount=Math.max(0,Math.floor(Number(saved.deferred)||0));
} catch { /* Restricted browser storage is optional. */ }
let job=new NetworkJob(jobNumber);
let surveyDone=false, surveyClock=0;
let selectedStation:StationId|null=null;
let pendingStation:StationId|null=null;
let inspectionTimer=0, inspecting:StationId|null=null;
let autoReturn=false, handoffInProgress=false;
let markerTime=0, seconds=0, toastDeadline=0;
let stepDistance=0, micaSteps=0;
let lastRookPos=rook.position, lastMicaPos=mica.position;
let outcomeRecorded=false;
let repairGuidanceShown=false;

const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const stations=world.powerYard.stations;
const dist=(a:Point2,b:Point2)=>Math.hypot(a.x-b.x,a.z-b.z);

function toast(text:string,duration=2.1) {
  message.textContent=text;
  message.classList.add('visible');
  toastDeadline=performance.now()+duration*1000;
}
function nearStation(id:StationId) {
  return dist(rook.position,stations[id].standPoint)<.88;
}
function closeToTruck() {
  return dist(rook.position,world.depot.returnPoint)<1.82 &&
    dist(mica.position,world.depot.secondReturnPoint)<1.25;
}
function pathRook(point:Point2,returning=false) {
  const path=nav.findPath(rook.position,point);
  if(!path.length){toast('NO ACCESSIBLE ROUTE');return false;}
  rook.follow(path);
  world.placeWaypoint(path[path.length-1]);
  markerTime=0;autoReturn=returning;
  return true;
}
function stationRay(x:number,y:number):StationId|null {
  const rect=renderer.domElement.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  pointer.set(((x-rect.left)/rect.width)*2-1,-(((y-rect.top)/rect.height)*2-1));
  raycaster.setFromCamera(pointer,camera.camera);
  let hit:StationId|null=null;
  let near=Infinity;
  for(const id of ['generator','switchgear','relay','junction','mast'] as StationId[]) {
    const contact=raycaster.intersectObject(stations[id].hitbox,false)[0];
    if(contact && contact.distance<near){near=contact.distance;hit=id;}
  }
  return hit;
}
function declareDiagnosis(station:StationId) {
  const {newDiagnosis}=job.inspect(station);
  if(station==='generator' && surveyDone)toast('MICA RADIO · '+inspectionGuidance(job,station),3.2);
  else toast(inspectionGuidance(job,station),3.2);
  if(!newDiagnosis)return;
  const assignment=job.network.fault==='contactor'?'isolation':
    job.network.fault==='fuse'?'fuse':'terminal';
  crew.diagnose(assignment);
  world.depot.setAssignment(assignment);
  audio.play('radio');
  toast('FAULT LOCATED · '+job.network.fault.toUpperCase()+
    (assignment==='isolation'?' · MICA ISOLATING':' · MICA FETCHING SUPPLIES'),3.8);
  repairGuidanceShown=false;
  selectedStation=job.target;
  toast('FAULT AT '+stationDisplayName[job.target]+' · TAP GO TO '+stationDisplayName[job.target],4.0);
}
function goToFault() {
  if(!job.diagnosed || job.finished)return;
  const target=job.target;
  selectedStation=target;
  inspecting=null;
  if(nearStation(target)) {
    pendingStation=null;
    toast('AT '+stationDisplayName[target]+' · '+(
      job.phase==='prepared'?'TEST CIRCUIT':'HOLD THE REPAIR CONTROL'),2.8);
    return;
  }
  if(pathRook(stations[target].standPoint)){
    pendingStation=target;
    toast('ROOK HEADING TO '+stationDisplayName[target],2.4);
  }
}
function startInspect(id:StationId) {
  if(job.finished)return;
  if(inspecting||job.isHolding)return;
  selectedStation=id;
  pendingStation=null;
  inspecting=id;
  inspectionTimer=0;
  rook.clearRoute();
  world.waypoint.visible=false;
  audio.play('inspect');
}
function inspectOrWork(id:StationId) {
  audio.unlock();
  if(crew.stage==='finished'||crew.stage==='returning')return;
  // After diagnosis an unrelated machine still has readable voltage, but
  // repeated taps must not trap the player in the same 0 V inspection loop.
  if(diagnosedDestination(job,id)){
    selectedStation=id;
    toast(inspectionGuidance(job,id)+' · GO TO '+stationDisplayName[job.target],3.3);
    return;
  }
  selectedStation=id;
  if(!nearStation(id)){
    if(pathRook(stations[id].standPoint)) {
      pendingStation=id;
      inspecting=null;
    }
    return;
  }
  if(!job.diagnosed) {
    startInspect(id);
    return;
  }
  if(job.phase==='prepared'){
    if(job.network.breakerIsolated){
      toast('MICA MUST RESTORE SUPPLY BEFORE TEST',2.5);
      return;
    }
    const result=job.test();
    audio.play(result==='trip'?'arc':'switch');
    if(result==='complete'){
      crew.finishJob(true);
      recordOutcome();
      audio.play('power');
      toast('SITE ENERGIZED · RADIOS ONLINE · RETURN TO TRUCK',3.4);
      goHome();
    } else if(result==='trip') {
      world.depot.setIsolated(true);
      audio.play('radio');
      if(crew.reassignIsolation()) toast('TERMINAL ARCED · MICA ISOLATING THE CIRCUIT',3.6);
      else toast('PROTECTION TRIPPED · CIRCUIT OFFLINE',3.2);
    } else toast('POWER NOT REACHING MAST · CONTINUE TRACING',2.5);
    return;
  }
  if(job.phase==='diagnosed'||job.phase==='secondary'||job.phase==='working'){
    const supplied=!job.requiresHardware||crew.rookHasFuse;
    const isolated=job.network.breakerIsolated&&crew.powerIsolated;
    if(!job.canStart(supplied,isolated)) {
      toast(job.requiresIsolation&&!isolated?'WAITING FOR MICA TO ISOLATE POWER':
        'WAITING FOR MICA TO DELIVER EQUIPMENT',2.8);
    } else toast('HOLD THE REPAIR CONTROL TO WORK',1.8);
  }
}
function goHome() {
  if(crew.stage!=='returning')return;
  pendingStation=null;inspecting=null;
  pathRook(world.depot.returnPoint,true);
  toast('CREW RETURNING TO TRUCK',2.1);
}
function deferJob() {
  if(!job.diagnosed||job.finished||!nearStation(job.target)||!job.defer())return;
  crew.finishJob(false);
  recordOutcome();
  audio.play('radio');
  toast('UNRESOLVED FAULT · RETURN VISIT REQUIRED',3.2);
  goHome();
}
function recordOutcome() {
  if(outcomeRecorded||!job.finished)return;
  outcomeRecorded=true;
  if(job.phase==='complete')restoredCount++;
  else deferredCount++;
  try {
    localStorage.setItem(historyKey,JSON.stringify({
      next:jobNumber+1,restored:restoredCount,deferred:deferredCount
    }));
  } catch { /* Continuing without persistence is safe. */ }
}
function newJob() {
  if(crew.stage!=='finished')return;
  jobNumber++;
  job=new NetworkJob(jobNumber);
  crew.reset();
  companion.reset();
  world.depot.resetItem();
  world.depot.setIsolated(false);
  world.relay.resetIncident();
  handoffInProgress=false;
  surveyDone=false;surveyClock=0;
  selectedStation=null;pendingStation=null;inspecting=null;
  inspectionTimer=0;
  autoReturn=false;outcomeRecorded=false;repairGuidanceShown=false;
  world.waypoint.visible=false;
  toast('NEW SERVICE CALL · TRACE THE DEAD CIRCUIT',3.3);
}
function depotAction() {
  audio.unlock();
  if(crew.stage==='finished')newJob();
  else if(crew.stage==='returning')goHome();
  else toast('TRUCK · SPARES AND DISTRIBUTION DISCONNECT',2);
}
function handleContextDown() {
  audio.unlock();
  if(crew.stage==='finished'||crew.stage==='returning'){depotAction();return;}
  if(!selectedStation)return;
  if(job.diagnosed && !nearStation(job.target)){goToFault();return;}
  if(!job.diagnosed && nearStation(selectedStation)){startInspect(selectedStation);return;}
  if(selectedStation!==job.target)return;
  if(job.phase==='diagnosed'||job.phase==='secondary'||job.phase==='working'){
    const supplied=!job.requiresHardware||crew.rookHasFuse;
    const isolated=job.network.breakerIsolated&&crew.powerIsolated;
    if(job.begin(supplied,isolated)){
      audio.play('tool');
      rook.clearRoute();world.waypoint.visible=false;
    }
  } else inspectOrWork(job.target);
}
renderer.domElement.addEventListener('pointerdown',()=>audio.unlock(),{passive:true});
contextAction.addEventListener('pointerdown',event=>{
  // Hold-to-work starts on touch down, but route/inspect chips need clicks.
  if(selectedStation===job.target && nearStation(job.target) &&
      (job.phase==='diagnosed'||job.phase==='secondary'||job.phase==='working')) {
    event.preventDefault();handleContextDown();
  }
});
contextAction.addEventListener('click',()=>{
  if(!job.diagnosed || !nearStation(job.target) ||
      (job.phase!=='working'&&job.phase!=='diagnosed'&&job.phase!=='secondary'))
    handleContextDown();
});
deferAction.addEventListener('click',deferJob);
const stopHold=()=>job.release();
window.addEventListener('pointerup',stopHold);
window.addEventListener('pointercancel',stopHold);
window.addEventListener('blur',stopHold);

const touch=new TouchControls(renderer.domElement,camera,(x,y)=>{
  const station=stationRay(x,y);
  if(station){inspectOrWork(station);return;}
  const point=camera.groundPoint(x,y);
  if(!point){toast('OUTSIDE THE FIELD AREA');return;}
  if(dist(point,{x:8,z:7})<1.30){depotAction();return;}
  if(job.isHolding||inspecting)return;
  if(pathRook(point)){pendingStation=null;}
});
const pressed=new Set<string>();
const movementCodes=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD']);
window.addEventListener('keydown',event=>{
  if(event.code==='KeyF'&&!event.repeat)camera.focus(rook.position);
  else if(event.code==='KeyQ'&&!event.repeat)camera.orbit(Math.PI/8,0);
  else if(event.code==='KeyE'&&!event.repeat)camera.orbit(-Math.PI/8,0);
  else if(event.code==='Equal'||event.code==='NumpadAdd')camera.zoom(.87);
  else if(event.code==='Minus'||event.code==='NumpadSubtract')camera.zoom(1.13);
  else if(event.code==='KeyM'&&!event.repeat)audio.toggleMute();
  else if(event.code==='KeyT'&&!event.repeat)depotAction();
  else if(event.code==='KeyR'&&event.shiftKey&&!event.repeat)newJob();
  else if(event.code==='Space')handleContextDown();
  else if(movementCodes.has(event.code))pressed.add(event.code);
  else return;
  event.preventDefault();
});
window.addEventListener('keyup',event=>{
  pressed.delete(event.code);
  if(event.code==='Space')stopHold();
});
window.addEventListener('blur',()=>pressed.clear());
function keyboardAxis():Axis {
  const x=Number(pressed.has('ArrowRight')||pressed.has('KeyD'))-
    Number(pressed.has('ArrowLeft')||pressed.has('KeyA'));
  const y=Number(pressed.has('ArrowUp')||pressed.has('KeyW'))-
    Number(pressed.has('ArrowDown')||pressed.has('KeyS'));
  const l=Math.hypot(x,y);
  return l>1?{x:x/l,y:y/l}:{x,y};
}
let previousWidth=0,previousHeight=0,previousRatio=0;
function resize(){
  const rect=viewport.getBoundingClientRect();
  const width=Math.max(1,Math.round(rect.width));
  const height=Math.max(1,Math.round(rect.height));
  const ratio=Math.min(window.devicePixelRatio||1,1.6);
  if(width===previousWidth&&height===previousHeight&&ratio===previousRatio)return;
  previousWidth=width;previousHeight=height;previousRatio=ratio;
  renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);
  camera.resize(width,height);
}
new ResizeObserver(resize).observe(viewport);
window.addEventListener('resize',resize);
window.visualViewport?.addEventListener('resize',resize);
window.addEventListener('orientationchange',()=>{
  requestAnimationFrame(()=>{resize();requestAnimationFrame(resize);});
});
resize();camera.focus(rook.position);camera.update(0);

function onCrewEvent(event:string){
  if(event==='collect') {
    world.depot.attachTo(mica.itemAnchor);
    audio.play('latch');audio.play('radio');
    toast('MICA · REQUIRED SPARE RETRIEVED',2);
  } else if(event==='delivered') {
    world.depot.attachTo(rook.itemAnchor);
    audio.play('tool');audio.play('radio');
    toast('MICA → ROOK · SPARE DELIVERED · GO TO '+stationDisplayName[job.target],3.5);
    repairGuidanceShown=false;
    if(job.requiresIsolation&&crew.reassignIsolation()){
      toast('SPARE RECEIVED · MICA NOW ISOLATING SUPPLY',2.8);
    }
  } else if(event==='isolated'){
    job.network.isolate();
    world.depot.setIsolated(true);
    audio.play('switch');
    toast('MICA · BREAKER OPEN · CIRCUIT SAFE',2.8);
  } else if(event==='energized'){
    const closed=job.network.reenergize();
    world.depot.setIsolated(!closed);
    audio.play(closed?'switch':'arc');
    toast(closed?'SUPPLY RESTORED · TEST THE CIRCUIT':
      'BREAKER TRIPPED · FAULT STILL PRESENT',2.6);
  } else if(event==='finished'){
    world.depot.setIsolated(false);
    world.waypoint.visible=false;
    autoReturn=false;
    toast(job.phase==='complete'?'CREW HOME · NETWORK RESTORED':
      'CREW HOME · FOLLOW-UP REQUIRED',3.5);
  }
}
function updatePrompt(){
  let label:string|null=null,position:THREE.Vector3|null=null;
  if(crew.stage==='finished'){
    label='ANOTHER JOB';position=world.depot.labelPoint;
  } else if(crew.stage==='returning'){
    label='RETURN TO TRUCK';position=world.depot.labelPoint;
  } else if(job.diagnosed && !job.finished && !nearStation(job.target) &&
      !inspecting && !pendingStation){
    // One small, actionable label above Rook, not a permanent quest HUD.
    label='GO TO '+stationDisplayName[job.target];
    position=new THREE.Vector3(rook.position.x,
      rook.group.position.y+3.85,rook.position.z);
    selectedStation=job.target;
  } else if(selectedStation && nearStation(selectedStation) && !inspecting && !job.finished){
    position=stations[selectedStation].labelPoint;
    if(job.diagnosed && selectedStation===job.target) {
      if(job.phase==='prepared'){
        if(!job.network.breakerIsolated)label=job.actionLabel;
      } else if(job.canStart(!job.requiresHardware||crew.rookHasFuse,
        job.network.breakerIsolated&&crew.powerIsolated))label=job.actionLabel;
    } else if(!job.diagnosed)label='INSPECT EQUIPMENT';
  }
  const mayDefer=job.diagnosed && !job.finished && nearStation(job.target) &&
    (job.phase==='diagnosed'||job.phase==='prepared'||job.phase==='secondary');
  contextAction.hidden=!label||!position;
  deferAction.hidden=!mayDefer;
  if(!position && mayDefer)position=stations[job.target].labelPoint;
  if(!position)return;
  const proj=position.clone().project(camera.camera);
  if(proj.z< -1||proj.z>1||Math.abs(proj.x)>.96||Math.abs(proj.y)>.89){
    contextAction.hidden=true;deferAction.hidden=true;return;
  }
  const rect=viewport.getBoundingClientRect();
  const x=Math.min(rect.width-95,Math.max(95,(proj.x*.5+.5)*rect.width));
  const y=Math.min(rect.height-48,Math.max(48,(-proj.y*.5+.5)*rect.height));
  if(label){contextAction.textContent=label;contextAction.setAttribute('aria-label',label);}
  contextAction.style.left=x+'px';contextAction.style.top=y+'px';
  contextAction.style.setProperty('--progress',job.phase==='working' ?
    Math.min(100,job.progress/job.holdSeconds*100)+'%':'0%');
  deferAction.style.left=x+'px';
  deferAction.style.top=Math.min(rect.height-24,y+47)+'px';
}

toast('TRACE THE DEAD CIRCUIT · TAP EQUIPMENT TO INSPECT',3.2);
const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{
  const dt=Math.min(clock.getDelta(),.05);
  seconds+=dt;
  touch.update(dt);
  const keys=keyboardAxis();
  const wantDrive=touch.driving||keys.x!==0||keys.y!==0;
  const driving=wantDrive&&!job.isHolding&&!inspecting;
  if(driving){autoReturn=false;pendingStation=null;}
  const axis=touch.driving?touch.move:keys;
  rook.setDrive(driving?camera.screenDirection(axis):null);
  const inWork=Boolean(inspecting)||job.phase==='working';
  const workingAt=inspecting??selectedStation;
  const meeting=crew.stage==='handoff';
  rook.setWork(inWork && workingAt && nearStation(workingAt) && !meeting ?
    inspecting?'inspecting':'replacing':'idle',
    workingAt?stations[workingAt].location:stations.relay.location);
  rook.setSocialPose(meeting?'receive':'none',meeting?mica.position:null);
  rook.update(dt,nav);
  if(driving||(rook.moving&&(pendingStation!==null||autoReturn)))camera.follow(rook.position,dt);
  camera.update(dt);

  if(pendingStation && nearStation(pendingStation)){
    const reached=pendingStation;
    pendingStation=null;
    selectedStation=reached;
    // A diagnosed fault needs its repair action, NOT another inspection.
    if(job.diagnosed && reached===job.target){
      rook.clearRoute();
      world.waypoint.visible=false;
      toast('AT '+stationDisplayName[reached]+' · '+
        (job.phase==='prepared'?'TEST THE CIRCUIT':'HOLD TO REPAIR'),2.7);
    } else startInspect(reached);
  }
  if(inspecting){
    if(!nearStation(inspecting)){inspecting=null;inspectionTimer=0;}
    else {
      inspectionTimer+=dt;
      if(inspectionTimer>=1.10){
        const id=inspecting;inspecting=null;inspectionTimer=0;
        declareDiagnosis(id);
      }
    }
  }
  const workAtTarget=nearStation(job.target);
  const supplied=!job.requiresHardware||crew.rookHasFuse;
  const isolated=job.network.breakerIsolated&&crew.powerIsolated;
  const worked=job.update(dt,workAtTarget,supplied,isolated);
  if(worked==='repaired'){
    if(!job.network.repaired){toast('REPAIR INCOMPLETE');}
    else {
      if(!job.network.breakerIsolated) {
        audio.play('power');
        toast('FAULT CLEARED · TEST THE NETWORK',2.3);
      } else if(crew.requestReenergize()) {
        audio.play('radio');
        toast('MICA RETURNING TO RECONNECT SUPPLY',3);
      } else toast('FAULT CLEARED · NEED POWER RESTORED',2.3);
      if(crew.rookHasFuse){crew.installFuse();world.depot.item.visible=false;}
    }
  }

  const surveyTarget=!surveyDone&&crew.stage==='standby'?
    stations.generator.standPoint:null;
  companion.update(dt,rook,crew,world.depot,surveyTarget);
  if(surveyTarget){
    if(dist(mica.position,surveyTarget)<.96){
      surveyClock+=dt;
      if(surveyClock>=1.2){
        surveyDone=true;
        const finding=job.inspect('generator');
        audio.play('radio');
        toast('MICA RADIO · '+finding.observation.description,3.0);
        if(finding.newDiagnosis){
          const assignment='terminal';
          crew.diagnose(assignment);
          world.depot.setAssignment(assignment);
          selectedStation='generator';
          repairGuidanceShown=false;
          toast('MICA FOUND GENERATOR FAILURE · GO TO GENERATOR AFTER HANDOFF',4.0);
        }
      }
    } else surveyClock=0;
  }
  const atTruck=dist(mica.position,world.depot.standPoint)<.88;
  const nearRook=dist(mica.position,rook.position)<1.86;
  const evt=crew.advance(dt,atTruck,nearRook,closeToTruck());
  if(evt)onCrewEvent(evt);
  if(job.diagnosed && !repairGuidanceShown && crew.rookHasFuse &&
     !nearStation(job.target) && crew.stage==='delivered') {
    repairGuidanceShown=true;
    toast('SPARE RECEIVED · GO TO '+stationDisplayName[job.target],3.5);
  }

  if(crew.stage==='handoff'){
    rook.group.updateMatrixWorld(true);
    mica.group.updateMatrixWorld(true);
    if(!handoffInProgress){world.scene.add(world.depot.item);handoffInProgress=true;}
    const from=mica.itemAnchor.getWorldPosition(new THREE.Vector3());
    const to=rook.itemAnchor.getWorldPosition(new THREE.Vector3());
    const t=THREE.MathUtils.smoothstep(crew.timer/1.25,0,1);
    world.depot.item.position.lerpVectors(from,to,t);
    world.depot.item.position.y+=Math.sin(t*Math.PI)*.18;
  } else if(handoffInProgress){
    handoffInProgress=false;
    if(crew.micaHasFuse)world.depot.attachTo(mica.itemAnchor);
    else if(crew.rookHasFuse)world.depot.attachTo(rook.itemAnchor);
  }
  world.depot.update(crew.stage==='retrieving',crew.hasTruckFuse,crew.timer);
  world.depot.setIsolated(job.network.breakerIsolated);
  world.powerYard.update(job.network,dt,seconds);
  world.powerYard.showServiceGuide(job.diagnosed&&!job.finished?job.target:null,seconds);
  world.relay.updateFromNetwork(job.network,
    inspecting==='relay'||selectedStation==='relay'&&
      nearStation('relay')&&job.phase==='working',seconds,camera.camera);
  // The old cabinet marker was misleading: if the generator or feeder is
  // broken, the relay is only a symptom. The marked machine must be the
  // diagnosed fault, not every downstream appliance without voltage.
  if(job.diagnosed && job.target!=='relay')world.relay.marker.visible=false;
  audio.update(job.network.mastOnline,job.network.generatorRunning);

  stepDistance+=dist(rook.position,lastRookPos);
  micaSteps+=dist(mica.position,lastMicaPos);
  if(stepDistance>1.45){audio.play('footstep');stepDistance%=1.45;}
  if(micaSteps>1.45){if(dist(mica.position,rook.position)<16)audio.play('footstep');micaSteps%=1.45;}
  lastRookPos=rook.position;lastMicaPos=mica.position;
  if(world.waypoint.visible){
    markerTime+=dt;
    world.waypoint.scale.setScalar(1+Math.sin(markerTime*4)*.08);
    if(!rook.moving&&markerTime>.25)world.waypoint.visible=false;
  }
  if(toastDeadline && performance.now()>toastDeadline){
    message.classList.remove('visible');toastDeadline=0;
  }
  updatePrompt();
  renderer.render(world.scene,camera.camera);
});
