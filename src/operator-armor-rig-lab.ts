/** 3D reference viewer for the actual authored armor/rig prototypes.
 * No loadout mutation, gameplay capability or duplicated visual source.
 */
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from './breach-operator-rig.ts';
import {setEquipmentChoice,initialEquipmentLoadout} from './equipment-loadouts.ts';
import {initialWardrobe,wardrobeItemsForSlot,type WardrobeOptions}
 from './operator-wardrobe-data.ts';
import {HEADWEAR_CAMO_IDS,type HeadwearCamoId}
 from './operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY} from './operator-fabric-camo-materials.ts';
import {createArmorFitDebug,disposeArmorFitDebug}
 from './operator-armor-fit-debug.ts';

const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const armorSelect=el<HTMLSelectElement>('armorChoice'),
 rigSelect=el<HTMLSelectElement>('rigChoice'),
 topSelect=el<HTMLSelectElement>('topChoice'),
 zoomSelect=el<HTMLSelectElement>('zoomChoice'),
 debugChoice=el<HTMLInputElement>('fitDebugChoice'),
 status=el<HTMLElement>('fitStatus'),
 canvas=el<HTMLCanvasElement>('armorCanvas');
const params=new URLSearchParams(location.search);
// Opt-in 8G reference comparison only. The lab is not a player route;
// each Playwright density shot loads a fresh page with one metric repeat.
// This never persists into operator looks or modifies the source atlas.
const m98Scale=params.get('m98Scale');
if(['2.55','3.0','3.4'].includes(m98Scale??'')&&
 params.get('camo')==='norwegian-m98')
 (FABRIC_CAMO_DENSITY as Record<string,number>)['norwegian-m98']=Number(m98Scale);
// R9 optional read-only reference preview, never written to roster saves.
const previewCamo:HeadwearCamoId|undefined=
 HEADWEAR_CAMO_IDS.find(id=>id===params.get('camo'));
const previewChannel: 'top'|'armor'|'gear'|null=
 ['top','armor','gear'].includes(params.get('camoChannel')??'')?
 params.get('camoChannel') as 'top'|'armor'|'gear':null;
for(const [select,slot] of [
 [armorSelect,'armorStyle'],[rigSelect,'rigStyle'],[topSelect,'top']
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
const topIds=new Set(Array.from(topSelect.options,x=>x.value));
topSelect.value=topIds.has(params.get('top')??'')?
 params.get('top')!:'combat-shirt';
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
let debugGroup:THREE.Group|null=null;
function updateFitDebug(){
 if(debugGroup){disposeArmorFitDebug(debugGroup);debugGroup=null;}
 if(!debugChoice.checked){
  status.textContent='Enable debug to inspect front, shoulder and side clearances.';
  return;
 }
 const check=createArmorFitDebug(armorSelect.value,topSelect.value);
 debugGroup=check.group;
 operator.chest.add(debugGroup);
 status.textContent=check.status;
}
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
 document.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach(button=>
  button.setAttribute('aria-pressed',String(button.dataset.view===view)));
 renderer.render(scene,camera);
 canvas.dataset.ready='true';
 canvas.dataset.armor=armorSelect.value;
 canvas.dataset.rig=rigSelect.value;
 canvas.dataset.top=topSelect.value;
 canvas.dataset.view=view;
 canvas.dataset.camo=previewCamo??'none';
 canvas.dataset.camoScale=String(FABRIC_CAMO_DENSITY['norwegian-m98']);
}
function refresh(){
 let kit=initialEquipmentLoadout();
 const armor=armorSelect.value,rig=rigSelect.value;
 kit=setEquipmentChoice(kit,'armor',armor==='armor-bare'?'armor-none':
  armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 kit=setEquipmentChoice(kit,'rig',rig==='no-rig'?'rig-none':
  ['micro-rig','light-rig','chest-placard','chicom-rig','bandolier'].includes(rig)?'rig-light':'rig-full');
 for(const [slot,id] of [
  ['belt','belt-none'],['backpack','backpack-none'],['head','head-none']
 ] as const)kit=setEquipmentChoice(kit,slot,id);
 const wardrobe:WardrobeOptions={...initialWardrobe(),
  styles:{top:topSelect.value,trousers:'bdu-trousers',headwear:'bare',
   armorStyle:armor,rigStyle:rig,beltStyle:'no-belt',packStyle:'no-pack'},
  fabricSolids:{top:'slate',trousers:'slate',armor:'slate',gear:'slate',pack:'slate'}
 };
 if(previewCamo&&previewChannel)
  wardrobe.fabricCamo={...wardrobe.fabricCamo,[previewChannel]:previewCamo,
   // Read-only comparison harness: print the same atlas on BDU trousers.
   // No player save or normal Lab behavior is changed by this opt-in flag.
   ...(previewChannel==='top'&&params.get('camoBoth')==='1'?
    {trousers:previewCamo}:{} )};

 poseOperator(operator,{
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
  injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  unarmedPreview:true,equipment:kit,wardrobe
 },0);
 // Comparison previews must fail fast if the chosen cut disallows this
 // textile; otherwise a gray mannequin can masquerade as a camo audit.
 if(previewCamo&&previewChannel){
  const material=previewChannel==='top'?operator.clothMaterial:
   previewChannel==='armor'?operator.vestMaterial:operator.gearMaterial;
  const expected='Fieldwork cloth '+previewChannel+' / '+previewCamo;
  if(!material.map?.name.startsWith(expected))
   throw new Error('Incompatible camouflage preview: '+expected+
    ' on '+topSelect.value+' / '+armor+' / '+rig);
 }
 updateFitDebug();
 updateView();
}
for(const select of [armorSelect,rigSelect,topSelect,zoomSelect])
 select.addEventListener('change',refresh);
debugChoice.addEventListener('change',()=>{updateFitDebug();updateView();});
document.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach(button=>
 button.addEventListener('click',()=>{view=button.dataset.view??'fit';updateView();}));
new ResizeObserver(updateView).observe(canvas);
refresh();
window.addEventListener('pagehide',()=>{
 if(debugGroup)disposeArmorFitDebug(debugGroup);
 operator.dispose();renderer.dispose();
},{once:true});
