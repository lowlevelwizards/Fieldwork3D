import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {presentFlashHandoff} from '../src/breach-operator-field-handoff.ts';
import {visibleFlashCanisters,flashCanisterSocket}
 from '../src/equipment-field-visuals.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';

const kit=()=>({...initialEquipmentLoadout('carbine'),fieldInventory:{version:1,
 stacks:[{itemId:'flashbang',quantity:1,location:'rig'},
 {itemId:'flashbang',quantity:1,location:'backpack'}]}});
const make=()=>{
 const root=new THREE.Group(),chest=new THREE.Group(),
  hip=new THREE.Group(),pack=new THREE.Group(),hand=new THREE.Group();
 const meshes=[new THREE.Mesh(),new THREE.Mesh()];
 meshes.forEach(mesh=>hip.add(mesh));
 return {root,chest,hip,pack,arms:[{hand}],
  flashCanisters:meshes};
};
const pose=(progress=.65)=>({
 equipment:kit(),flashCharges:2,
 equipmentInteraction:{item:'flashbang',location:'rig',
  elapsed:progress*.3,duration:.3,progress}
});
test('F6.2: retrieve same mesh from real location, then restore on cancellation',()=>{
 const r=make(),p=pose();
 const first=r.flashCanisters[0],second=r.flashCanisters[1];
 presentFlashHandoff(r,p,true);
 assert.equal(first.parent,r.arms[0].hand);
 assert.equal(second.parent,r.hip);
 assert.equal(r.root.userData.fieldworkHeldFlashIndex,0);
 presentFlashHandoff(r,{...p,equipmentInteraction:null},false);
 assert.equal(first.parent,r.chest);
 assert.equal(first.visible,true);
 const socket=flashCanisterSocket('rig',0);
 assert.deepEqual(first.position.toArray(),[socket.x,socket.y,socket.z]);
 assert.equal(r.root.userData.fieldworkHeldFlashIndex,null);
 assert.equal(p.flashCharges,2,'the renderer never spends ammo');
});
test('F6.2: reaches only real pouch and only after contact phase',()=>{
 const r=make(),p=pose(.20);
 presentFlashHandoff(r,p,true);
 assert.equal(r.root.userData.fieldworkHeldFlashIndex,undefined,
  'idle fast path never writes when no item is held');
 assert.equal(r.flashCanisters[0].parent,r.hip);
 const backpack={...p,equipmentInteraction:{...p.equipmentInteraction,
  location:'backpack',progress:.62}};
 presentFlashHandoff(r,backpack,true);
 assert.equal(r.root.userData.fieldworkHeldFlashIndex,1);
 assert.equal(r.flashCanisters[1].parent,r.arms[0].hand);
 presentFlashHandoff(r,backpack,false);
 assert.equal(r.flashCanisters[1].parent,r.pack);
});
test('F6.2: successful GO removes spent source; never restores a phantom',()=>{
 const r=make(),p=pose(.70);
 presentFlashHandoff(r,p,true);
 const remaining={...p,flashCharges:1,
  equipment:{...p.equipment,fieldInventory:{version:1,stacks:[
   {itemId:'flashbang',quantity:1,location:'backpack'}]}},
  equipmentInteraction:null};
 presentFlashHandoff(r,remaining,false);
 assert.equal(r.flashCanisters[0].parent,r.pack);
 assert.deepEqual(visibleFlashCanisters(remaining.equipment,remaining.flashCharges),
  [{location:'backpack',index:0}]);
 assert.equal(r.flashCanisters[1].visible,true,
  'a second mesh is reconciled by the normal appearance update');
 assert.equal(r.flashCanisters[0].visible,true);
 assert.equal(r.root.userData.fieldworkHeldFlashIndex,null);
});
test('F6.2: actual operator frame can seek backwards without a second IK pass',()=>{
 const r=createOperatorRig('f6-actual','blue',true);
 const base={x:0,z:0,heading:0,velocity:0,seconds:2,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1,
  lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  poseV3Preview:true,poseV4ReloadPreview:true,poseDiagnostics:false,
  equipment:kit(),flashCharges:2};
 try{
  const active={...base,equipmentInteraction:pose(.65).equipmentInteraction};
  poseOperator(r,active,0);
  assert.equal(r.flashCanisters[0].parent,r.arms[0].hand);
  poseOperator(r,{...base,seconds:1,equipmentInteraction:null},0);
  assert.equal(r.flashCanisters[0].parent,r.chest);
  poseOperator(r,active,0);
  assert.equal(r.flashCanisters[0].parent,r.arms[0].hand);
  assert.equal(base.flashCharges,2);
 }finally{r.dispose();}
});

test('BP13 closed pack cargo returns concealed after cancellation and rewind',()=>{
 const r=make(),p={...pose(),equipmentInteraction:{...pose().equipmentInteraction,location:'backpack'}};
 r.root.userData.fieldworkConcealPackCargo=true;
 const mesh=r.flashCanisters[1];
 presentFlashHandoff(r,p,true);
 assert.equal(mesh.parent,r.arms[0].hand);assert.equal(mesh.visible,true);
 presentFlashHandoff(r,{...p,equipmentInteraction:null},false);
 assert.equal(mesh.parent,r.pack);assert.equal(mesh.visible,false);
 presentFlashHandoff(r,p,true);assert.equal(mesh.visible,true);
 r.root.userData.fieldworkConcealPackCargo=false;
 presentFlashHandoff(r,p,false);assert.equal(mesh.visible,true);
});
