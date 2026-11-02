/** Build 122: deterministic physical animation workbench.
 * Identical Build 119/120 rig and footstep scheduler as gameplay/replay.
 */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createOperatorRig,poseOperator,type OperatorRig}
  from './breach-operator-rig.ts';
import {weaponGrips,type Handling} from './breach-weapon-pose.ts';
import {stockPocket,elbowCorridor} from './breach-anatomy.ts';
import {HANDLING_PROFILES} from './breach-handling-profiles.ts';
import {weaponTruth,footTruth,legReachTruth} from './breach-animation-diagnostics.ts';
import {timedHandling,smoothHandling,type HandlingTransition}
  from './breach-handling-transition.ts';
import {lateralAxis,sideOffset,uncrossed} from './breach-locomotion.ts';
import {bodyFromContacts} from './breach-body-motion.ts';
import {LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,LEG_HIP_SIDE} from './breach-leg-geometry.ts';
import {LabMotionCache,LabHistoricalMotionCache,LabDistanceMotionCache,TRACK_DURATION,type LabTrack}
  from './breach-lab-tracks.ts';
import type {WeaponId} from './breach-combat.ts';
import {initialEquipmentLoadout,setEquipmentChoice,syncPrimaryWeapon,
 type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {carryPlacementLedger} from './equipment-carry-placement.ts';
import {itemsForSlot} from './equipment-catalog.ts';


let labKit:EquipmentLoadout=initialEquipmentLoadout();
let labPalette=1;
const kitSelects=Array.from(document.querySelectorAll<HTMLSelectElement>('[data-kit-slot]'));
for(const select of kitSelects){
 const slot=select.dataset.kitSlot as LoadoutSlot;
 for(const item of itemsForSlot(slot)){
  const option=document.createElement('option');
  option.value=item.id;
  option.textContent=item.id==='tactical-smoke'?
    item.name+' (visual preview only)':item.name;
  select.append(option);
 }
 select.addEventListener('change',()=>{
  labKit=setEquipmentChoice(labKit,slot,select.value);syncKit();
 });
}
const kitPresets:Record<string,Partial<Record<LoadoutSlot,string>>>={
 light:{head:'head-none',armor:'armor-none',rig:'rig-none',belt:'belt-light',
 backpack:'backpack-none',top:'top-light',legs:'legs-light',feet:'feet-light',
 medical:'medical-none',tactical:'tactical-none',utility:'utility-none'},
 standard:{head:'head-helmet',armor:'armor-soft',rig:'rig-light',
 belt:'belt-standard',backpack:'backpack-day',top:'top-uniform',
 legs:'legs-field',feet:'feet-boots'},
 heavy:{head:'head-helmet',armor:'armor-carrier',rig:'rig-full',
 belt:'belt-standard',backpack:'backpack-field',top:'top-uniform',
 legs:'legs-field',feet:'feet-boots',medical:'medical-trauma',
 tactical:'tactical-flash',utility:'utility-breach'}
};
function kitPreset(name:string){
 let next=initialEquipmentLoadout();
 for(const [slot,id] of Object.entries(kitPresets[name]??{}))
  next=setEquipmentChoice(next,slot as LoadoutSlot,id);
 return next;
}
/** The Lab can display synthetic magazines, but their storage locations
 * must be the real game's authoritative placement projection. Shotguns use
 * individually loaded shells and have no detachable magazines. */
function previewCarry(kit:EquipmentLoadout,weapon:WeaponId){
 const requested=weapon==='shotgun'?0:
   Number((document.getElementById('kitMagazines') as HTMLSelectElement).value);
 const sample:MagazineItem[]=Array.from({length:requested},(_,i)=>({
  id:'lab-preview/'+i,weapon,rounds:1
 }));
 return carryPlacementLedger(kit,sample);
}
function syncKit(){for(const select of kitSelects)
 select.value=labKit.slots[select.dataset.kitSlot as LoadoutSlot];}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-kit-preset]'))
 button.addEventListener('click',()=>{
  labKit=kitPreset(button.dataset.kitPreset??'standard');syncKit();
 });
document.getElementById('kitPalette')?.addEventListener('change',e=>{
 labPalette=Number((e.target as HTMLSelectElement).value);
});
syncKit();
const choose=<T extends HTMLElement>(id:string)=>
  document.getElementById(id)! as T;
const canvas=choose<HTMLCanvasElement>('preview');
const showLabFailure=(error:unknown)=>{
  const title=choose<HTMLElement>('labStatusTitle');
  const message=choose<HTMLElement>('labStatusMessage');
  title.textContent='OPERATOR LAB COULD NOT START';
  message.textContent=error instanceof Error?error.message:String(error);
  choose<HTMLElement>('labStatus').hidden=false;
  canvas.dataset.ready='error';
};
// Mobile Safari is especially sensitive to large antialiased WebGL
// backbuffers when navigating here from the 3D battle. Keep the operator
// shaded, but avoid allocating an oversized first frame.
const compact=window.matchMedia('(pointer:coarse)').matches||
  window.innerWidth<600;
const renderer=new THREE.WebGLRenderer({
  canvas,antialias:!compact,powerPreference:'low-power',
  alpha:false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,compact?1.5:2));
