/** A1 visual contact sheet: actual modular production mesh and Arsenal lights.
 * Isolated development-only route, no loadout writes, no secondary weapon art.
 * Browser screenshot harness saves the output. Never run in gameplay loops.
 */
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from './catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment,setConfiguredFamilyPart}
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
const query=new URLSearchParams(location.search);
const a3Review=query.has('a3'),a2Review=query.has('a2'),h3Review=query.has('h3');
const accessoryReview=a2Review||a3Review||h3Review;
const a2Ids=new Set(['ar-m4a1','ak-ak74m','hk-g3a3','hk-mp5a3','fal-5000','fnc-service']);
const a3Ids=new Set(['ar-m4a1','ak-ak74m','hk-g3a3','hk-hk33a2',
 'hk-hk53a3','hk-mp5a3','hk-mp5sd3','fal-5000','fnc-service']);
const reviewIds=a3Review?a3Ids:a2Ids;
const reviewRefs=accessoryReview?ARSENAL_REFERENCES.filter(ref=>reviewIds.has(ref.id)):ARSENAL_REFERENCES;
// A3.H3: inspect *both optic types* on actual compatible host geometry.
// Explicit cases prevent a default-only sheet from hiding floating scopes.
const h3Cases=[
 ['ar-m4a1','optic-reflex',false,false],
 ['ar-m4a1','optic-magnified',false,false],
 ['ak-ak74m','optic-reflex',false,true],
 ['ak-ak74m','optic-magnified',false,true],
 ['hk-g3a3','optic-reflex',true,false],
 ['hk-g3a3','optic-magnified',true,false],
 ['hk-hk33a2','optic-reflex',true,false],
 ['hk-hk53a3','optic-magnified',true,false],
 ['hk-mp5a3','optic-reflex',true,false]
] as const;
const reviewCases=h3Review?
 h3Cases.map(([preset,optic,claw,railedAK])=>({
  ref:ARSENAL_REFERENCES.find(ref=>ref.id===preset)!,
  id:preset+'-'+optic,optic,claw,railedAK
 })) :
 reviewRefs.map(ref=>({ref,id:ref.id,optic:'',claw:false,railedAK:false}));
if(h3Review){
 camera.left=-15;camera.right=15;camera.top=7.5;camera.bottom=-7.5;
 target.set(2.5,2.5,0);
}
async function generate(){
 if(accessoryReview&&reviewCases.length!==(a3Review||h3Review?9:6))
  throw Error('Accessory sample IDs changed');
 let mountedModels=0;
 for(const entry of reviewCases){
  const ref=entry.ref;
  if(!ref)throw Error('Missing H3 capture preset');
  let config=selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),ref.id);
  if(h3Review){
   if(entry.railedAK){
    config=setConfiguredFamilyPart(config,'handguard','ak-rail-long');
    if(config.build?.parts.handguard!=='ak-rail-long')
     throw Error('A3.H3 AK railed handguard refused');
   }
   if(entry.claw){
    config=setWeaponAttachment(config,'opticMount','optic-hk-claw');
    if(config.slots.opticMount!=='optic-hk-claw')
     throw Error('A3.H3 claw refused '+ref.id);
   }
   config=setWeaponAttachment(config,'optic',entry.optic);
   if(config.slots.optic!==entry.optic)throw Error('A3.H3 optic refused '+entry.id);
  }else if(a3Review){
   // Capture only actually accepted build choices. Do not show invented
   // loadouts on FAL/FNC, or a detachable suppressor over an MP5SD.
   if(ref.id==='ak-ak74m'){
    config=setConfiguredFamilyPart(config,'handguard','ak-rail-long');
    if(config.build?.parts.handguard!=='ak-rail-long')throw Error('A3 AK rail refused');
   }
   if(ref.id==='hk-mp5a3'){
    config=setConfiguredFamilyPart(config,'handguard','hk-mp5-trirail');
    if(config.build?.parts.handguard!=='hk-mp5-trirail')throw Error('A3 MP5 tri-rail refused');
   }
   const wanted:[string,string][]=[
    ['light','light-compact'],['sling','sling-two-point']
   ];
   if(ref.platformId==='g3'||ref.platformId==='hk33'||ref.platformId==='mp5')
    wanted.push(['opticMount','optic-hk-claw']);
   if(['ar15','ak','g3','hk33','mp5'].includes(ref.platformId))
    wanted.push(['optic',ref.platformId==='ar15'?'optic-magnified':'optic-reflex']);
   if(ref.id!=='hk-mp5sd3')wanted.push(['muzzle','muzzle-suppressor']);
   if(['ar-m4a1','ak-ak74m','hk-mp5a3'].includes(ref.id))
    wanted.push(['foregrip','foregrip-vertical']);
   for(const [slot,id] of wanted){
    const next=setWeaponAttachment(config,slot as 'optic'|'muzzle'|'foregrip'|'light'|'sling'|'opticMount',id);
    if(next.slots[slot as 'optic'|'muzzle'|'foregrip'|'light'|'sling'|'opticMount']!==id)
     throw Error('A3 equipped config refused '+ref.id+' / '+slot+'='+id);
    config=next;
   }
  }else if(a2Review){
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
  section.dataset.presetId=entry.id;
  section.dataset.acceptedAccessories=Object.values(config.slots).join(',');
  const heading=document.createElement('h2');heading.textContent=ref.name+(h3Review?' · '+entry.optic:'')+' ';
  const sub=document.createElement('small');sub.textContent=' / '+ref.id+' / '+ref.platformId;
  heading.append(sub);
  const cells=document.createElement('div');cells.className='views';
  cells.append(label('Side',images[0]),label('Three-quarter',images[1]),
   label('Top',images[2]),label('Grayscale side',images[0],true));
  section.append(heading,cells);holder.append(section);
  status.textContent='Rendered '+holder.children.length+' / '+reviewCases.length+' '+(accessoryReview?'equipped':'factory')+' presets';
  // Allow progress paint without adding any animation or frame loop to the game.
  if(holder.children.length%6===0)await new Promise(resolve=>requestAnimationFrame(()=>resolve(null)));
 }
 renderer.dispose();renderer.forceContextLoss();
 if(accessoryReview&&mountedModels!==(a3Review||h3Review?9:6))
  throw Error('Accessory sample coverage incomplete '+mountedModels);
 status.textContent='Capture complete: '+reviewCases.length+' '+(accessoryReview?'equipped':'factory')+' presets · 4 fixed views';
 document.body.dataset.a1Complete='true';
 document.body.dataset.a1Count=String(reviewCases.length);
 document.body.dataset.a2EquippedCount=String(mountedModels);
 document.body.dataset.a3EquippedCount=a3Review||h3Review?String(mountedModels):'0';
}
generate().catch(error=>{
 console.error(error);
 status.textContent='Capture failed: '+String(error);
 document.body.dataset.a1Failed=String(error);
});
