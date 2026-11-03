/** 3D reference viewer for the actual authored armor/rig prototypes.
 * No loadout mutation, gameplay capability or duplicated visual source.
 */
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from './breach-operator-rig.ts';
import {setEquipmentChoice,initialEquipmentLoadout} from './equipment-loadouts.ts';
import {initialWardrobe,wardrobeItemsForSlot} from './operator-wardrobe-data.ts';

const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const armorSelect=el<HTMLSelectElement>('armorChoice'),
 rigSelect=el<HTMLSelectElement>('rigChoice'),
 zoomSelect=el<HTMLSelectElement>('zoomChoice'),
 canvas=el<HTMLCanvasElement>('armorCanvas');
const params=new URLSearchParams(location.search);
for(const [select,slot] of [
 [armorSelect,'armorStyle'],[rigSelect,'rigStyle']
] as const)
 for(const item of wardrobeItemsForSlot(slot)){
  const option=document.createElement('option');
  option.value=item.id;option.textContent=item.name;select.add(option);
 }
const armorIds=new Set(Array.from(armorSelect.options,x=>x.value));
const rigIds=new Set(Array.from(rigSelect.options,x=>x.value));
armorSelect.value=armorIds.has(params.get('armor')??'')?
 params.get('armor')!:'plate-standard';
rigSelect.value=rigIds.has(params.get('rig')??'')?
 params.get('rig')!:'chest-placard';
zoomSelect.value=params.get('zoom')==='detail'?'detail':'gameplay';
let view=params.get('view')??'fit';
if(!['fit','front','side','back'].includes(view))view='fit';
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setClearColor(0xb9c0b9);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb9c0b9);
scene.add(new THREE.HemisphereLight(0xffffff,0x82918a,2));
const sunlight=new THREE.DirectionalLight(0xfff6e3,2.35);
sunlight.position.set(40,80,-38);scene.add(sunlight);
const camera=new THREE.OrthographicCamera(-35,35,35,-35,.1,600);
const operator=createOperatorRig('rook','blue');
scene.add(operator.root);
function updateView(){
 const target=new THREE.Vector3(0,27,0),distance=100;
 const dirs={
  fit:new THREE.Vector3(distance*.78,55,-distance*.7),
  front:new THREE.Vector3(distance,20,0),
  side:new THREE.Vector3(0,20,distance),
  back:new THREE.Vector3(-distance,20,0)
 };
 camera.position.copy(target).add(dirs[view as keyof typeof dirs]);
 camera.lookAt(target);
 const rect=canvas.getBoundingClientRect(),width=Math.max(1,rect.width),
  height=Math.max(1,rect.height);
 renderer.setSize(Math.round(width),Math.round(height),false);
 const scale=zoomSelect.value==='detail'?27:43,aspect=width/height;
 camera.left=-scale*aspect;camera.right=scale*aspect;
 camera.top=scale;camera.bottom=-scale;
 camera.updateProjectionMatrix();
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>
  button.setAttribute('aria-pressed',String(button.dataset.view===view)));
 renderer.render(scene,camera);
 canvas.dataset.ready='true';
 canvas.dataset.armor=armorSelect.value;
 canvas.dataset.rig=rigSelect.value;
 canvas.dataset.view=view;
}
function refresh(){
 let kit=initialEquipmentLoadout();
 const armor=armorSelect.value,rig=rigSelect.value;
 kit=setEquipmentChoice(kit,'armor',armor==='armor-bare'?'armor-none':
  armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 kit=setEquipmentChoice(kit,'rig',rig==='no-rig'?'rig-none':
  ['micro-rig','light-rig','chest-placard'].includes(rig)?'rig-light':'rig-full');
 for(const [slot,id] of [
  ['belt','belt-none'],['backpack','backpack-none'],['head','head-none']
 ] as const)kit=setEquipmentChoice(kit,slot,id);
 const wardrobe={...initialWardrobe(),
  styles:{top:'bdu-shirt',trousers:'bdu-trousers',headwear:'bare',
   armorStyle:armor,rigStyle:rig,beltStyle:'no-belt',packStyle:'no-pack'},
  fabricSolids:{top:'slate',trousers:'slate',armor:'slate',gear:'slate',pack:'slate'}
 } as const;
 poseOperator(operator,{
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
  injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  unarmedPreview:true,equipment:kit,wardrobe
 },0);
 updateView();
}
for(const select of [armorSelect,rigSelect,zoomSelect])
 select.addEventListener('change',refresh);
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>
 button.addEventListener('click',()=>{view=button.dataset.view??'fit';updateView();}));
new ResizeObserver(updateView).observe(canvas);
refresh();
window.addEventListener('pagehide',()=>{operator.dispose();renderer.dispose();},{once:true});
