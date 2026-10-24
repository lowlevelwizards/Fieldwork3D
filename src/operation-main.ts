import * as THREE from 'three';
import { makeTerrainGeometry,updateTerrainMoisture } from './terrain';
import { terrainHeight } from './terrain-model';
import { VegetationField } from './vegetation-field';
import { TerrainWater } from './hydrology';
import { newOperation,orderMove,setPosture,stepOperation,STRUCTURES,
  type Operation, type Actor } from './operation-model';

const canvas=document.querySelector<HTMLCanvasElement>('#operationCanvas');
const status=document.querySelector<HTMLElement>('#status');
const phase=document.querySelector<HTMLElement>('#phase');
const squad=document.querySelector<HTMLElement>('#squad');
const log=document.querySelector<HTMLElement>('#event');
const brief=document.querySelector<HTMLElement>('#brief');
const team=document.querySelector<HTMLButtonElement>('#team');
const pauseButton=document.querySelector<HTMLButtonElement>('#resume');
if(!canvas||!status||!phase||!squad||!log||!brief||!team||!pauseButton)
  throw new Error('Operation page controls are missing');
const view=canvas;
const water=new TerrainWater();
for(let t=0;t<1.5;t+=.1)water.advance(7+t,.1,.6);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xaac5c2);
scene.fog=new THREE.FogExp2(0xb1c5b9,.012);
const renderer=new THREE.WebGLRenderer({
  canvas:view,antialias:true,powerPreference:'low-power',
});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.95;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
scene.add(new THREE.HemisphereLight(0xd4e9df,0x747661,1.8));
const sun=new THREE.DirectionalLight(0xffe5ba,1.55);
sun.position.set(-6,17,-8);
scene.add(sun);
const ground=new THREE.Mesh(makeTerrainGeometry(),[
  new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1}),
  new THREE.MeshStandardMaterial({color:0x786958,roughness:1}),
]);
updateTerrainMoisture(ground.geometry,water);
scene.add(ground);
const plants=new VegetationField(scene);
plants.update(water);
for(const [index,structure] of STRUCTURES.entries()){
  const shade=index<2?0x716d5a:0x817964;
  const roof=new THREE.Mesh(new THREE.BoxGeometry(structure.w,.37,structure.d),
    new THREE.MeshStandardMaterial({color:shade,roughness:.96}));
  roof.position.set(structure.x,terrainHeight(structure.x,structure.z)+.24,structure.z);
  scene.add(roof);
  if(index<2){
    const top=new THREE.Mesh(
      new THREE.BoxGeometry(structure.w*.86,.055,structure.d*.88),
      new THREE.MeshStandardMaterial({color:0x989481,roughness:1}),
    );
    top.position.set(structure.x,roof.position.y+.21,structure.z);
    scene.add(top);
  }
}
const cyan=new THREE.MeshStandardMaterial({color:0x6dded3,emissive:0x22665d,roughness:.55});
const amber=new THREE.MeshStandardMaterial({color:0xf0b967,emissive:0x875426,roughness:.6});
const marker=(color:THREE.Material,radius:number)=>{
  const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,.018,5,36),color);
  mesh.rotation.x=-Math.PI/2;
  scene.add(mesh);return mesh;
};
const extractionRing=marker(cyan,.40);
const intelRing=marker(amber,.22);
const intelShape=new THREE.Mesh(new THREE.OctahedronGeometry(.13),
  new THREE.MeshStandardMaterial({color:0xf0bd72,emissive:0x5b3c1e}));
