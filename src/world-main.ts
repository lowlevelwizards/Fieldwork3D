import * as THREE from 'three';
import {
  PLAYABLE_REGIONS,playableRegion,globalSouthM,
  regionLocalHeightM,regionSlopeDegrees,type PlayableRegionId,
} from './playable-region-model';
import { RegionalTerrainField } from './regional-terrain';
import { CutwoodsPhysicalScene,ActorFigure } from './regional-visuals';
import { newOperation,stepOperation,orderPlayer,playerFire,issueSquadOrder,
  type OperationState } from './regional-command';
import {stepActor} from './regional-actors';
import {physicalGroundAt} from './regional-physical.ts';
import {FloatingTouchControls,screenDirection} from './operator-touch.ts';
import {FootstepAudio} from './operator-audio.ts';

const canvas=document.querySelector<HTMLCanvasElement>('#worldCanvas');
const nameLabel=document.querySelector<HTMLElement>('#worldRegionName');
const regionStatus=document.querySelector<HTMLElement>('#regionStatus');
const coords=document.querySelector<HTMLElement>('#coords');
const scaleDisplay=document.querySelector<HTMLElement>('#scaleDisplay');
const detailStatus=document.querySelector<HTMLElement>('#detailStatus');
const menu=document.querySelector<HTMLElement>('#regionMenu');
const menuButton=document.querySelector<HTMLButtonElement>('#regionMenuButton');
const choices=document.querySelector<HTMLElement>('#regionChoices');
const closeMenu=document.querySelector<HTMLButtonElement>('#closeRegions');
const resetButton=document.querySelector<HTMLButtonElement>('#resetView');
const worldMode=document.querySelector<HTMLButtonElement>('#worldMode');
const exploreControls=document.querySelector<HTMLElement>('#exploreControls');
const moveStick=document.querySelector<HTMLElement>('#moveStick');
const moveNub=document.querySelector<HTMLElement>('#moveNub');
const fireButton=document.querySelector<HTMLButtonElement>('#fireButton');
const squadOrder=document.querySelector<HTMLButtonElement>('#squadOrder');
const holdOrder=document.querySelector<HTMLButtonElement>('#holdOrder');
const restartOperation=document.querySelector<HTMLButtonElement>('#restartOperation');
const actorReadout=document.querySelector<HTMLElement>('#actorReadout');
const operationReadout=document.querySelector<HTMLElement>('#operationReadout');
const worldHelp=document.querySelector<HTMLElement>('#worldHelp');
const inspectToggle=document.querySelector<HTMLButtonElement>('#inspectToggle');
const soundToggle=document.querySelector<HTMLButtonElement>('#soundToggle');
const soloStatus=document.querySelector<HTMLElement>('#soloStatus');
if(!canvas||!nameLabel||!regionStatus||!coords||!scaleDisplay||!detailStatus||
   !menu||!menuButton||!choices||!closeMenu||!resetButton||
   !worldMode||!exploreControls||!moveStick||!moveNub||!fireButton||
   !squadOrder||!holdOrder||!restartOperation||!actorReadout||!operationReadout||!worldHelp||!inspectToggle||!soundToggle||!soloStatus)
  throw new Error('World controls not mounted');