renderer.shadowMap.enabled=true;renderer.setClearColor(0xc4c5bd);
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-28,28,34,-34,.1,600);
camera.position.set(65,48,68);
const control=new OrbitControls(camera,canvas);
control.enableDamping=true;control.dampingFactor=.11;
control.target.set(0,16,0);control.minZoom=.18;control.maxZoom=7;
scene.add(new THREE.HemisphereLight(0xffffff,0x8f9188,2.2));
const lamp=new THREE.DirectionalLight(0xffffff,2.3);
lamp.position.set(-40,90,45);lamp.castShadow=true;
lamp.shadow.mapSize.set(compact?512:1024,compact?512:1024);lamp.shadow.camera.left=-90;
lamp.shadow.camera.right=90;lamp.shadow.camera.top=90;
lamp.shadow.camera.bottom=-90;scene.add(lamp);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),
  new THREE.MeshStandardMaterial({color:0xaeb1aa,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
scene.add(new THREE.GridHelper(280,28,0x8b9791,0xb4bbb5));
const doorProp=new THREE.Group();
const panel=new THREE.Mesh(new THREE.BoxGeometry(3,37,23),
  new THREE.MeshStandardMaterial({color:0x998262,roughness:.85}));
panel.position.set(28,18.5,0);doorProp.add(panel);
const knob=new THREE.Mesh(new THREE.BoxGeometry(3.4,2.4,2.4),
  new THREE.MeshStandardMaterial({color:0xd6c28e}));
knob.position.set(25.5,20,8);doorProp.add(knob);
scene.add(doorProp);
const operator=choose<HTMLSelectElement>('operator'),
  weapon=choose<HTMLSelectElement>('weapon'),
  injury=choose<HTMLSelectElement>('injury'),
  diagnostic=choose<HTMLSelectElement>('diagnosticLayer'),
  timeline=choose<HTMLInputElement>('timeline'),
  timeOutput=choose<HTMLOutputElement>('timestamp'),
  diagnosticText=choose<HTMLOutputElement>('diagnosticText'),
  playPause=choose<HTMLButtonElement>('playPause'),
  loopButton=choose<HTMLButtonElement>('loopTrack');
const magazineSelector=choose<HTMLSelectElement>('kitMagazines');
const magazineHint=choose<HTMLElement>('magazineHint');
function updateMagazineState(){
 const shotgun=weapon.value==='shotgun';
 magazineSelector.disabled=shotgun;
 magazineHint.textContent=shotgun?
  'SHOTGUN: loose shells; detachable spare magazines are not applicable.':
  'Preview locations use the real equipment carrying ledger.';
}
weapon.addEventListener('change',updateMagazineState);
updateMagazineState();
const COMPARE_POSES:{label:string;mode:Handling;track:LabTrack}[]=[
  {label:'HIGH READY',mode:'high',track:'high-ready'},
  {label:'LOW READY',mode:'low',track:'low-ready'},
  {label:'READY',mode:'ready',track:'ready'},
  {label:'SHORT STOCK',mode:'short',track:'short-stock'},
  {label:'POINT SHOOT',mode:'point',track:'point-shoot'},
  {label:'ACTIVE AIM',mode:'ads',track:'active-aim'},
];
let comparing=false,silhouettes=false,gaitComparing=false;
let gaitCompareRig:OperatorRig|null=null;
let historicalGait:LabHistoricalMotionCache|null=null;
let hybridGait:LabDistanceMotionCache|null=null;
const gaitCompareButton=choose<HTMLButtonElement>('compareGaits');
const gaitCompareStatus=choose<HTMLElement>('gaitCompareStatus');
function clearGaitCompare(){
  if(gaitCompareRig){
    scene.remove(gaitCompareRig.root);gaitCompareRig.dispose();
    gaitCompareRig=null;
  }
  historicalGait=null;hybridGait=null;
}
function ensureGaitCompare(){
  if(!historicalGait||historicalGait.kind!==track)
    historicalGait=new LabHistoricalMotionCache(track);
  if(!hybridGait||hybridGait.kind!==track)
    hybridGait=new LabDistanceMotionCache(track);
  if(!gaitCompareRig){
    gaitCompareRig=createOperatorRig(operator.value,
      operator.value==='hostile'?'red':'blue');
    scene.add(gaitCompareRig.root);
  }
}
let comparisonRigs:OperatorRig[]=[];
let comparisonKey='',comparisonPoseUpdates=0;
const silhouetteColor=new THREE.Color(0x172322);
/** Preserve material identity; restoring original colors must be reversible. */
function applySilhouette(body:OperatorRig,enabled:boolean){
  for(const [material,originalColor] of body.colors)
    material.color.copy(enabled?silhouetteColor:originalColor);
}
const labelLayer=choose<HTMLElement>('compareLabels');

const isolation=choose<HTMLSelectElement>('kitIsolation');
const kitCompareButton=choose<HTMLButtonElement>('compareKit');
let kitComparing=false;
const kitBodies:OperatorRig[]=[];
function endKitComparison(){
 while(kitBodies.length){const body=kitBodies.pop()!;
  scene.remove(body.root);body.dispose();}
 kitComparing=false;kitCompareButton.setAttribute('aria-pressed','false');
 kitCompareButton.textContent='COMPARE THREE';
 document.body.classList.remove('kit-compare');
}
function isolateKit(body:OperatorRig){
 const focus=isolation.value;
 if(focus==='all')return;
 const visual=body.visualKit;
 if(focus!=='head'){
  visual.helmet.visible=false;visual.cap.visible=false;visual.hair.visible=false;
 }
 if(focus!=='armor'){
  visual.softArmor.visible=false;visual.plateCarrier.visible=false;
 }
 if(focus!=='carry'){
  visual.chestRig.visible=false;visual.fieldWebbing.visible=false;
  visual.belt.visible=false;visual.dayPack.visible=false;
  visual.fieldPack.visible=false;body.pack.visible=false;
  for(const items of Object.values(visual.magazines))
   for(const item of items)item.visible=false;
  for(const item of [...body.rigPouches,body.beltPouch,
   body.medicalPouch,body.radioUnit,body.utilityTool,body.flashCanister])
    item.visible=false;
 }
}
kitCompareButton.addEventListener('click',()=>{
 if(kitComparing){endKitComparison();fit();return;}
 kitComparing=true;
 (document.getElementById('kitPanel') as HTMLDetailsElement).open=true;
 document.body.classList.add('kit-compare');
 kitCompareButton.textContent='EXIT KIT COMPARISON';
 if(comparing){
  comparing=false;clearComparison();
  poseCompareButton.setAttribute('aria-pressed','false');
  labelLayer.hidden=true;document.body.classList.remove('compare-open');
 }
 if(gaitComparing){
  gaitComparing=false;clearGaitCompare();
  gaitCompareButton.setAttribute('aria-pressed','false');
  gaitCompareStatus.hidden=true;
 }
 for(let i=0;i<3;i++){
  const body=createOperatorRig(operator.value,
   operator.value==='hostile'?'red':'blue');
  scene.add(body.root);kitBodies.push(body);
 }
 kitCompareButton.setAttribute('aria-pressed','true');fit();
});

const poseCompareButton=choose<HTMLButtonElement>('comparePose');
const silhouetteButton=choose<HTMLButtonElement>('silhouetteMode');
function clearComparison(){
  comparisonKey='';
  for(const operatorRig of comparisonRigs){
    scene.remove(operatorRig.root);operatorRig.dispose();
  }
  comparisonRigs=[];labelLayer.replaceChildren();
}
function ensureComparison(){
  if(comparisonRigs.length)return;
  for(const [index,info] of COMPARE_POSES.entries()){
    const body=createOperatorRig(operator.value,
      operator.value==='hostile'?'red':'blue');
    const column=index%2,row=Math.floor(index/2);
    body.root.position.set((column-.5)*77,0,(row-1)*70);
    scene.add(body.root);comparisonRigs.push(body);
    const button=document.createElement('button');
    button.textContent=info.label;
    button.title='Inspect '+info.label+' · stock and grip diagnostics';
    button.addEventListener('click',()=>chooseTrack(info.track));
    labelLayer.append(button);
  }
}
const LAB_HANDLING:Partial<Record<LabTrack,Handling>>={
  'high-ready':'high','low-ready':'low','ready':'ready',
  'short-stock':'short','active-aim':'ads','point-shoot':'point'
};
let labSwitch:null|{from:Handling;to:Handling;
  since:number;duration:number;
  fromWeapon:{origin:THREE.Vector3;rotation:THREE.Euler};
  fromProfile:NonNullable<OperatorRig['handlingProfile']>}=null;
let rig:OperatorRig|null=null,track:LabTrack='idle';
const gaitReference=choose<HTMLSelectElement>('gaitReference');
let cache:LabMotionCache|LabHistoricalMotionCache|LabDistanceMotionCache=new LabMotionCache(track);
const newTrackCache=(kind:LabTrack)=>gaitReference.value==='historical'?
  new LabHistoricalMotionCache(kind):gaitReference.value==='candidate'?
  new LabDistanceMotionCache(kind):new LabMotionCache(kind);
gaitReference.addEventListener('change',()=>{
  cache=newTrackCache(track);draw();
});
let clock=0,last=performance.now(),rate=1,playing=true,loop=true;
let cameraFollow={x:0,z:0};
const debug=new THREE.Group();scene.add(debug);
const markerColors=[0xf1b77d,0x7cbbae,0xf2d88b,0xa0a8df];
const markers=Array.from({length:8},(_,i)=>{
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1.45,9,7),
    new THREE.MeshBasicMaterial({color:markerColors[i%4],
      depthTest:false}));
  debug.add(mesh);return mesh;
});
const guideGeometry=new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()]);
const guide=new THREE.Line(guideGeometry,
  new THREE.LineBasicMaterial({color:0xe2a96e,depthTest:false}));
