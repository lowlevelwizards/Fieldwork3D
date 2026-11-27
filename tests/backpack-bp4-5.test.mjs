import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {AUTHORED_PACK_STYLES,buildAuthoredPack} from '../src/operator-backpack-art.ts';
import {createPackPreview,updatePackPreview} from '../src/operator-backpack-preview.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle,readWardrobe} from '../src/operator-wardrobe-data.ts';
const materials=()=>({fabric:new THREE.MeshStandardMaterial(),trim:new THREE.MeshStandardMaterial(),dark:new THREE.MeshStandardMaterial()});
test('four distinct authored models, material batches and socket policy',()=>{
 const sizes=new Map();
 for(const style of AUTHORED_PACK_STYLES.slice(0,4)){
  const art=buildAuthoredPack(style,materials());
  const bounds=new THREE.Box3().setFromObject(art.root);
  const size=bounds.getSize(new THREE.Vector3());sizes.set(style,size);
  const cap={hydration:5,'assault-panel':7,'day-pack':10,'assault-pack':13}[style];
  assert.ok(art.root.userData.fieldworkPackComponents<=cap);
  const graphic=art.root.getObjectByName('pack-pixel-graphics');
  assert.ok(graphic&&graphic.material.map&&graphic.castShadow===false);
  assert.ok(graphic.geometry.index.count/3<=30);
  assert.ok(size.toArray().every(n=>Number.isFinite(n)&&n>0));
  assert.ok(art.root.children.length<=4,'material batching');
  art.root.traverse(o=>{if(o.isMesh)for(const key of ['position','normal','uv'])assert.ok(o.geometry.getAttribute(key).array.every(Number.isFinite));});
  assert.equal(art.sockets.length,style==='day-pack'?2:style==='assault-pack'?4:0);
  for(const socket of art.sockets)assert.ok(bounds.distanceToPoint(new THREE.Vector3(...socket.point))<.65);
 }
 assert.ok(sizes.get('hydration').z<sizes.get('assault-panel').z);
 assert.ok(sizes.get('hydration').x<sizes.get('assault-panel').x);
 assert.ok(sizes.get('assault-panel').x<sizes.get('day-pack').x);
 assert.ok(sizes.get('day-pack').x<sizes.get('assault-pack').x);
 assert.ok(sizes.get('day-pack').y<sizes.get('assault-pack').y);
});
test('lazy model reuse, carrier compatibility and harness lifecycle',()=>{
 const chest=new THREE.Group(),parent=new THREE.Group();chest.add(parent);
 const state=createPackPreview(parent,chest,materials());
 assert.equal(updatePackPreview(state,false,'day-pack','armor-bare','no-rig','combat-shirt'),undefined);
 assert.equal(state.models.size,0);
 const day=updatePackPreview(state,true,'day-pack','armor-bare','no-rig','combat-shirt');
 const harness=state.harness;
 assert.ok(harness&&day.root.visible);
 assert.equal(updatePackPreview(state,true,'day-pack','armor-bare','no-rig','combat-shirt'),day);
 assert.equal(state.harness,harness);
 assert.equal(updatePackPreview(state,true,'admin-pack','soft-vest','no-rig','combat-shirt'),undefined);
 assert.equal(day.root.visible,false);assert.equal(harness.parent,null);
 const panel=updatePackPreview(state,true,'admin-pack','plate-jpc','no-rig','combat-shirt');
 assert.equal(panel.style,'assault-panel');assert.equal(state.harness,undefined);
 assert.equal(updatePackPreview(state,true,'day-pack','plate-jpc','no-rig','combat-shirt'),day);
 assert.equal(panel.root.visible,false);
 const hydration=updatePackPreview(state,true,'hydration','plate-jpc','no-rig','combat-shirt');
 assert.ok(hydration.root.visible);assert.ok(state.harness.getObjectByName('hydration-hose'));
});
test('authored backpack is the only production model and incompatible panel falls back without changing inventory',()=>{
 const rig=createOperatorRig('rook','blue');
 let kit=initialEquipmentLoadout();kit=setEquipmentChoice(kit,'armor','armor-carrier');kit=setEquipmentChoice(kit,'backpack','backpack-day');
 let wardrobe=setWardrobeStyle(initialWardrobe(),'armorStyle','plate-jpc');
 const pose={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,aiming:false,firing:false,turning:0,deterministic:true,equipment:kit};
 wardrobe=setWardrobeStyle(wardrobe,'packStyle','admin-pack');
 poseOperator(rig,{...pose,wardrobe},0);
 assert.equal(rig.visualKit.packPreview.active.style,'assault-panel');
 assert.equal(rig.visualKit.packPreview.active.root.parent,rig.pack);
 assert.equal(rig.visualKit.packPreview.harness,undefined);
 assert.equal(kit.slots.backpack,'backpack-day');
 wardrobe=setWardrobeStyle(wardrobe,'armorStyle','plate-heavy');
 poseOperator(rig,{...pose,wardrobe},0);
 assert.equal(rig.visualKit.packPreview.active.style,'day-pack');
 assert.ok(rig.visualKit.packPreview.harness);
 assert.equal(kit.slots.backpack,'backpack-day');
 rig.dispose();
});
test('retired soft-paca raw saves migrate to current soft-slick',()=>{
 assert.equal(readWardrobe({...initialWardrobe(),styles:{armorStyle:'soft-paca'}}).styles.armorStyle,'soft-slick');
});

test('assault Y is a continuous angular surface graphic within the existing batch',()=>{
 const art=buildAuthoredPack('assault-pack',materials());
 const mesh=art.root.getObjectByName('pack-pixel-graphics');
 assert.equal(art.root.userData.fieldworkPackAngledY,true);
 assert.equal(mesh.castShadow,false);
 const p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');
 // First 13 vertices are the joined Y outline and the lower shell band.
 assert.ok(p.count>=13);
 for(let i=1;i<13;i++){
  assert.equal(uv.getX(i),uv.getX(0));
  assert.equal(uv.getY(i),uv.getY(0));
 }
 assert.ok(p.getZ(3)>4&&p.getZ(7)<-4);
 assert.ok(Math.abs(p.getY(3)-p.getY(4))>.2);
 assert.ok(mesh.geometry.index.count/3<=30);
 for(let i=0;i<27;i+=3){
  const idx=mesh.geometry.index;
  const a=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i));
  const b=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+1));
  const c=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+2));
  assert.ok(b.sub(a).cross(c.sub(a)).x<0,'outward-facing rear patch');
 }
});
