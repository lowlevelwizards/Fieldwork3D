import * as THREE from 'three';
import {
  PLAYABLE_REGIONS,playableRegion,globalSouthM,regionRiverX,
  regionLocalHeightM,regionSlopeDegrees,type PlayableRegionId,
} from './playable-region-model';
import { RegionalTerrainField } from './regional-terrain';

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
if(!canvas||!nameLabel||!regionStatus||!coords||!scaleDisplay||!detailStatus||
   !menu||!menuButton||!choices||!closeMenu||!resetButton)
  throw new Error('World controls not mounted');
const view:HTMLCanvasElement=canvas;
const ui={nameLabel,regionStatus,coords,scaleDisplay,detailStatus,menu,
  menuButton,choices,closeMenu,resetButton};
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
let target=new THREE.Vector3(0,280,0);
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
  target.x=THREE.MathUtils.clamp(target.x,-480,480);
  target.z=THREE.MathUtils.clamp(target.z,-480,480);
  target.y=regionLocalHeightM(loadedId,target.x,target.z);
  const radius=1950/zoom+310;
  camera.position.set(
    target.x+Math.sin(yaw)*Math.cos(elevation)*radius,
    target.y+Math.sin(elevation)*radius,
    target.z+Math.cos(yaw)*Math.cos(elevation)*radius,
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();
  terrain?.setDetailFocus(target.x,target.z,zoom>=4.2);
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
  if(terrain){terrain.dispose(scene);terrain=null;}
  loadedId=id;
  terrain=new RegionalTerrainField(scene,id);
  ui.nameLabel.textContent=region.name.toUpperCase();
  ui.regionStatus.textContent='REGION '+
    String(region.index+1).padStart(2,'0')+' / 06 · 1 KM²';
  resetView();
}
function resetView():void{
  target.set(0,0,0);yaw=.75;
  elevation=THREE.MathUtils.degToRad(57);zoom=1;
  probe.visible=false;
  resize();updateCamera();
}
ui.resetButton.addEventListener('click',resetView);
window.addEventListener('resize',()=>{resize();updateCamera();});
const activePointers=new Map<number,{x:number;y:number}>();
let moved=false;
let pinchPrevious=0,centerPrevious:{x:number;y:number}|null=null;
function currentGesture(){
  const points=[...activePointers.values()];
  if(points.length<2)return null;
  const a=points[0],b=points[1];
  return {center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},
    distance:Math.hypot(a.x-b.x,a.y-b.y)};
}
view.addEventListener('pointerdown',e=>{
  view.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  moved=false;
  const g=currentGesture();
  if(g){pinchPrevious=g.distance;centerPrevious=g.center;}
});
view.addEventListener('pointermove',e=>{
  const old=activePointers.get(e.pointerId);
  if(!old)return;
  const dx=e.clientX-old.x,dy=e.clientY-old.y;
  if(Math.hypot(dx,dy)>1.5)moved=true;
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const gesture=currentGesture();
  if(gesture){
    if(pinchPrevious>1){
      zoom=THREE.MathUtils.clamp(
        zoom*(gesture.distance/Math.max(1,pinchPrevious)),1,14);
      resize();
    }
    if(centerPrevious){
      const mx=gesture.center.x-centerPrevious.x,
        my=gesture.center.y-centerPrevious.y;
      const step=spanX/Math.max(1,innerWidth);
      // Approximate ground-plane screen axes; preserves pan under yaw.
      target.x+=(-Math.cos(yaw)*mx+Math.sin(yaw)*my)*step;
      target.z+=(Math.sin(yaw)*mx+Math.cos(yaw)*my)*step;
    }
    pinchPrevious=gesture.distance;centerPrevious=gesture.center;
  }else if(activePointers.size===1){
    yaw-=dx*.0065;
    elevation=THREE.MathUtils.clamp(elevation+dy*.004,
      THREE.MathUtils.degToRad(32),THREE.MathUtils.degToRad(82));
  }
  updateCamera();
});
function releasePointer(e:PointerEvent):void{
  if(!activePointers.has(e.pointerId))return;
  if(!moved&&activePointers.size===1){
    const point=pickAt(e.clientX,e.clientY);
    if(point){
      lastMeasured={x:point.x,z:point.z};
      probe.position.set(point.x,point.y+1.1,point.z);
      probe.visible=true;
      updateLabels();dirty=true;
    }
  }
  activePointers.delete(e.pointerId);
  if(activePointers.size<2){
    pinchPrevious=0;centerPrevious=null;
  }
}
view.addEventListener('pointerup',releasePointer);
view.addEventListener('pointercancel',e=>{
  activePointers.delete(e.pointerId);
  pinchPrevious=0;centerPrevious=null;
});
view.addEventListener('wheel',e=>{
  e.preventDefault();
  zoom=THREE.MathUtils.clamp(zoom*Math.exp(-e.deltaY*.001),1,14);
  resize();updateCamera();
},{passive:false});
// Render only while interaction changes terrain or camera; no speculative
// weather physics, NPCs, vegetation instancing or persistent simulation.
function draw():void{
  if(dirty){renderer.render(scene,camera);dirty=false;}
  requestAnimationFrame(draw);
}
load('cutwoods');
requestAnimationFrame(draw);