debug.add(guide);
const lanesGeometry=new THREE.BufferGeometry();
lanesGeometry.setAttribute('position',
  new THREE.BufferAttribute(new Float32Array(4*2*3),3));
const lanes=new THREE.LineSegments(lanesGeometry,
  new THREE.LineBasicMaterial({color:0x79a6aa,depthTest:false}));
debug.add(lanes);lanes.visible=false;
const supportBoxes=[0,1].map(()=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(12,1,13),
    new THREE.MeshBasicMaterial({color:0x5eaa9f,wireframe:true,
      depthTest:false}));
  debug.add(mesh);return mesh;
});
const build=()=>{
  labSwitch=null;
  clearComparison();clearGaitCompare();
  if(rig){scene.remove(rig.root);rig.dispose();}
  endKitComparison();
  rig=createOperatorRig(operator.value,operator.value==='hostile'?'red':'blue');
  scene.add(rig.root);
};
operator.addEventListener('change',build);
function fit(next='iso'){
  const center=comparing||kitComparing?new THREE.Vector3():rig?.root.position??
    new THREE.Vector3();
  const dx=next==='front'?75:next==='top'?.01:next==='side'?0:65;
  const dz=next==='side'?75:next==='top'?.01:next==='front'?0:68;
  camera.position.set(center.x+dx,next==='top'?115:next==='front'||next==='side'?16:48,
    center.z+dz);
  camera.zoom=comparing?
    Math.min(.34,Math.max(.21,.58*window.innerWidth/window.innerHeight)):
    gaitComparing?(compact?.60:.77):kitComparing?(compact?.65:.9):1.4;camera.updateProjectionMatrix();
  control.target.set(center.x,16,center.z);control.update();
  cameraFollow={x:center.x,z:center.z};
}
function chooseTrack(next:LabTrack){
  // Snapshot the actual current presentation, not merely the last named
  // pose. Rapid tap-to-tap retargeting remains continuous mid-transition.
  const target=LAB_HANDLING[next];
  if(target&&rig&&!comparing&&next!==track){
    const previous=LAB_HANDLING[track]??labSwitch?.to??'ready';
    const delta=(target==='ads'||previous==='ads')?.32:
      (target==='short'||previous==='short')?.30:.24;
    labSwitch={from:previous,to:target,since:performance.now()/1000,
      duration:delta,fromWeapon:{
        origin:rig.weapon.position.clone(),
        rotation:rig.weapon.rotation.clone()},
      fromProfile:{...(rig.handlingProfile??HANDLING_PROFILES[previous])}};
  }else labSwitch=null;
  if(comparing){
    comparing=false;
    poseCompareButton.setAttribute('aria-pressed','false');
    document.body.classList.remove('compare-open');
    labelLayer.hidden=true;
    renderer.shadowMap.enabled=true;
    fit();
  }
  track=next;cache=newTrackCache(next);clock=0;playing=true;
  if(gaitComparing){historicalGait=null;hybridGait=null;ensureGaitCompare();}
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-pose]'))
    b.setAttribute('aria-pressed',String(b.dataset.pose===next));
  playPause.textContent='PAUSE';
}
document.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button=>
  button.addEventListener('click',()=>chooseTrack(button.dataset.pose as LabTrack)));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>
  button.addEventListener('click',()=>fit(button.dataset.view)));
