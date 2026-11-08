/** Standalone Operator Lab pose-authoring UI. Never imported by battle. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createOperatorRig,poseOperator} from './breach-operator-rig.ts';
import type {OperatorRig,OperatorPose} from './breach-operator-rig.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {AUTHORED_SHORT_REFERENCES,PRESET_CATALOG,PRESET_IDS,
 applyToAllWeapons,newPoseLibrary,parsePoseLibrary,referenceForPreset,
 specForPreset,transferPoseToWeapon,type PoseLibrary}
 from './operator-pose-library.ts';
import {
 WORKBENCH_TARGETS,captureWorkbenchPose,cloneWorkbenchPose,
 snapWorkbenchHandsToGun,applyWorkbenchPose,
 interpolateWorkbenchPose,readWorkbenchPose,
 type WorkbenchPose,type WorkbenchTarget,type WorkbenchReport,type Vec3
} from './operator-pose-workbench.ts';

type Selection=WorkbenchTarget|'torso'|'weaponRotation';
const get=<T extends HTMLElement>(id:string):T=>{
 const item=document.getElementById(id);
 if(!item)throw Error('Missing workbench control '+id);
 return item as T;
};
const stage=get<HTMLElement>('stage');
const canvas=get<HTMLCanvasElement>('preview');
const status=get<HTMLOutputElement>('status');
const readout=get<HTMLOutputElement>('readout');
const weaponPicker=get<HTMLSelectElement>('wbWeapon');
const targetTitle=get<HTMLElement>('wbSelected');
const axisHint=get<HTMLElement>('wbAxisHint');
const xyzControls=get<HTMLElement>('xyzControls');
const follow=get<HTMLInputElement>('wbFollow');
const previewSlider=get<HTMLInputElement>('blend');
const previewValue=get<HTMLOutputElement>('blendValue');
const jsonField=get<HTMLTextAreaElement>('poseJson');
const libraryStats=get<HTMLOutputElement>('wbLibraryStats');
const presetStatus=get<HTMLOutputElement>('wbPresetStatus');
const bulkStatus=get<HTMLOutputElement>('wbBulkStatus');
const sourceControl=get<HTMLSelectElement>('wbTransferSource');
const sourceStatus=get<HTMLOutputElement>('wbSourceStatus');
const replaceGenerated=get<HTMLInputElement>('wbReplaceGenerated');
const libraryKey='fieldwork.operator-pose-library.v2';
let library:PoseLibrary=newPoseLibrary();
try{
 const previous=localStorage.getItem(libraryKey);
 if(previous)library=parsePoseLibrary(previous);
}catch{library=newPoseLibrary();}
let pinnedSource:WorkbenchPose|null=null;
function syncCatalog(){
 weaponPicker.replaceChildren();
 const groups=new Map<string,HTMLOptGroupElement>();
 for(const preset of PRESET_CATALOG){
  const groupName=preset.family.toUpperCase();
  let group=groups.get(groupName);
  if(!group){
   group=document.createElement('optgroup');
   group.label=groupName;
   groups.set(groupName,group);weaponPicker.append(group);
  }
  const option=document.createElement('option');
  option.value=preset.id;option.textContent=preset.name;
  group.append(option);
 }
}
function renderLibraryStatus(){
 const entries=Object.values(library.entries);
 const references=entries.filter(e=>e.quality==='reference').length;
 const tuned=entries.filter(e=>e.quality==='tuned').length;
 const generated=entries.filter(e=>e.quality==='generated').length;
 libraryStats.textContent=PRESET_CATALOG.length+
  ' weapons · '+references+' references · '+tuned+
  ' hand-tuned · '+generated+' transferred drafts';
 const entry=library.entries[edited?.preset??''];
 const statusName=entry?.quality==='reference'?'HUMAN REFERENCE':
   entry?.quality==='tuned'?'YOUR TUNED POSE':
   entry?.quality==='generated'?'TRANSFER DRAFT':'UNSAVED READY';
 presetStatus.textContent=(edited?.preset??'')+' · '+statusName;
 get<HTMLButtonElement>('wbLoadReference').disabled=
  !AUTHORED_SHORT_REFERENCES[edited?.preset??''];
 for(const option of Array.from(weaponPicker.options)){
  const row=library.entries[option.value];
  const preset=PRESET_CATALOG.find(x=>x.id===option.value);
  option.textContent=(row?.quality==='reference'?'★ ':
   row?.quality==='tuned'?'✓ ':row?'~ ':'· ')+
   (preset?.name??option.value);
 }
 if(edited)weaponPicker.value=edited.preset;
}
function storeEdited(tuned=false){
 if(!edited)return;
 const previous=library.entries[edited.preset];
 library.entries[edited.preset]={pose:cloneWorkbenchPose(edited),
  quality:tuned?'tuned':previous?.quality??'tuned',
  from:previous?.from};
 renderLibraryStatus();
}
function restorePreset(id:string){
 const entry=library.entries[id];
 rebaseFromReady(id,entry?.pose);
 follow.checked=!entry;
 renderLibraryStatus();
}
function sourcePose():WorkbenchPose|'references'{
 if(sourceControl.value==='references')return 'references';
 if(!pinnedSource)throw Error('Capture a source pose first');
 return pinnedSource;
}

const targetNames:Record<Selection,string>={
 stock:'STOCK / BUTTPLATE',
 supportShoulder:'LEFT SHOULDER',
 firingShoulder:'RIGHT SHOULDER',
 supportHand:'LEFT / SUPPORT HAND',
 firingHand:'RIGHT / FIRING HAND',
 supportElbow:'LEFT ELBOW GUIDE',
 firingElbow:'RIGHT ELBOW GUIDE',
 torso:'UPPER BODY ROTATION',
 weaponRotation:'GUN ROTATION'
};
const targetHints:Record<Selection,string>={
 stock:'Separate buttplate handle · drag backward and down to tuck',
 supportShoulder:'Move the anatomical shoulder joint',
 firingShoulder:'Move the anatomical shoulder joint',
 supportHand:'Target wrist · 10 + 10 length-constrained IK',
 firingHand:'Target wrist · 10 + 10 length-constrained IK',
 supportElbow:'Bend guide · solved elbow marker shows actual attainable position',
 firingElbow:'Bend guide · solved elbow marker shows actual attainable position',
 torso:'X side tilt · Y left/right twist · Z forward/back lean (degrees)',
 weaponRotation:'X barrel roll · Y sideways swing · Z muzzle up/down (degrees)'
};
const hintAxes=['X / FWD','Y / UP','Z / RIGHT'];
const colors:Record<WorkbenchTarget,number>={
 stock:0xf7c682,
 supportShoulder:0x75c5d0,firingShoulder:0xdf947b,
 supportHand:0x54babe,firingHand:0xdc8668,
 supportElbow:0xa7dcdd,firingElbow:0xffbd8c
};
const compact=window.innerWidth<640||
 window.matchMedia('(pointer:coarse)').matches;
const renderer=new THREE.WebGLRenderer({
 canvas,antialias:!compact,powerPreference:'low-power',alpha:false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,compact?1.35:2));
renderer.shadowMap.enabled=true;
renderer.setClearColor(0xc4c5bd);
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-36,36,36,-36,.1,700);
camera.position.set(72,54,72);
const orbit=new OrbitControls(camera,canvas);
orbit.target.set(0,27,0);
orbit.enableDamping=true;orbit.dampingFactor=.1;
orbit.minZoom=.45;orbit.maxZoom=4.0;
const hemi=new THREE.HemisphereLight(0xffffff,0x8a968b,2);
scene.add(hemi);
const key=new THREE.DirectionalLight(0xffffff,2.2);
key.position.set(-40,90,50);key.castShadow=true;
key.shadow.mapSize.set(compact?512:1024,compact?512:1024);
key.shadow.camera.left=-70;key.shadow.camera.right=70;
key.shadow.camera.top=80;key.shadow.camera.bottom=-80;
scene.add(key);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),
 new THREE.MeshStandardMaterial({color:0xadb1ab,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
scene.add(ground);
const grid=new THREE.GridHelper(200,20,0x8b9791,0xb4bbb5);
scene.add(grid);
const rig:OperatorRig=createOperatorRig('rook','blue');
scene.add(rig.root);
let activeConfiguration:WeaponConfiguration|undefined;
let baseline!:WorkbenchPose;
let edited!:WorkbenchPose;
let selection:Selection='stock';
let progress=1;
let animate=false;
let animationTime=0;
let lastTick=0;

const clamps:{position:[number,number];angle:[number,number]}={
 position:[-30,35],angle:[-90,90]
};
const targetMarkers=new Map<WorkbenchTarget,THREE.Mesh>();
const markers=[...WORKBENCH_TARGETS];
for(const name of markers){
 const material=new THREE.MeshBasicMaterial({color:colors[name],
  depthTest:false,transparent:true,opacity:.92});
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(1.18,12,10),material);
 mesh.renderOrder=250;mesh.userData.workbenchTarget=name;
 scene.add(mesh);targetMarkers.set(name,mesh);
}
const solvedMarkers=[
 new THREE.Mesh(new THREE.SphereGeometry(.72,10,8),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,
   opacity:.83,depthTest:false})),
 new THREE.Mesh(new THREE.SphereGeometry(.72,10,8),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,
   opacity:.83,depthTest:false}))
];
for(const marker of solvedMarkers){
 marker.renderOrder=251;scene.add(marker);
}
const armLines=[0x68b5c2,0xdc997b].map(color=>{
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(
   new Float32Array(12),3));
 const line=new THREE.LineSegments(geometry,
  new THREE.LineBasicMaterial({color,transparent:true,opacity:.8,
   depthTest:false}));
 line.renderOrder=240;scene.add(line);return line;
});
const v=(arr:readonly number[])=>new THREE.Vector3(arr[0],arr[1],arr[2]);
const toLocal=(point:THREE.Vector3)=>rig.chest.worldToLocal(point.clone());
const toWorld=(point:readonly number[])=>rig.chest.localToWorld(v(point));
const round=(value:number)=>Math.round(value*100)/100;
function notify(message:string){status.textContent=message;}
function rebaseFromReady(preset:string,retain?:WorkbenchPose){
 const spec=specForPreset(preset);
 activeConfiguration=spec.configuration;
 const input:OperatorPose={
  x:0,z:0,heading:0,travelYaw:0,seconds:1,stride:0,velocity:0,
  posture:'stand',injury:0,weapon:spec.weapon,
  weaponConfiguration:spec.configuration,reload:0,reloadDuration:1.8,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,handlingOverride:'ready',
  deterministic:true,poseV3Preview:false,poseV4ReloadPreview:false
 };
 poseOperator(rig,input,0);
 baseline=captureWorkbenchPose(rig,spec.weapon,preset,spec.configuration);
 edited=retain?cloneWorkbenchPose(retain):cloneWorkbenchPose(baseline);
 weaponPicker.value=preset;
 previewSlider.value='100';previewValue.textContent='100%';
 progress=1;animate=false;
 get<HTMLButtonElement>('wbAnimate').textContent='PLAY TRANSITION';
 refreshSelection();
 applyAndRenderTargets();
}
function getArray(pose:WorkbenchPose,key:Selection):Vec3{
 return key==='torso'?pose.torso:key==='weaponRotation'?
  pose.weaponRotation:pose.targets[key];
}
function endPreview(){
 animate=false;progress=1;previewSlider.value='100';
 previewValue.textContent='100%';
 get<HTMLButtonElement>('wbAnimate').textContent='PLAY TRANSITION';
}
function updateValue(key:Selection,index:number,numberValue:number){
 if(!Number.isFinite(numberValue))return;
 const arr=getArray(edited,key);
 const [min,max]=key==='torso'||key==='weaponRotation'?
  clamps.angle:clamps.position;
 arr[index]=round(Math.max(min,Math.min(max,numberValue)));
 if((key==='stock'||key==='weaponRotation')&&follow.checked)
  snapWorkbenchHandsToGun(edited,activeConfiguration);
 if(key==='supportHand'||key==='firingHand')follow.checked=false;
 endPreview();syncAxisValues();applyAndRenderTargets();
}
function syncAxisValues(){
 const array=getArray(edited,selection);
 for(let i=0;i<3;i++){
  const group=xyzControls.children[i];
  if(!group)continue;
  const fields=group.querySelectorAll<HTMLInputElement>('input');
  if(fields.length===2){
   fields[0].value=String(array[i]);
   fields[1].value=String(round(array[i]));
  }
 }
}
function refreshSelection(){
 targetTitle.textContent=targetNames[selection];
 axisHint.textContent=targetHints[selection];
 document.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(b=>{
  b.setAttribute('aria-pressed',String(b.dataset.target===selection));
 });
 const isAngle=selection==='torso'||selection==='weaponRotation';
 const captions=isAngle?(selection==='torso'?
  ['X / SIDE TILT','Y / TWIST','Z / LEAN']:
  ['X / BARREL ROLL','Y / SWIVEL','Z / MUZZLE']):hintAxes;
 const data=getArray(edited,selection);
 xyzControls.replaceChildren();
 for(let i=0;i<3;i++){
  const container=document.createElement('div');
  container.className='xyz';
  const label=document.createElement('label');
  const id='wbAxis'+i;label.htmlFor=id;label.textContent=captions[i];
  const slider=document.createElement('input');
  slider.type='range';slider.id=id;slider.step=isAngle?'1':'.1';
  slider.min=isAngle?'-90':'-30';slider.max=isAngle?'90':'35';
  slider.value=String(data[i]);
  slider.setAttribute('aria-label',targetNames[selection]+' '+captions[i]);
  const numeric=document.createElement('input');
  numeric.type='number';numeric.step=slider.step;numeric.min=slider.min;
  numeric.max=slider.max;numeric.value=String(round(data[i]));
  numeric.setAttribute('aria-label',captions[i]+' numeric value');
  slider.addEventListener('input',()=>{
   updateValue(selection,i,Number(slider.value));
  });
  numeric.addEventListener('change',()=>{
   updateValue(selection,i,Number(numeric.value));
  });
  container.append(label,slider,numeric);
  xyzControls.append(container);
 }
}
function setSelection(key:Selection){
 selection=key;refreshSelection();applyAndRenderTargets();
}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-target]')){
 button.addEventListener('click',()=>setSelection(button.dataset.target as Selection));
}
const setReport=(report:WorkbenchReport)=>{
 const fmt=(value:number)=>value.toFixed(2);
 const warning=report.maxReachError>.3||report.maxContactGap>2;
 readout.dataset.warning=String(warning);
 readout.textContent='LEFT ARM  reach Δ '+fmt(report.support.wristGap)+
   ' · elbow guide Δ '+fmt(report.support.elbowGuideGap)+
   ' · hand-to-gun Δ '+fmt(report.support.gripGap)+
   '\nRIGHT ARM reach Δ '+fmt(report.firing.wristGap)+
   ' · elbow guide Δ '+fmt(report.firing.elbowGuideGap)+
   ' · hand-to-gun Δ '+fmt(report.firing.gripGap)+
   (warning?'\nCHECK: Move the weapon or hand targets; IK will not stretch limbs.':
    '\nJOINT LENGTHS LOCKED · No automatic armor/elbow solver.');
};
function applyAndRenderTargets(){
 const shown=progress>=.999?edited:
  interpolateWorkbenchPose(baseline,edited,progress);
 const report=applyWorkbenchPose(rig,shown,activeConfiguration);
 rig.root.updateMatrixWorld(true);
 for(const name of markers){
  const mesh=targetMarkers.get(name)!;
  mesh.position.copy(toWorld(shown.targets[name]));
  mesh.scale.setScalar(name===selection?1.35:1);
 }
 for(let index=0;index<2;index++){
  const data=index===0?report.support:report.firing;
  solvedMarkers[index].position.copy(toWorld(data.elbow));
  const shoulder=toWorld(data.shoulder),elbow=toWorld(data.elbow),
    hand=toWorld(data.hand);
  const attr=armLines[index].geometry.getAttribute('position') as
    THREE.BufferAttribute;
  const a=attr.array as Float32Array;
  a.set([...shoulder.toArray(),...elbow.toArray(),
    ...elbow.toArray(),...hand.toArray()]);
  attr.needsUpdate=true;
 }
 setReport(report);
}
const raycaster=new THREE.Raycaster();
const cursor=new THREE.Vector2();
const dragPlane=new THREE.Plane();
const camNormal=new THREE.Vector3();
let dragging:WorkbenchTarget|null=null;
function rayFromPointer(event:PointerEvent){
 const bounds=canvas.getBoundingClientRect();
 cursor.set((event.clientX-bounds.left)/bounds.width*2-1,
   -((event.clientY-bounds.top)/bounds.height*2-1));
 raycaster.setFromCamera(cursor,camera);
}
canvas.addEventListener('pointerdown',event=>{
 if(event.button!==0&&event.pointerType!=='touch')return;
 rayFromPointer(event);
 const hit=raycaster.intersectObjects([...targetMarkers.values()])[0];
 if(!hit)return;
 dragging=hit.object.userData.workbenchTarget as WorkbenchTarget;
 setSelection(dragging);
 camera.getWorldDirection(camNormal).negate();
 dragPlane.setFromNormalAndCoplanarPoint(camNormal,hit.object.position);
 orbit.enabled=false;
 canvas.setPointerCapture(event.pointerId);
 event.preventDefault();event.stopPropagation();
},true);
canvas.addEventListener('pointermove',event=>{
 if(!dragging)return;
 rayFromPointer(event);
 const hit=new THREE.Vector3();
 if(raycaster.ray.intersectPlane(dragPlane,hit)){
  const local=toLocal(hit);
  const values=edited.targets[dragging];
  values[0]=round(Math.max(-30,Math.min(35,local.x)));
  values[1]=round(Math.max(-30,Math.min(35,local.y)));
  values[2]=round(Math.max(-30,Math.min(35,local.z)));
  if(dragging==='stock'&&follow.checked)
   snapWorkbenchHandsToGun(edited,activeConfiguration);
  if(dragging==='firingHand'||dragging==='supportHand')
   follow.checked=false;
  endPreview();syncAxisValues();applyAndRenderTargets();
 }
 event.preventDefault();
},true);
function finishDrag(){dragging=null;orbit.enabled=true;}
canvas.addEventListener('pointerup',finishDrag,true);
canvas.addEventListener('pointercancel',finishDrag,true);
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')){
 button.addEventListener('click',()=>{
  const name=button.dataset.view;
  const distance=105;
  if(name==='front')camera.position.set(0,38,-distance);
  else if(name==='side')camera.position.set(distance,38,0);
  else camera.position.set(70,50,78);
  orbit.target.set(0,25,0);orbit.update();
 });
}
weaponPicker.addEventListener('change',()=>{
 rebaseFromReady(weaponPicker.value);
 notify('Fresh ready pose loaded. Running and gameplay were not changed.');
});
get<HTMLButtonElement>('wbReset').addEventListener('click',()=>{
 rebaseFromReady(weaponPicker.value);
 notify('Reset to the actual ready pose. Move STOCK to start the tuck.');
});
get<HTMLButtonElement>('wbSnap').addEventListener('click',()=>{
 snapWorkbenchHandsToGun(edited,activeConfiguration);
 follow.checked=true;endPreview();applyAndRenderTargets();
 if(selection==='firingHand'||selection==='supportHand')refreshSelection();
 notify('Hand targets snapped to the actual rigid weapon grip sockets.');
});
previewSlider.addEventListener('input',()=>{
 animate=false;progress=Number(previewSlider.value)/100;
 previewValue.textContent=previewSlider.value+'%';
 get<HTMLButtonElement>('wbAnimate').textContent='PLAY TRANSITION';
 applyAndRenderTargets();
});
get<HTMLButtonElement>('wbAnimate').addEventListener('click',()=>{
 animate=!animate;
 if(animate)animationTime=0;
 get<HTMLButtonElement>('wbAnimate').textContent=animate?
  'PAUSE TRANSITION':'PLAY TRANSITION';
});
get<HTMLButtonElement>('wbEnd').addEventListener('click',()=>{
 endPreview();applyAndRenderTargets();
});
const serialized=()=>JSON.stringify(edited,null,2);
get<HTMLButtonElement>('wbExport').addEventListener('click',()=>{
 jsonField.value=serialized();notify('Final authored pose JSON shown below.');
});
get<HTMLButtonElement>('wbCopy').addEventListener('click',async()=>{
 jsonField.value=serialized();
 try{
  await navigator.clipboard.writeText(jsonField.value);
  notify('Pose JSON copied. Paste it into ChatGPT for animation integration.');
 }catch{
  jsonField.focus();jsonField.select();
  notify('Select and copy the highlighted JSON from the text field.');
 }
});
const saveKey='fieldwork.operator-pose-workbench.v1';
get<HTMLButtonElement>('wbSave').addEventListener('click',()=>{
 try{localStorage.setItem(saveKey,serialized());
  notify('Saved locally in this browser.');
 }catch{notify('Local storage unavailable. Use COPY POSE JSON instead.');}
});
get<HTMLButtonElement>('wbLoad').addEventListener('click',()=>{
 try{
  const saved=localStorage.getItem(saveKey);
  if(!saved)throw Error('No saved pose found');
  importPose(saved);
 }catch(error){notify(error instanceof Error?error.message:String(error));}
});
function importPose(source:string){
 const pose=readWorkbenchPose(source);
 if(!['ar-m4a1','ak-akm','hk-mp5a3','shotgun'].includes(pose.preset))
  throw Error('Unsupported weapon preset: '+pose.preset);
 if(presetOptions(pose.preset).weapon!==pose.weapon)
  throw Error('Weapon family and preset do not match');
 rebaseFromReady(pose.preset,pose);
 follow.checked=false;
 notify('Imported valid authored targets; no automatic IK correction applied.');
}
get<HTMLButtonElement>('wbImport').addEventListener('click',()=>{
 try{importPose(jsonField.value);}
 catch(error){notify(error instanceof Error?error.message:String(error));}
});
get<HTMLButtonElement>('wbDownload').addEventListener('click',()=>{
 const blob=new Blob([serialized()],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;link.download='fieldwork-short-stock-pose.json';
 document.body.append(link);link.click();link.remove();
 URL.revokeObjectURL(url);
 notify('Pose recipe exported.');
});
function resize(){
 const width=Math.max(1,stage.clientWidth),
   height=Math.max(1,stage.clientHeight);
 renderer.setSize(width,height,false);
 const aspect=width/height;
 camera.left=-36*aspect;camera.right=36*aspect;
 camera.top=36;camera.bottom=-36;
 camera.zoom=compact?.93:1.1;
 camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
const ro=new ResizeObserver(resize);ro.observe(stage);
function tick(now:number){
 const dt=Math.min(.05,Math.max(0,(now-lastTick)/1000));
 lastTick=now;
 if(animate){
  animationTime+=dt;
  progress=(1-Math.cos(animationTime*1.75))/2;
  previewSlider.value=String(Math.round(progress*100));
  previewValue.textContent=previewSlider.value+'%';
  applyAndRenderTargets();
 }
 orbit.update();
 renderer.render(scene,camera);
 canvas.dataset.ready='true';
 canvas.dataset.drawCalls=String(renderer.info.render.calls);
 canvas.dataset.workbenchWeapon=edited.weapon;
 canvas.dataset.workbenchTarget=selection;
 canvas.dataset.poseBlend=progress.toFixed(3);
 requestAnimationFrame(tick);
}
try{
 rebaseFromReady('ar-m4a1');
 setSelection('stock');
 resize();
 notify('Sculpt a static pose: select a handle, move XYZ, then copy the JSON.');
 requestAnimationFrame(tick);
}catch(error){
 notify('POSE WORKBENCH FAILED: '+(error instanceof Error?error.message:String(error)));
 readout.textContent='Unable to initialize operator model.';
}
