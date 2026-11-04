import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {ARMOR_PROPORTIONS,ARMOR_VISIBLE_STYLES}
 from '../src/operator-armor-proportions.ts';
import {ARMOR_PROFILES} from '../src/operator-armor-rig-silhouettes.ts';
import {ARMOR_FIT_TOPS,ARMOR_PANEL_DEPTHS,armorContactSpan,
 fittedArmorSurfaces} from '../src/operator-uniform-fit-envelope.ts';
import {garmentContactAnchor,contactBoxAt}
 from '../src/operator-garment-contact-surface.ts';
import {armorSideLayout} from '../src/operator-armor-side-layout.ts';

function pose(r,top,style){
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor',style.startsWith('plate-')?
  'armor-carrier':'armor-soft');
 kit=setEquipmentChoice(kit,'rig','rig-none');
 poseOperator(r,{
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
  injury:0,weapon:'carbine',reload:0,reloadDuration:0,lastDoorAt:-100,
  lastThrowAt:-100,down:false,surrender:false,aiming:false,firing:false,
  turning:0,deterministic:true,unarmedPreview:true,equipment:kit,
  wardrobe:{...initialWardrobe(),styles:{
   top,armorStyle:style,trousers:'bdu-trousers',
   rigStyle:'no-rig',headwear:'bare',
   beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
}
function contactMeshes(r,top){
 const meshes=[];
 const base=r.chest.getObjectByName('fieldwork-contact-base-torso');
 assert.ok(base,'real renderable core torso is exposed');
 meshes.push(base);
 const outer=r.chest.getObjectByName('upper-garment:'+top);
 if(outer)outer.traverse(o=>{
  if(o instanceof THREE.Mesh&&o.userData.armorContactShell)
   meshes.push(o);
 });
 return meshes;
}
function cast(r,meshes,origin,normal){
 r.chest.updateWorldMatrix(true,true);
 const start=r.chest.localToWorld(new THREE.Vector3(...origin));
 const dir=new THREE.Vector3(...normal).transformDirection(r.chest.matrixWorld);
 const hits=new THREE.Raycaster(start,dir,0,100).intersectObjects(meshes);
 assert.ok(hits.length,'rendered uniform has an exterior ray intersection');
 return r.chest.worldToLocal(hits[0].point.clone());
}
test('R7 every garment contact anchor matches its ACTUAL rendered shell',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ARMOR_FIT_TOPS){
  pose(r,top,'plate-standard');
  const meshes=contactMeshes(r,top);
  for(const y of [-3.0,0,3.0]){
   const p=garmentContactAnchor(top,y);
   const face=cast(r,meshes,[30,y,0],[-1,0,0]);
   const rear=cast(r,meshes,[-30,y,0],[1,0,0]);
   const side=cast(r,meshes,[0,y,30],[0,0,-1]);
   assert.ok(Math.abs(face.x-p.front)<.025,
    top+' real front '+face.x+' !== anchor '+p.front);
   assert.ok(Math.abs(rear.x-p.back)<.025,
    top+' real back '+rear.x+' !== anchor '+p.back);
   assert.ok(Math.abs(side.z-p.side)<.025,
    top+' real side '+side.z+' !== anchor '+p.side);
  }
  const b=contactBoxAt(top,5.2);
  const shoulder=cast(r,meshes,[0,25,3],[0,-1,0]);
  assert.ok(Math.abs(shoulder.y-(b.y+b.height*.5))<.025,
   top+' actual top surface has correct shoulder contact height');
 }
 r.dispose();
});
test('R7 seven armor inner faces contact the rendered chest and rear, not legacy profile floors',()=>{
 for(const top of ARMOR_FIT_TOPS){
  const body=armorContactSpan(top,-3.8,4.0);
  for(const style of ARMOR_VISIBLE_STYLES){
   const fit=fittedArmorSurfaces(style,top,ARMOR_PROFILES[style]);
   const depth=ARMOR_PANEL_DEPTHS[style];
   const frontGap=fit.front-depth-body.front;
   const rearGap=body.back-(fit.back+depth);
   assert.ok(frontGap>=.09&&frontGap<.2,
    style+' '+top+' front-to-surface gap '+frontGap);
   assert.ok(rearGap>=.09&&rearGap<.2,
    style+' '+top+' back-to-surface gap '+rearGap);
   const side=armorSideLayout(fit,ARMOR_PROPORTIONS[style]);
   const sideGap=side.centerZ-side.sideHalfThickness-side.garmentSide;
   assert.ok(sideGap>=.09&&sideGap<.2,
    style+' '+top+' side-to-surface gap '+sideGap);
   const forged=fittedArmorSurfaces(style,top,{front:100,side:100});
   assert.equal(fit.front,forged.front,
    style+' '+top+' cannot retain a phantom nominal front minimum');
   assert.equal(fit.back,forged.back,
    style+' '+top+' cannot retain a phantom nominal rear minimum');
   assert.equal(fit.side,forged.side,
    style+' '+top+' cannot retain a phantom nominal flank minimum');
  }
 }
});
test('R7 armor-and-uniform changes restore geometry with no per-frame regeneration',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ARMOR_FIT_TOPS){
  for(const armor of ARMOR_VISIBLE_STYLES){
   pose(r,top,armor);
   const group=r.visualKit.wardrobeGear.armor[armor];
   const connectors=group.getObjectByName('uniform-fitted-connectors');
   assert.ok(group.visible&&connectors,armor+' '+top+' fitted');
   const original=connectors.children.map(o=>o.uuid);
   pose(r,top,armor);
   assert.deepEqual(connectors.children.map(o=>o.uuid),original,
    armor+' '+top+' does not rebuild every frame');
  }
 }
 r.dispose();
});
