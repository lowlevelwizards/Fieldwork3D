import {buildAuthoredPack} from '../src/operator-backpack-art.ts';
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
 const day=new THREE.Box3().setFromObject(buildAuthoredPack('day-pack',v.packPreview.materials).root).getSize(new THREE.Vector3());
 const field=new THREE.Box3().setFromObject(buildAuthoredPack('field-pack',v.packPreview.materials).root).getSize(new THREE.Vector3());
 assert.ok(field.y>day.y);
 assert.ok(field.z>day.z+2);
 // Legacy jacket/shirt and helmet handles are empty; measure reviewed art.
 const j=extent(rig.root,v.newUpper.cuts['smock-jacket'].torso);
 const shirt=extent(rig.root,v.newUpper.cuts['combat-shirt'].torso);
 assert.ok(j.length()>0&&shirt.length()>0);
 assert.ok(j.distanceTo(shirt)>.05,'authored upper silhouettes differ');
 const helm=extent(rig.root,v.wardrobeHead.headwear.ach);
 const cap=extent(rig.root,v.wardrobeHead.headwear['patrol-cap']);
 assert.ok(helm.length()>0&&cap.length()>0);
 assert.ok(helm.distanceTo(cap)>.05,'authored headwear silhouettes differ');
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
  assert.equal(rig.visualKit.packPreview.active?.style,bag==='backpack-day'?'day-pack':bag==='backpack-field'?'field-pack':undefined);
  assert.equal(rig.pack.visible,bag!=='backpack-none');
  assert.equal(!!rig.visualKit.packPreview.active?.root.visible,bag!=='backpack-none');
  const depth=rig.visualKit.chestRig.position.x;
  assert.equal(depth,armor==='armor-carrier'?1.95:
   armor==='armor-soft'?1.15:0);
 }
 rig.dispose();
});