choose<HTMLButtonElement>('resetCamera').addEventListener('click',()=>fit());
gaitCompareButton.addEventListener('click',()=>{
  if(kitComparing)endKitComparison();
  gaitComparing=!gaitComparing;
  if(gaitComparing){
    comparing=false;labelLayer.hidden=true;
    poseCompareButton.setAttribute('aria-pressed','false');
    document.body.classList.remove('compare-open');
    ensureGaitCompare();
  }else clearGaitCompare();
  gaitCompareButton.setAttribute('aria-pressed',String(gaitComparing));
  gaitCompareStatus.hidden=!gaitComparing;
  fit();
});
poseCompareButton.addEventListener('click',()=>{
  if(kitComparing)endKitComparison();
  comparing=!comparing;
  if(comparing&&gaitComparing){
    gaitComparing=false;clearGaitCompare();
    gaitCompareButton.setAttribute('aria-pressed','false');
    gaitCompareStatus.hidden=true;
  }
  if(comparing){comparisonKey='';ensureComparison();}
  labelLayer.hidden=!comparing;
  poseCompareButton.setAttribute('aria-pressed',String(comparing));
  document.body.classList.toggle('compare-open',comparing);
  renderer.shadowMap.enabled=!comparing;
  fit();
});
choose<HTMLButtonElement>('savePoseView').addEventListener('click',()=>{
  // Keep an exact visual reference across versions without retaining images
  // or GPU render targets in memory; works for the current matched view.
  const button=choose<HTMLButtonElement>('savePoseView');
  try{
    // Render synchronously during the user gesture: mobile WebGL backbuffers
    // may be discarded after normal presentation.
    renderer.render(scene,camera);
    const image=canvas.toDataURL('image/png');
    if(!image.startsWith('data:image/png'))
      throw Error('PNG capture unavailable');
    const link=document.createElement('a');
    link.download='fieldwork-poses-reference.png';
    link.href=image;
    link.click();
    button.textContent='SAVED PNG';
  }catch(error){
    button.textContent='SAVE FAILED';
    button.title=error instanceof Error?error.message:String(error);
  }
});
silhouetteButton.addEventListener('click',()=>{
  silhouettes=!silhouettes;
  silhouetteButton.setAttribute('aria-pressed',String(silhouettes));
});
choose<HTMLButtonElement>('diagnostics').addEventListener('click',()=>{
  diagnostic.value=diagnostic.value==='off'?'anchors':'off';
  choose<HTMLButtonElement>('diagnostics').setAttribute(
    'aria-pressed',String(diagnostic.value!=='off'));
});
diagnostic.addEventListener('change',()=>choose<HTMLButtonElement>(
  'diagnostics').setAttribute('aria-pressed',
  String(diagnostic.value!=='off')));