const view:HTMLCanvasElement=canvas;
const ui={nameLabel,regionStatus,coords,scaleDisplay,detailStatus,menu,
  menuButton,choices,closeMenu,resetButton,worldMode,exploreControls,
  moveStick,moveNub,fireButton,squadOrder,holdOrder,restartOperation,actorReadout,
  operationReadout,worldHelp,inspectToggle,soundToggle,soloStatus};
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xa8c5c4);
scene.fog=new THREE.FogExp2(0xb6c7b6,.000065);
const renderer=new THREE.WebGLRenderer({
  canvas:view,antialias:true,powerPreference:'low-power',
});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.10;
scene.add(new THREE.HemisphereLight(0xe0ebdc,0x737d69,2.0));
const sunlight=new THREE.DirectionalLight(0xffe4af,2.3);
sunlight.position.set(-400,800,220);
scene.add(sunlight);
const camera=new THREE.OrthographicCamera(-600,600,600,-600,.1,12000);
let loadedId:PlayableRegionId='cutwoods';
let terrain:RegionalTerrainField|null=null;
let props:CutwoodsPhysicalScene|null=null;
const figures=new Map<string,ActorFigure>();
const soloMode=!new URLSearchParams(location.search).has('tactical');
document.body.classList.toggle('solo',soloMode);
const audio=new FootstepAudio();
let operation:OperationState=newOperation();
let explore=false;
let squadRally=false;
let lastHud=0;
let cameraDt=1/60;
let selectedInfo=false;
let touch:FloatingTouchControls|null=null;
const keys=new Set<string>();
const movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD',
  'ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
