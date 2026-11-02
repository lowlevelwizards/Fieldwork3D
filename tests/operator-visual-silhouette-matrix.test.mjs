import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';

const pose=equipment=>({x:0,z:0,heading:0,velocity:0,seconds:0,
 stride:0,posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
 down:false,surrender:false,aiming:false,firing:false,turning:0,
 deterministic:true,equipment});
const extent=(root,obj)=>{
 const prior=obj.visible;obj.visible=true;root.updateMatrixWorld(true);
 const size=new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
 obj.visible=prior;return size;
};
test('major operator equipment choices now have different actual silhouettes',()=>{
 const rig=createOperatorRig('rook','blue');
 const v=rig.visualKit;
 const a=extent(rig.root,v.softArmor),b=extent(rig.root,v.plateCarrier);
 assert.ok(b.x>a.x+1,b.x+' '+a.x);
 assert.ok(b.z>a.z+.2,b.z+' '+a.z);
 const day=extent(rig.root,v.dayPack),field=extent(rig.root,v.fieldPack);
 assert.ok(field.y>day.y+3);
 assert.ok(field.z>day.z+2);
 const j=extent(rig.root,v.jacket),shirt=extent(rig.root,v.lightShirt);
 assert.ok(j.y>shirt.y);
 const helm=extent(rig.root,v.helmet),cap=extent(rig.root,v.cap);
 assert.ok(helm.y>cap.y+1);
 assert.equal(rig.pack.geometry.getAttribute('position'),undefined);
 rig.dispose();
});
test('every armor rig and pack combination is exclusive with depth offset',()=>{
 const rig=createOperatorRig('rook','blue');
 const armors=['armor-none','armor-soft','armor-carrier'];
 const rigs=['rig-none','rig-light','rig-full'];
 const bags=['backpack-none','backpack-day','backpack-field'];
 for(const armor of armors)for(const chestRig of rigs)for(const bag of bags){
  let kit=initialEquipmentLoadout();
  kit=setEquipmentChoice(kit,'armor',armor);
  kit=setEquipmentChoice(kit,'rig',chestRig);
  kit=setEquipmentChoice(kit,'backpack',bag);
  poseOperator(rig,pose(kit),0);
  assert.equal(rig.visualKit.softArmor.visible,armor==='armor-soft');
  assert.equal(rig.visualKit.plateCarrier.visible,armor==='armor-carrier');
  assert.equal(rig.visualKit.chestRig.visible,chestRig==='rig-light');
  assert.equal(rig.visualKit.fieldWebbing.visible,chestRig==='rig-full');
  assert.equal(rig.visualKit.dayPack.visible,bag==='backpack-day');
  assert.equal(rig.visualKit.fieldPack.visible,bag==='backpack-field');
  assert.equal(rig.pack.visible,bag!=='backpack-none');
  const depth=rig.visualKit.chestRig.position.x;
  assert.equal(depth,armor==='armor-carrier'?1.95:
   armor==='armor-soft'?1.15:0);
 }
 rig.dispose();
});