choose<HTMLButtonElement>('slowMotion').addEventListener('click',e=>{
  rate=rate===.25?1:.25;
  (e.currentTarget as HTMLButtonElement).setAttribute(
    'aria-pressed',String(rate<1));
});
playPause.addEventListener('click',()=>{
  playing=!playing;playPause.textContent=playing?'PAUSE':'PLAY';
});
loopButton.addEventListener('click',()=>{
  loop=!loop;loopButton.setAttribute('aria-pressed',String(loop));
});
choose<HTMLButtonElement>('restartTrack').addEventListener('click',()=>{
  clock=0;playing=true;playPause.textContent='PAUSE';
});
choose<HTMLButtonElement>('stepFrame').addEventListener('click',()=>{
  playing=false;playPause.textContent='PLAY';
  clock=Math.min(TRACK_DURATION,clock+1/60);
});
timeline.addEventListener('input',()=>{
  playing=false;playPause.textContent='PLAY';
  clock=Number(timeline.value)/1000;
  // Render on the input event: seeking must not display an older frame while
  // a busy mobile GPU waits for the next requestAnimationFrame callback.
  draw();
});
function resize(){
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);
  const half=36,aspect=w/h;
  camera.left=-half*aspect;camera.right=half*aspect;
  camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
  if(comparing)fit();
}
window.addEventListener('resize',resize);
const world=new THREE.Vector3(),world2=new THREE.Vector3();
function showDiagnostics(){
  if(!rig)return;
  const layer=diagnostic.value;
  debug.visible=layer!=='off';
  if(!debug.visible){diagnosticText.textContent='';return;}
  const sampled=cache.sample(clock),f=sampled.state.feet;
  const feet=sampled.feet;
  for(const marker of markers)marker.visible=false;
  for(const box of supportBoxes)box.visible=false;
  guide.visible=false;lanes.visible=false;
  const put=(i:number,x:number,y:number,z:number)=>{
    markers[i].visible=true;markers[i].position.set(x,y,z);
  };
  if(layer==='anchors'||layer==='targets'||layer==='support'||
    layer==='lanes'||layer==='balance'||
    layer==='polygon'){
    for(let i=0;i<2;i++){
      const point=layer==='targets'?f[i].swingTo:f[i].plantedAt;
      put(i,point.x,2,point.y);
    }
  }
  if(layer==='lanes'){
    lanes.visible=true;
    const yaw=-sampled.state.pelvisYaw;
    const lateral=lateralAxis(yaw),forward={x:Math.cos(yaw),y:Math.sin(yaw)};
    const coords=lanesGeometry.getAttribute('position') as
      THREE.BufferAttribute;
    const origin=sampled.motion;
    for(let i=0;i<4;i++){
      const distance=[-11,-2.2,2.2,11][i];
      const x=origin.x+lateral.x*distance;
      const z=origin.z+lateral.y*distance;
      coords.setXYZ(i*2,x-forward.x*18,1.2,z-forward.y*18);
      coords.setXYZ(i*2+1,x+forward.x*18,1.2,z+forward.y*18);
    }
    coords.needsUpdate=true;
  }
  if(layer==='balance'){
    rig.root.updateMatrixWorld(true);
    const p=rig.hip.getWorldPosition(new THREE.Vector3());
    put(2,p.x,p.y,p.z);
  }
  if(layer==='support'){
    supportBoxes.forEach((box,i)=>{
      box.visible=true;
      box.position.set(f[i].plantedAt.x,1,f[i].plantedAt.y);
      box.rotation.y=rig!.root.rotation.y;
    });
  }
  if(layer==='polygon'){
    const coords=guideGeometry.getAttribute('position') as
      THREE.BufferAttribute;
    const left=f[0].plantedAt,right=f[1].plantedAt;
    coords.setXYZ(0,left.x,2,left.y);
    coords.setXYZ(1,right.x,2,right.y);
    coords.setXYZ(2,rig.root.position.x,2,rig.root.position.z);
    coords.needsUpdate=true;guide.visible=true;
  }
  if(layer==='planes'||layer==='limits'){
    rig.root.updateMatrixWorld(true);
    for(let i=0;i<2;i++){
      rig.feet[i].upper.getWorldPosition(world);
      rig.feet[i].lower.getWorldPosition(world2);
      put(i,world2.x,world2.y,world2.z);
      rig.arms[i].lower.getWorldPosition(world);
      put(i+2,world.x,world.y,world.z);
    }
  }
  if(layer==='weapon'){
    rig.root.updateMatrixWorld(true);
    const g=weaponGrips(weapon.value as WeaponId);
    const coords=[
      [g.stockX,0,0],[g.primaryX,g.primaryY,1.8],
      [g.supportX,g.supportY,-1.6]
    ];
    for(let i=0;i<coords.length;i++){
      const p=rig.weapon.localToWorld(
        new THREE.Vector3(coords[i][0],coords[i][1],coords[i][2]));
      put(i,p.x,p.y,p.z);
    }
    const mode=LAB_HANDLING[track]??labSwitch?.to??'ready';
    const pocket=stockPocket(mode);
    const shoulder=rig.chest.localToWorld(
      new THREE.Vector3(pocket.x,pocket.y,pocket.z));
    put(3,shoulder.x,shoulder.y,shoulder.z);
    const butt=markers[0].position,coords3=
      guideGeometry.getAttribute('position') as THREE.BufferAttribute;
    coords3.setXYZ(0,butt.x,butt.y,butt.z);
    coords3.setXYZ(1,shoulder.x,shoulder.y,shoulder.z);
    coords3.setXYZ(2,shoulder.x,shoulder.y,shoulder.z);
    coords3.needsUpdate=true;guide.visible=true;
    for(let i=0;i<2;i++){
      const sign=i===0?-1:1,hint=elbowCorridor(
        mode,sign as -1|1,rig.handlingProfile??undefined);
      const point=rig.chest.localToWorld(
        new THREE.Vector3(hint.x,hint.y,hint.z));
      put(i+4,point.x,point.y,point.z);
    }
  }
  const trouble=rig.feet.filter(x=>x.outOfReach).length+
    rig.arms.filter(x=>x.outOfReach).length;
  const flex=(a:THREE.Mesh,b:THREE.Mesh)=>{
    const u=new THREE.Vector3(0,1,0).applyQuaternion(
      a.getWorldQuaternion(new THREE.Quaternion()));
    const v=new THREE.Vector3(0,1,0).applyQuaternion(
      b.getWorldQuaternion(new THREE.Quaternion()));
    return Math.acos(Math.min(1,Math.max(-1,u.dot(v))))*180/Math.PI;
  };
  const angles=[...rig.feet.map(x=>flex(x.upper,x.lower)),
    ...rig.arms.map(x=>flex(x.upper,x.lower))];
  const lowerFrame=Math.floor(clock*60+1e-8);
  const alpha=clock*60-lowerFrame;
  const balance=bodyFromContacts({feet,velocity:sampled.motion.speed,
    heading:sampled.motion.heading,travelYaw:sampled.motion.travelYaw,
    turning:sampled.motion.turning,injury:sampled.motion.injury,
    posture:sampled.motion.posture});
  const separated=sideOffset(feet[0].position,feet[1].position,
    -sampled.state.pelvisYaw);
  const crossing=!uncrossed(feet[0].position,feet[1].position,
    -sampled.state.pelvisYaw,3.5);
  rig.root.updateMatrixWorld(true);
  const barrelAxis=new THREE.Vector3(1,0,0).applyQuaternion(
    rig.weapon.getWorldQuaternion(new THREE.Quaternion()));
  const barrelYaw=Math.atan2(barrelAxis.z,barrelAxis.x);
  const aimTruth=weaponTruth(barrelYaw,sampled.motion.heading);
  const measuredRig=rig;
  const feetTruth=footTruth(...([0,1].map(i=>({
    requested:feet[i].position,
    rendered:{x:measuredRig.feet[i].shoe.getWorldPosition(
      new THREE.Vector3()).x,
      y:measuredRig.feet[i].shoe.getWorldPosition(new THREE.Vector3()).z},
    phase:feet[i].phase,contact:feet[i].contact,
    reachError:measuredRig.legGap[i]
  })) as [Parameters<typeof footTruth>[0],Parameters<typeof footTruth>[1]]));
  const reachTruth=feet.map((foot,i)=>{
    const hip=measuredRig.hip.localToWorld(new THREE.Vector3(
      0,0,i===0?-LEG_HIP_SIDE:LEG_HIP_SIDE));
    const ankle=new THREE.Vector3(foot.position.x,
      1.45+foot.height,foot.position.y);
    return legReachTruth({hip,ankle,upper:LEG_UPPER_LENGTH,lower:LEG_LOWER_LENGTH});
  });
  diagnosticText.textContent=[
    'TIME '+clock.toFixed(3)+' / '+TRACK_DURATION.toFixed(2),
    'BARREL '+barrelYaw.toFixed(3)+' / BODY '+sampled.motion.heading.toFixed(3)+
      ' · OFFSET '+aimTruth.aimErrorDeg.toFixed(1)+'°',
    'FOOT TRUTH '+feetTruth.map(f=>f.offset.toFixed(2)).join('/')+
      ' · REACH '+feetTruth.map(f=>f.reach.toFixed(2)).join('/'),
    'GAIT '+sampled.state.mode.toUpperCase()+
      ' · NEXT '+sampled.state.shuffleNext.toUpperCase()+
      ' '+(sampled.state.shuffleLead===0?'LEFT':'RIGHT'),
    'LEFT '+feet[0].phase.toUpperCase()+'  RIGHT '+
      feet[1].phase.toUpperCase(),
    'SPEED '+sampled.motion.speed.toFixed(1)+
      ' · REACH FLAGS '+trouble,
    'CONTACTS '+feet.filter(x=>x.contact).length+
      ' · SEPARATION '+separated.toFixed(1)+
      (crossing?' · CROSSING!':''),
    'PHYSICAL REACH '+reachTruth.map(v=>v.requested.toFixed(1)+'/'+v.maximum.toFixed(1)).join(' / ')+
      ' · EXCESS '+reachTruth.map(v=>v.reachError.toFixed(2)).join(' / '),
    'ANKLE GAP '+rig.legGap.map(v=>v.toFixed(2)).join(' / ')+
      ' · GRIP ERROR '+rig.gripError.toFixed(3)+
       ' · BUTTPLATE GAP '+rig.stockError.toFixed(2)+
       ' · ELBOW SPREAD '+rig.elbowSpread.map(v=>v.toFixed(1)).join('/')+
      ' · SUPPORT '+balance.support.toFixed(2),
    'PELVIS '+sampled.state.pelvisYaw.toFixed(2)+
      ' · LIFT '+balance.pelvisY.toFixed(2),
    'LEFT '+(feet[0].progress??0).toFixed(2)+
      ' PITCH '+(feet[0].pitch??0).toFixed(2)+
      ' · RIGHT '+(feet[1].progress??0).toFixed(2)+
      ' PITCH '+(feet[1].pitch??0).toFixed(2),
    layer==='limits'||layer==='planes'?
      'KNEES '+angles.slice(0,2).map(x=>x.toFixed(0)+'°').join(' / ')+
      ' · ELBOWS '+angles.slice(2).map(x=>x.toFixed(0)+'°').join(' / '):'',
    layer==='replay'?'60Hz FRAME '+lowerFrame+' → '+(lowerFrame+1)+
      ' · α '+alpha.toFixed(3)+' · SEEK-SAFE':'',
    labSwitch?'BLEND '+labSwitch.from+' → '+labSwitch.to+
      ' α '+smoothHandling((performance.now()/1000-labSwitch.since)/
        labSwitch.duration).toFixed(2):'',
    layer==='weapon'?'BUTTPLATE / GRIPS / POCKET / ELBOW HINTS':''
  ].filter(Boolean).join('\n');
}
function draw(){
  if(!rig)return;
  const {motion,feet,state}=cache.sample(clock);
  const previewHandling=LAB_HANDLING;
  const scripted:HandlingTransition|undefined=
    track==='ready-to-ads'?timedHandling('ready','ads',clock,.55,1.15):
    track==='ads-to-low'?timedHandling('ads','low',clock,.55,1.15):
    undefined;
  const alpha=labSwitch?smoothHandling(
    (performance.now()/1000-labSwitch.since)/labSwitch.duration):1;
  const direct:HandlingTransition|undefined=labSwitch?
    {from:labSwitch.from,to:labSwitch.to,alpha,
      fromProfile:labSwitch.fromProfile,
      fromWeapon:labSwitch.fromWeapon}:undefined;
  const transition=direct??scripted;
  if(labSwitch&&alpha>=1)labSwitch=null;
  const selectedHandling=transition?.to??previewHandling[track];
  doorProp.visible=track==='door'||track==='kick';
  rig.root.position.set(motion.x,0,motion.z);
  const currentWeapon=(track==='reload-shotgun'?'shotgun':weapon.value) as WeaponId;
  const currentKit=syncPrimaryWeapon(labKit,currentWeapon);
  const currentCarry=previewCarry(currentKit,currentWeapon);
  if(!comparing)poseOperator(rig,{x:motion.x,z:motion.z,heading:motion.heading,
    travelYaw:motion.travelYaw,seconds:clock,stride:clock*40,
    velocity:motion.speed,posture:motion.posture,
    gait:track==='run'?'run':track==='pie'?'pie':
      track==='squeeze'?'squeeze':'walk',
    injury:Math.max(motion.injury,Number(injury.value),
      track==='reload-wounded'?2:0),
    weapon:(track==='reload-shotgun'?'shotgun':weapon.value) as WeaponId,
    reload:motion.reload,reloadDuration:1.8,
    reloadMode:track==='reload-retention'?'retention':
      track==='reload-shotgun'?'shells':'emergency',
    reloadRemoved:track==='reload-interrupt'&&clock>.53,
    reloadInserted:false,
    lastDoorAt:motion.doorAt,
    lastBashAt:track==='bash'?.75:-100,
    bashRole:track==='bash'?'push':null,
    doorMethod:track==='kick'?'kick':'open',
    doorPoint:track==='door'?{x:25.5,y:8}:undefined,
    lastThrowAt:motion.throwAt,
    down:motion.down||Number(injury.value)===3,
    surrender:false,aiming:motion.aim>.2,
    firing:false,turning:motion.turning,aimBlend:motion.aim,
    handlingOverride:selectedHandling,
    handlingTransition:transition,
    replayFeet:feet,pelvisYaw:state.pelvisYaw,
    hybridSupport:gaitReference.value==='candidate',
    deterministic:true,shotHeading:motion.heading,
     equipment:currentKit,appearanceSeed:labPalette,
     faceStyle:choose<HTMLSelectElement>('faceTreatment').value as
       'blank'|'quiet'|'graphic',
     magazineCarryLocations:currentCarry.filter(p=>p.kind==='magazine')
      .map(p=>p.location),
     medicalCarryLocation:currentCarry.find(p=>p.kind==='medical')?.location,
     utilityCarryLocation:currentCarry.find(p=>p.kind==='utility')?.location,
    downPose:track==='down-back'?'back':
      track==='down-left'?'left':
      track==='down-right'?'right':
      track==='down-slump'?'slump':'forward',
    downProgress:motion.down?Math.max(0,Math.min(1,(clock-.45)/.58)):0,
    hitRegion:track==='wounded'?'torso':undefined,
    hitYaw:motion.heading+Math.PI/2,
    hitAge:track==='wounded'?Math.max(0,clock-.7):undefined,
    hitSeverity:2},0);
  if(!comparing&&!kitComparing)isolateKit(rig);
  if(gaitComparing&&rig.lastPose){
    ensureGaitCompare();
    const historical=historicalGait!.sample(clock);
    const hybrid=hybridGait!.sample(clock);
    // Shift recorded world contacts and body by the SAME offset.
    // Never modify the cached reference timelines.
    const footOffset=(targets:typeof historical.feet,dx:number)=>
      targets.map(f=>({...f,position:{x:f.position.x+dx,
        y:f.position.y}})) as typeof historical.feet;
    const pose={...rig.lastPose};
    rig.root.position.set(motion.x-19,0,motion.z);
    poseOperator(rig,{...pose,x:motion.x-19,z:motion.z,
      replayFeet:footOffset(historical.feet,-19),
      pelvisYaw:historical.state.pelvisYaw,
      hybridSupport:false,deterministic:true},0);
    const other=gaitCompareRig!;
    other.root.visible=true;other.root.position.set(motion.x+19,0,motion.z);
    poseOperator(other,{...pose,x:motion.x+19,z:motion.z,
      replayFeet:footOffset(hybrid.feet,19),
      pelvisYaw:hybrid.state.pelvisYaw,
      hybridSupport:true,deterministic:true},0);
    gaitCompareStatus.textContent='LEFT: PRE-180 · RIGHT: HYBRID · '+
      'SYNC '+clock.toFixed(2)+'s';
  }else if(gaitCompareRig)gaitCompareRig.root.visible=false;
  rig.root.visible=!comparing&&!kitComparing;
  if(kitComparing&&rig.lastPose){
   const types=['light','standard','heavy'] as const;
   for(let i=0;i<kitBodies.length;i++){
    const body=kitBodies[i],x=(i-1)*31;
    body.root.position.set(x,0,0);
    poseOperator(body,{...rig.lastPose,x,z:0,velocity:0,turning:0,
     equipment:syncPrimaryWeapon(kitPreset(types[i]),weapon.value as WeaponId),
     appearanceSeed:labPalette+i,
     faceStyle:choose<HTMLSelectElement>('faceTreatment').value as
       'blank'|'quiet'|'graphic',
     magazineCarryLocations:previewCarry(kitPreset(types[i]),
       weapon.value as WeaponId).filter(p=>p.kind==='magazine')
       .map(p=>p.location),
     down:false,injury:0,posture:'stand',deterministic:true},0);
    if(silhouettes)applySilhouette(body,true);
   }
  }
  // poseOperator restores all original material colors every tick.
  // Keep the silhouette applied *after* each pose, not only on toggle.
  if(!comparing&&silhouettes)applySilhouette(rig,true);
  if(comparing){
    ensureComparison();
    const signature=operator.value+'|'+weapon.value+'|'+silhouettes;
    if(comparisonKey!==signature){
      comparisonKey=signature;
      canvas.dataset.comparePoseUpdates=String(++comparisonPoseUpdates);
      comparisonRigs.forEach((body,i)=>{
      const info=COMPARE_POSES[i],column=i%2,row=Math.floor(i/2);
      const x=(column-.5)*77,z=(row-1)*70;
      body.root.visible=true;body.root.position.set(x,0,z);
      poseOperator(body,{x,z,heading:0,travelYaw:0,seconds:clock,
        stride:0,velocity:0,posture:'stand',injury:0,
        weapon:weapon.value as WeaponId,
        reload:0,reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
        down:false,surrender:false,aiming:info.mode==='ads',
        firing:false,turning:0,handlingOverride:info.mode,
        deterministic:true},0);
      applySilhouette(body,silhouettes);
      const label=labelLayer.children[i] as HTMLButtonElement;
      label.title=info.label+' · stock '+body.stockError.toFixed(2)+
        ' · grip '+body.gripError.toFixed(2);
      });
    }
  }else for(const body of comparisonRigs)body.root.visible=false;
  const dx=comparing||kitComparing?0:motion.x-cameraFollow.x,
    dz=comparing||kitComparing?0:motion.z-cameraFollow.z;
  camera.position.x+=dx;camera.position.z+=dz;
  control.target.x+=dx;control.target.z+=dz;
  cameraFollow={x:motion.x,z:motion.z};
  timeline.value=String(Math.round(clock*1000));
  timeOutput.textContent=clock.toFixed(2)+'s';
  if(comparing||kitComparing){
    debug.visible=false;
    diagnosticText.textContent=kitComparing?
      'LIGHT / STANDARD / HEAVY · PROPORTIONS LOCKED':
      'SIX STANCES · ORBIT / ZOOM TO COMPARE';
  }else showDiagnostics();
  canvas.dataset.compare=String(comparing);
  canvas.dataset.compareGaits=String(gaitComparing);
  canvas.dataset.silhouette=String(silhouettes);
  canvas.dataset.track=track;
  canvas.dataset.weaponHandling=selectedHandling??'automatic';
  canvas.dataset.handlingFrom=transition?.from??'';
  canvas.dataset.handlingTo=transition?.to??'';
  canvas.dataset.handlingBlend=(transition?.alpha??1).toFixed(3);
  canvas.dataset.time=clock.toFixed(3);
  canvas.dataset.contactCount=String(feet.filter(x=>x.contact).length);
  canvas.dataset.gait=state.mode;
  canvas.dataset.gaitReference=gaitReference.value;
  canvas.dataset.promotion=gaitReference.value==='candidate'?'lab-only':'none';
  canvas.dataset.gripError=rig.gripError.toFixed(4);
  canvas.dataset.eyeError=rig.eyeError.toFixed(3);
  canvas.dataset.ankleGap=Math.max(...rig.legGap).toFixed(3);
  canvas.dataset.crossed=String(!uncrossed(feet[0].position,
    feet[1].position,-state.pelvisYaw,3.5));
  control.update();
  if(comparing){
    comparisonRigs.forEach((body,i)=>{
      body.root.updateMatrixWorld(true);
      const p=new THREE.Vector3(0,51,0);
      body.root.localToWorld(p);p.project(camera);
      const label=labelLayer.children[i] as HTMLButtonElement;
      label.style.left=((p.x+1)*window.innerWidth/2)+'px';
      label.style.top=((1-p.y)*window.innerHeight/2)+'px';
      label.hidden=p.z>1||p.z< -1;
    });
  }
  renderer.render(scene,camera);
  if(renderer.info.render.calls<1)
    throw Error('3D renderer returned without drawing an operator');
  canvas.dataset.drawCalls=String(renderer.info.render.calls);
  canvas.dataset.triangles=String(renderer.info.render.triangles);
  canvas.dataset.kitComparison=String(kitComparing);
  if(canvas.dataset.ready!=='true'){
    canvas.dataset.ready='true';
    choose<HTMLElement>('labStatus').hidden=true;
  }
}
function tick(now:number){
  const elapsed=Math.min(.05,Math.max(0,(now-last)/1000));
  last=now;
  if(playing){
    clock+=elapsed*rate;
    if(clock>=TRACK_DURATION){
      if(loop)clock%=TRACK_DURATION;
      else{clock=TRACK_DURATION;playing=false;playPause.textContent='PLAY';}
    }
  }
  try{
    draw();requestAnimationFrame(tick);
  }catch(error){showLabFailure(error);}
}
try{
  build();fit();resize();chooseTrack('idle');
  // Render immediately rather than depending on a delayed first
  // requestAnimationFrame callback on a newly navigated mobile tab.
  draw();requestAnimationFrame(tick);
}catch(error){showLabFailure(error);}