let target=new THREE.Vector3(0,280,0);
const lookOffset=new THREE.Vector3();
let yaw=.75;
let elevation=THREE.MathUtils.degToRad(57);
let zoom=1;
let spanX=1200;
let dirty=true;
let lastMeasured={x:0,z:0};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const probe=new THREE.Mesh(
  new THREE.TorusGeometry(5,.95,5,28),
  new THREE.MeshBasicMaterial({color:0xf0d09c,depthTest:false}),
);
probe.rotation.x=-Math.PI/2;
probe.renderOrder=20;
probe.visible=false;
scene.add(probe);
function resize():void{
  const aspect=Math.max(.3,innerWidth/Math.max(1,innerHeight));
  spanX=1200/zoom;
  camera.left=-spanX/2;
  camera.right=spanX/2;
  camera.top=spanX/(2*aspect);
  camera.bottom=-camera.top;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight,false);
  dirty=true;
}
function updateCamera():void{
  if(explore){
    const player=operation.actors.find(a=>a.id===operation.playerId)!;
    const follow=1-Math.exp(-cameraDt*8.5);
    target.x+=(player.x+lookOffset.x-target.x)*follow;
    target.z+=(player.z+lookOffset.z-target.z)*follow;
    lookOffset.multiplyScalar(Math.exp(-cameraDt*.32));
  }
  target.x=THREE.MathUtils.clamp(target.x,-480,480);
  target.z=THREE.MathUtils.clamp(target.z,-480,480);
  const desiredHeight=explore?physicalGroundAt(target.x,target.z):
    regionLocalHeightM(loadedId,target.x,target.z);
  target.y+=(desiredHeight-target.y)*(1-Math.exp(-cameraDt*9));
  const radius=explore?(1100/zoom+22):(1950/zoom+310);
  camera.position.set(
    target.x+Math.sin(yaw)*Math.cos(elevation)*radius,
    target.y+Math.sin(elevation)*radius,
    target.z+Math.cos(yaw)*Math.cos(elevation)*radius,
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();
  terrain?.setDetailFocus(target.x,target.z,zoom>=4.2);
  props?.updateVegetation(target.x,target.z);
  ui.detailStatus.textContent=zoom>=4.2?
    'LOCAL DETAIL / 2 M SAMPLES':'REGIONAL DETAIL / 8 M SAMPLES';
  updateLabels();
  dirty=true;
}
function updateLabels():void{
  const global=globalSouthM(loadedId,target.z);
  const h=regionLocalHeightM(loadedId,target.x,target.z);
  const x=lastMeasured.x,z=lastMeasured.z;
  const inspected=probe.visible;
  const measureH=regionLocalHeightM(loadedId,x,z);
  ui.coords.textContent=(inspected?'PROBE':'CENTER')+': '+
    (inspected?x:target.x).toFixed(0)+' m E · '+
    (inspected?globalSouthM(loadedId,z):global).toFixed(0)+' m S · '+
    (inspected?measureH:h).toFixed(1)+' m ASL'+
    (inspected?' · '+regionSlopeDegrees(loadedId,x,z).toFixed(0)+'° SLOPE':'');
  const width=1200/zoom;
  const candidate=width*100/Math.max(1,innerWidth);
  const values=[5,10,20,25,50,100,200,250,500,1000];
  const amount=values.reduce((previous,current)=>
    Math.abs(current-candidate)<Math.abs(previous-candidate)?
      current:previous);
  const pixels=amount/width*innerWidth;
  const bar=ui.scaleDisplay.querySelector<HTMLElement>('.scale-line');
  if(bar)bar.style.width=pixels.toFixed(0)+'px';
  const label=ui.scaleDisplay.querySelector('span:last-child');
  if(label)label.textContent=amount+' m';
}
function pickAt(clientX:number,clientY:number):THREE.Vector3|null{
  const rect=view.getBoundingClientRect();
  pointer.set((clientX-rect.left)/rect.width*2-1,
    1-(clientY-rect.top)/rect.height*2);
  raycaster.setFromCamera(pointer,camera);
  const hits=terrain?raycaster.intersectObjects(terrain.group.children,false):[];
  return hits.length?hits[0].point:null;
}
function setMenu(open:boolean):void{
  ui.menu.hidden=!open;
  ui.menuButton.setAttribute('aria-expanded',String(open));
}
ui.choices.innerHTML=PLAYABLE_REGIONS.map((r,i)=>
  '<button class="region-choice'+(r.implemented?' selected':'')+
  '" data-region="'+r.id+'" type="button"'+
  (r.implemented?'':' disabled aria-disabled="true"')+'>'+
  '<span><strong>'+String(i+1).padStart(2,'0')+' / '+
  r.name.toUpperCase()+'</strong><small>'+r.character+'</small></span>'+
  '<small>'+(r.implemented?'EXPLORE 1 KM²':'PLANNED')+'</small></button>').join('');
ui.menuButton.addEventListener('click',()=>setMenu(ui.menu.hidden));
ui.closeMenu.addEventListener('click',()=>setMenu(false));
ui.menu.addEventListener('click',e=>{
  if(e.target===ui.menu)setMenu(false);
  const target=e.target as HTMLElement;
  const button=target.closest<HTMLButtonElement>('button[data-region]');
  if(!button||button.disabled)return;
  const id=button.dataset.region as PlayableRegionId;
  load(id);setMenu(false);
});
function load(id:PlayableRegionId):void{
  const region=playableRegion(id);
  if(!region.implemented)throw new Error('Unimplemented regional terrain');
  touch?.reset();
  if(terrain){terrain.dispose(scene);terrain=null;}
  if(props){props.dispose(scene);props=null;}
  for(const figure of figures.values())figure.dispose(scene);
  figures.clear();
  loadedId=id;
  terrain=new RegionalTerrainField(scene,id);
  props=new CutwoodsPhysicalScene(scene);
  operation=newOperation();
  for(const a of operation.actors){
    if(soloMode&&a.id!==operation.playerId)continue;
    const figure=new ActorFigure(scene,a);
    figure.onFootfall=(_x,_z,wet,road)=>audio.step(wet,road);
    figures.set(a.id,figure);
  }
  props.updateVegetation(0,0,true);
  ui.nameLabel.textContent=region.name.toUpperCase();
  ui.regionStatus.textContent='REGION '+
    String(region.index+1).padStart(2,'0')+' / 06 · 1 KM²';
  explore=false;
  setExplore(soloMode);
}
function resetView():void{
  const a=operation.actors.find(actor=>actor.id===operation.playerId)!;
  const x=explore?a.x:0,z=explore?a.z:0;
  lookOffset.set(0,0,0);
  target.set(x,explore?physicalGroundAt(x,z):regionLocalHeightM(loadedId,x,z),z);
  yaw=.75;
  elevation=THREE.MathUtils.degToRad(explore?65:57);
  zoom=explore?78:1;
  probe.visible=false;
  resize();updateCamera();
}
function setExplore(active:boolean):void{
  explore=active;squadRally=false;
  touch?.reset();if(touch)touch.enabled=active;
  document.body.classList.toggle('exploring',active);
  ui.exploreControls.hidden=!active||soloMode;
  ui.actorReadout.hidden=!active;
  ui.operationReadout.hidden=!active||soloMode;
  ui.worldMode.textContent=active?'SURVEY':'EXPLORE';
  ui.worldMode.setAttribute('aria-pressed',String(active));
  ui.squadOrder.setAttribute('aria-pressed','false');
  ui.worldHelp.textContent=active?
    'Lower left: move · Lower right: orbit · Two fingers: pan / pinch / twist · Tap: waypoint':
    'Survey: orbit, pan, pinch and inspect · EXPLORE controls the operator.';
  ui.soloStatus.hidden=!active||!soloMode;
  resetView();renderStatus();
}
ui.worldMode.addEventListener('click',()=>setExplore(!explore));
function renderStatus():void{
  const a=operation.actors.find(actor=>actor.id===operation.playerId)!;
  const speed=Math.hypot(a.vx,a.vz);
  ui.actorReadout.textContent='ROOK · '+a.health+'/'+a.maxHealth+
    ' INTEGRITY · '+speed.toFixed(1)+' M/S · '+
    (a.grounded?'GROUNDED':'AIRBORNE');
  ui.soloStatus.textContent='ROOK  /  '+(speed>.15?'MOVING':'STANDING BY');
  const recent=operation.log.at(-1)??'';
  ui.operationReadout.textContent=operation.result==='active'?
    'NORTHLINE / SECURE CROSSING · '+recent.toUpperCase():
    operation.result==='won'?'OPERATION COMPLETE · CROSSING SECURED':
      'OPERATOR DOWN · RESET WORLD TO RETRY';
}
// The original 0.0.2 floating thumbsticks live on the canvas.
const cameraActions={
  orbit:(dx:number,dy:number)=>{
    yaw-=dx*.0065;
    elevation=THREE.MathUtils.clamp(elevation+dy*.004,
      THREE.MathUtils.degToRad(32),THREE.MathUtils.degToRad(82));
    updateCamera();
  },
  pan:(dx:number,dy:number)=>{
    // Survey pan is spatial; the explore camera re-centers smoothly on Rook.
    const step=spanX/Math.max(1,innerWidth);
    const mx=(-Math.cos(yaw)*dx+Math.sin(yaw)*dy)*step;
    const mz=(Math.sin(yaw)*dx+Math.cos(yaw)*dy)*step;
    if(explore){
      lookOffset.x=THREE.MathUtils.clamp(lookOffset.x+mx,-32,32);
      lookOffset.z=THREE.MathUtils.clamp(lookOffset.z+mz,-32,32);
    }else{target.x+=mx;target.z+=mz;}
    updateCamera();
  },
  zoom:(factor:number)=>{
    zoom=THREE.MathUtils.clamp(zoom*factor,1,explore?95:14);
    resize();updateCamera();
  },
};
function handleGroundTap(x:number,y:number){
  const point=pickAt(x,y);if(!point)return;
  if(explore){
    if(!soloMode&&squadRally){
      issueSquadOrder(operation,'n1',{x:point.x,z:point.z});
      squadRally=false;ui.squadOrder.textContent='SQUAD RALLY';
      ui.squadOrder.setAttribute('aria-pressed','false');
    }else orderPlayer(operation,{x:point.x,z:point.z});
  }else{
    lastMeasured={x:point.x,z:point.z};
    probe.position.set(point.x,point.y+1.1,point.z);
    probe.visible=true;
    updateLabels();
  }
  renderStatus();dirty=true;
}
touch=new FloatingTouchControls(view,cameraActions,handleGroundTap);
touch.enabled=explore;
function resetInput(){
  keys.clear();touch?.reset();
}
window.addEventListener('blur',resetInput);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)resetInput();
});
window.addEventListener('keydown',e=>{
  if(movementKeys.has(e.code)){keys.add(e.code);e.preventDefault();}
  if(e.code==='KeyF'&&!e.repeat){resetView();e.preventDefault();}
  if(e.code==='KeyQ'&&!e.repeat)cameraActions.orbit(-65,0);
  if(e.code==='KeyE'&&!e.repeat)cameraActions.orbit(65,0);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
ui.inspectToggle.addEventListener('click',()=>{
  selectedInfo=!selectedInfo;
  document.body.classList.toggle('show-info',selectedInfo);
  ui.inspectToggle.setAttribute('aria-pressed',String(selectedInfo));
});
ui.soundToggle.addEventListener('click',()=>{
  audio.toggle();
  ui.soundToggle.textContent=audio.muted?'SOUND OFF':'SOUND ON';
});
ui.fireButton.addEventListener('click',()=>{
  if(explore){playerFire(operation);renderStatus();dirty=true;}
});
ui.squadOrder.addEventListener('click',()=>{
  squadRally=!squadRally;
  ui.squadOrder.setAttribute('aria-pressed',String(squadRally));
  ui.squadOrder.textContent=squadRally?'TAP RALLY POINT':'SQUAD RALLY';
});
ui.restartOperation.addEventListener('click',()=>{
  for(const figure of figures.values())figure.dispose(scene);
  figures.clear();
  operation=newOperation();
  for(const actor of operation.actors){
    if(soloMode&&actor.id!==operation.playerId)continue;
    const figure=new ActorFigure(scene,actor);
    figure.onFootfall=(_x,_z,wet,road)=>audio.step(wet,road);
    figures.set(actor.id,figure);
  }
  setExplore(true);
});
ui.holdOrder.addEventListener('click',()=>{
  const player=operation.actors.find(a=>a.id===operation.playerId)!;
  player.destination=null;player.path=[];
  renderStatus();
});
ui.resetButton.addEventListener('click',resetView);
window.addEventListener('resize',()=>{resize();updateCamera();});
view.addEventListener('wheel',e=>{
  e.preventDefault();cameraActions.zoom(Math.exp(-e.deltaY*.001));
},{passive:false});
// No global war simulation. Only the loaded Cutwoods four-actor local
// encounter advances, and only while the player is exploring it.
let previous=performance.now(),accumulator=0;
function draw(now:number):void{
  const elapsed=Math.max(0,Math.min(.10,(now-previous)/1000));previous=now;
  cameraDt=Math.max(.001,elapsed);
  touch?.update(elapsed);
  if(explore){
    accumulator+=elapsed;
    const axis=touch?.driving?touch.move:{
      x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-
        Number(keys.has('KeyA')||keys.has('ArrowLeft')),
      y:Number(keys.has('KeyW')||keys.has('ArrowUp'))-
        Number(keys.has('KeyS')||keys.has('ArrowDown')),
    };
    const input=screenDirection(axis??{x:0,y:0},yaw);
    const driving=Math.hypot(axis.x,axis.y)>.03;
    while(accumulator>=1/60){
      if(soloMode){
        const player=operation.actors.find(a=>a.id===operation.playerId)!;
        if(driving){player.destination=null;player.path=[];}
        stepActor(player,1/60,driving?input:null);
      }else stepOperation(operation,1/60,driving?input:null);
      accumulator-=1/60;
    }
    for(const figure of figures.values())figure.update(now/1000);
    updateCamera();
    if(now-lastHud>250){renderStatus();lastHud=now;}
  }else accumulator=0;
  if(dirty){renderer.render(scene,camera);dirty=false;}
  requestAnimationFrame(draw);
}
load('cutwoods');
requestAnimationFrame(draw);