scene.add(intelShape);
const camera=new THREE.OrthographicCamera(-6,6,6,-6,.1,100);
function resize():void{
  const aspect=Math.max(.3,innerWidth/Math.max(1,innerHeight));
  const halfW=5.6;
  camera.left=-halfW;camera.right=halfW;
  camera.top=halfW/aspect;camera.bottom=-halfW/aspect;
  camera.updateProjectionMatrix();
  camera.position.set(3.5,23,9.5);
  camera.lookAt(0,0,0);
  camera.updateMatrixWorld();
  renderer.setSize(innerWidth,innerHeight,false);
}
let world:Operation=newOperation();
const red=new THREE.MeshStandardMaterial({color:0xc96f5e,roughness:1});
const blue=new THREE.MeshStandardMaterial({color:0x4f98ad,roughness:1});
const selectedMat=new THREE.MeshBasicMaterial({color:0xf4cf82,transparent:true,opacity:.9});
type ActorView={torso:THREE.Mesh;head:THREE.Mesh;select:THREE.Mesh;bar:THREE.Mesh};
const views=new Map<number,ActorView>();
for(const actor of world.actors){
  const side=actor.faction==='contractors'?blue:red;
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.10,.12,.20,7),side);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.075,7,5),new THREE.MeshStandardMaterial({
    color:actor.faction==='contractors'?0xc3ccbb:0xc3ab93,roughness:1,
  }));
  const select=new THREE.Mesh(new THREE.TorusGeometry(.21,.012,4,28),selectedMat);
  select.rotation.x=-Math.PI/2;
  const bar=new THREE.Mesh(new THREE.BoxGeometry(.26,.014,.033),
    new THREE.MeshBasicMaterial({color:0x93dd9c}));
  scene.add(torso,head,select,bar);
  views.set(actor.id,{torso,head,select,bar});
}
const routeLine=new THREE.Line(new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({color:0xf1d18b,depthTest:false,transparent:true,opacity:.8}));
routeLine.renderOrder=4;
scene.add(routeLine);
function updateScene():void{
  for(const a of world.actors){
    const rendered=views.get(a.id)!;
    const y=terrainHeight(a.x,a.z);
    rendered.torso.position.set(a.x,y+.13,a.z);
    rendered.head.position.set(a.x,y+.30,a.z);
    rendered.bar.position.set(a.x,y+.40,a.z);
    rendered.bar.scale.x=a.health/a.maxHealth;
    const dead=a.health<=0;
    rendered.torso.visible=true;
    rendered.head.visible=!dead;rendered.bar.visible=!dead;
    (rendered.torso.material as THREE.MeshStandardMaterial).color.setHex(
      dead?0x4d5049:(a.faction==='contractors'?0x4f98ad:0xc96f5e));
    rendered.select.visible=!dead&&world.selected===a.id;
    rendered.select.position.set(a.x,y+.02,a.z);
  }
  const carrier=world.actors.find(a=>a.id===world.carrier);
  intelRing.position.set(world.intel.x,terrainHeight(world.intel.x,world.intel.z)+.015,world.intel.z);
  intelRing.visible=world.carrier===null;
  intelShape.visible=world.carrier!==null || world.phase==='collect';
  const item=carrier??world.intel;
  intelShape.position.set(item.x,terrainHeight(item.x,item.z)+.36,item.z);
  extractionRing.position.set(world.extraction.x,
    terrainHeight(world.extraction.x,world.extraction.z)+.018,world.extraction.z);
  const chosen=world.actors.find(a=>a.id===world.selected);
  const path=chosen?.path??world.actors.find(a=>a.faction==='contractors')?.path??[];
  if(path.length){
    const start=chosen??world.actors[0];
    const points=[{x:start.x,z:start.z},...path].map(p=>
      new THREE.Vector3(p.x,terrainHeight(p.x,p.z)+.035,p.z));
    routeLine.geometry.dispose();
    routeLine.geometry=new THREE.BufferGeometry().setFromPoints(points);
    routeLine.visible=true;
  }else routeLine.visible=false;
}
let lastPanel=-Infinity;
function updateHud(now:number):void{
  if(Number.isFinite(now)&&now-lastPanel<200)return;
  if(Number.isFinite(now))lastPanel=now;
  const alive=world.actors.filter(a=>a.health>0);
  const contractors=alive.filter(a=>a.faction==='contractors').length;
  const wardens=alive.filter(a=>a.faction==='wardens').length;
  status!.textContent=contractors+' FRIENDLIES · '+wardens+' HOSTILES · '+
    Math.floor(world.elapsed)+'s';
  phase!.textContent=world.phase.toUpperCase();
  brief!.textContent=world.phase==='collect'?
    'Move to the amber field logs near the weather station.':
    world.phase==='extract'?'Carry the logs to the cyan extraction point.':
    world.phase==='won'?'Mission complete. Your team extracted the logs.':
    'Operation failed. Reorganize and retry.';
  log!.textContent=world.events.at(-1)??'';
  squad!.innerHTML=world.actors.filter(a=>a.faction==='contractors').map(a=>
    '<span class="member '+(a.health<=0?'dead':'')+'">'+a.name+
    ' '+Math.max(0,a.health)+'/3</span>').join('');
  team!.setAttribute('aria-pressed',String(world.selected===null));
  pauseButton!.setAttribute('aria-pressed',String(paused));
  pauseButton!.textContent=paused?'RESUME':'PAUSE';
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function groundAt(clientX:number,clientY:number):{x:number;z:number}|null{
  const rect=view.getBoundingClientRect();
  pointer.set(2*(clientX-rect.left)/rect.width-1,
    1-2*(clientY-rect.top)/rect.height);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObject(ground,false)[0];
  return hit?{x:hit.point.x,z:hit.point.z}:null;
}
view.addEventListener('pointerup',e=>{
  if(world.phase==='won'||world.phase==='lost')return;
  const p=groundAt(e.clientX,e.clientY);
  if(!p)return;
  const clicked=world.actors.filter(a=>a.faction==='contractors'&&a.health>0)
    .sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  if(clicked&&Math.hypot(clicked.x-p.x,clicked.z-p.z)<.30){
    world.selected=clicked.id;
  }else orderMove(world,world.selected,p,water);
  updateHud(Infinity);
});
document.querySelector('#team')?.addEventListener('click',()=>{
  world.selected=null;updateHud(Infinity);
});
document.querySelector('#hold')?.addEventListener('click',()=>{
  setPosture(world,world.selected,'hold');updateHud(Infinity);
});
let paused=false;
pauseButton.addEventListener('click',()=>{paused=!paused;updateHud(Infinity);});
document.querySelector('#restart')?.addEventListener('click',()=>{
  world=newOperation();paused=false;updateHud(Infinity);
});
window.addEventListener('resize',resize);
resize();
let last=performance.now(),accumulator=0;
function frame(now:number):void{
  const dt=Math.min(.1,Math.max(0,(now-last)/1000));
  last=now;
  if(!paused){
    accumulator+=dt;
    while(accumulator>=1/30){
      stepOperation(world,1/30,plants.plants,water);
      accumulator-=1/30;
    }
  }
  updateScene();
  updateHud(now);
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
