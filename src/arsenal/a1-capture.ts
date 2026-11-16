/** A1 visual contact sheet: actual modular production mesh and Arsenal lights.
 * Isolated development-only route, no loadout writes, no secondary weapon art.
 * Browser screenshot harness saves the output. Never run in gameplay loops.
 */
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from './catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment}
 from '../equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../breach-weapon-accessories.ts';
import {weaponVisualLayout} from '../weapons/geometry/weapon-visual-layout.ts';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER}
 from '../weapons/geometry/weapon-visual-palette.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {configureGraphicRendererOutput} from '../rendering/graphic-lighting-profile.ts';

const holder=document.getElementById('sheet')!;
const status=document.getElementById('status')!;
if(!holder||!status)throw Error('A1 capture template missing');
const scene=new THREE.Scene();
addArsenalInspectionLighting(scene);
const camera=new THREE.OrthographicCamera(-24,24,12,-12,.1,300);
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,
 preserveDrawingBuffer:true,powerPreference:'low-power'});
configureGraphicRendererOutput(renderer);
renderer.setPixelRatio(1);
renderer.setSize(480,240,false);
const target=new THREE.Vector3(2,-2,0);
const views=[
 {name:'Side',position:new THREE.Vector3(0,0,82),up:new THREE.Vector3(0,1,0)},
 {name:'Three-quarter',position:new THREE.Vector3(23,18,73),up:new THREE.Vector3(0,1,0)},
 {name:'Top',position:new THREE.Vector3(0,82,.01),up:new THREE.Vector3(0,0,-1)}
] as const;
const shot=(view:typeof views[number])=>{
 camera.position.copy(target).add(view.position);
 camera.up.copy(view.up);camera.lookAt(target);camera.updateProjectionMatrix();
 renderer.render(scene,camera);
 return renderer.domElement.toDataURL('image/png');
};
const label=(title:string,src:string,gray=false)=>{
 const frame=document.createElement('figure');frame.className='view'+(gray?' is-gray':'');
 const img=document.createElement('img');img.src=src;img.alt=title+' factory weapon';
 img.width=480;img.height=240;
 const caption=document.createElement('figcaption');caption.textContent=title;
 frame.append(img,caption);return frame;
};
const accessoryReview=new URLSearchParams(location.search).has('a2');
const reviewIds=new Set(['ar-m4a1','ak-ak74m','hk-g3a3','hk-mp5a3','fal-5000','fnc-service']);
const reviewRefs=accessoryReview?ARSENAL_REFERENCES.filter(ref=>reviewIds.has(ref.id)):ARSENAL_REFERENCES;
async function generate(){
 if(accessoryReview&&reviewRefs.length!==6)throw Error('A2 sample IDs changed');
 let mountedModels=0;
 for(const ref of reviewRefs){
  let config=selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),ref.id);
  if(accessoryReview){
   if(config.build?.family==='hk')config=setWeaponAttachment(config,'opticMount','optic-hk-claw');
   for(const [slot,id] of [['optic','optic-reflex'],['muzzle','muzzle-suppressor'],
    ['light','light-compact'],['foregrip','foregrip-vertical']] as const)
    config=setWeaponAttachment(config,slot,id);
  }
  if(!config.build)throw Error('Missing A1 factory geometry '+ref.id);
  const body=buildWeaponSilhouette(config.weapon,
   WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER,config);
  const accessories=buildWeaponAccessories(config,
   WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER);
  if(accessoryReview&&accessories.children.length>0)mountedModels++;
  const model=new THREE.Group();model.add(body,accessories);
  model.scale.x=weaponVisualLayout(config).longitudinalScale;
  scene.add(model);
  const images=views.map(shot);
  scene.remove(model);
  clearWeaponSilhouette(body);
  accessories.traverse(node=>{if(node instanceof THREE.Mesh)node.geometry.dispose();});
  const section=document.createElement('section');section.className='preset';
  section.dataset.presetId=ref.id;
  const heading=document.createElement('h2');heading.textContent=ref.name+' ';
  const sub=document.createElement('small');sub.textContent=' / '+ref.id+' / '+ref.platformId;
  heading.append(sub);
  const cells=document.createElement('div');cells.className='views';
  cells.append(label('Side',images[0]),label('Three-quarter',images[1]),
   label('Top',images[2]),label('Grayscale side',images[0],true));
  section.append(heading,cells);holder.append(section);
  status.textContent='Rendered '+holder.children.length+' / '+reviewRefs.length+' '+(accessoryReview?'equipped':'factory')+' presets';
  // Allow progress paint without adding any animation or frame loop to the game.
  if(holder.children.length%6===0)await new Promise(resolve=>requestAnimationFrame(()=>resolve(null)));
 }
 renderer.dispose();renderer.forceContextLoss();
 if(accessoryReview&&mountedModels!==6)throw Error('A2 sample accessory coverage incomplete '+mountedModels);
 status.textContent='Capture complete: '+reviewRefs.length+' '+(accessoryReview?'equipped':'factory')+' presets · 4 fixed views';
 document.body.dataset.a1Complete='true';
 document.body.dataset.a1Count=String(reviewRefs.length);
 document.body.dataset.a2EquippedCount=String(mountedModels);
}
generate().catch(error=>{
 console.error(error);
 status.textContent='Capture failed: '+String(error);
 document.body.dataset.a1Failed=String(error);
});
