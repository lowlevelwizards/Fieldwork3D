import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialSecondaryEquipment,secondaryRoundTotal}
 from '../src/secondary-equipment.ts';
import {exchangeSecondaryMagazine}
 from '../src/secondary-magazine-exchange.ts';
import {syncHipSecondaryVisual,presentSecondaryDraw,presentSecondaryReload,
 clearHipSecondaryVisual} from '../src/secondary-holster-visual.ts';

function fixture(){
 const root=new THREE.Group(),hip=new THREE.Group(),chest=new THREE.Group();
 const right=new THREE.Group(),left=new THREE.Group();
 hip.position.y=25;chest.position.y=26;
 right.position.set(12,-3,3);left.position.set(6,-5,-3);
 root.add(hip,chest);chest.add(right,left);
 const kit={...initialSecondaryEquipment('rook','glock-g19x'),
  loadedRounds:4};
 const mount=syncHipSecondaryVisual(hip,kit,true,chest);
 return {root,hip,chest,right,left,kit,mount};
}
test('S8.3: one physical pistol remains attached across magazine serial swaps',()=>{
 const f=fixture(),{hip,chest,right,left,mount,kit}=f;
 const gun=hip.getObjectByName('secondary-holstered-pistol');
 let inserted=null;
 gun.traverse(object=>{
  if(object instanceof THREE.Mesh&&object.userData.glockMagazineFloorplate)
   inserted=object;
 });
 const chosen=kit.spareMagazines[0],old=kit.loadedMagazineId;
 const spare=hip.getObjectByName('secondary-magazine-pouch-'+chosen.id);
 assert.ok(gun&&spare&&inserted,
  'the issued Glock has a real visible loaded floorplate and spare');
 presentSecondaryDraw(hip,right,kit,1);
 const before=spare.getWorldPosition(new THREE.Vector3()).clone();
 const reload={orderId:10,selectedId:chosen.id,elapsed:.62,
  duration:1.2,inserted:false,retain:true};
 presentSecondaryReload(hip,left,kit,reload);
 const moving=spare.getWorldPosition(new THREE.Vector3());
 assert.ok(moving.distanceTo(before)>1);
 if(inserted)assert.equal(inserted.visible,false);
 // One atomic insertion changes spare IDs; the issued pistol never rebuilds.
 const exchanged=exchangeSecondaryMagazine(kit,chosen.id,true);
 assert.equal(exchanged.ok,true);
 const same=syncHipSecondaryVisual(hip,exchanged.equipment,true,chest);
 assert.equal(same,mount,'magazine exchange must not destroy active 3D pistol');
 assert.equal(hip.getObjectByName('secondary-holstered-pistol'),gun);
 assert.equal(hip.getObjectByName('secondary-magazine-pouch-'+chosen.id),undefined);
 assert.ok(hip.getObjectByName('secondary-magazine-pouch-'+old));
 assert.equal(secondaryRoundTotal(exchanged.equipment),secondaryRoundTotal(kit));
 presentSecondaryReload(hip,left,exchanged.equipment,null);
 if(inserted)assert.equal(inserted.visible,true);
 clearHipSecondaryVisual(hip);
 assert.equal(hip.children.length,0);
});
test('S8.3: interrupted reload returns the SAME issued spare to its original carrier',()=>{
 const f=fixture(),{hip,chest,right,left,kit,mount}=f;
 const selected=kit.spareMagazines[0].id;
 const original=hip.getObjectByName('secondary-magazine-pouch-'+selected);
 presentSecondaryDraw(hip,right,kit,1);
 const start=original.position.clone();
 presentSecondaryReload(hip,left,kit,{
  orderId:12,selectedId:selected,elapsed:.66,duration:1.2,
  inserted:false,retain:true
 });
 assert.ok(original.position.distanceTo(start)>1);
 presentSecondaryReload(hip,left,kit,null);
 assert.equal(original.position.distanceTo(start),0);
 assert.equal(syncHipSecondaryVisual(hip,kit,true,chest),mount);
 assert.equal(hip.getObjectByName('secondary-magazine-pouch-'+selected),original);
});
test('S7.4: visually held pistol points along recorded shot yaw rather than turning with torso only',()=>{
 const {hip,chest,right,kit}=fixture();
 presentSecondaryDraw(hip,right,kit,1,true,Math.PI/2);
 const cradle=hip.getObjectByName('secondary-holstered-pistol');
 const v=new THREE.Vector3(1,0,0).applyQuaternion(
  cradle.getWorldQuaternion(new THREE.Quaternion()));
 assert.ok(Math.abs(v.x)<1e-5);
 assert.ok(v.z>.99,'pistol barrel aims along the same positive Z outgoing shot');
});
