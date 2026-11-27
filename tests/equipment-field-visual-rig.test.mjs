import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {replaceFieldQuantity,moveFieldStack} from '../src/equipment-field-inventory.ts';
const pose=(kit,flashCharges)=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment:kit,flashCharges
});
const count=rig=>rig.flashCanisters.filter(x=>x.visible).length;
test('actual operator rig shows one, four, then zero finite flash canisters',()=>{
 const rig=createOperatorRig('rook','blue');
 try{
  const base=initialEquipmentLoadout();
  poseOperator(rig,pose(base,1),0);
  assert.equal(rig.flashCanisters.length,1,
   'normal one-flash operators retain their original cold rig geometry');
  assert.equal(count(rig),1);
  const stacked={...base,fieldInventory:
   replaceFieldQuantity(base.fieldInventory,'flashbang',4)};
  poseOperator(rig,pose(stacked,4),0);
  assert.equal(rig.flashCanisters.length,4);
  assert.equal(count(rig),4);
  poseOperator(rig,pose(stacked,2),0);
  assert.equal(count(rig),2,'throwing spent two physical canisters');
  poseOperator(rig,pose(stacked,0),0);
  assert.equal(count(rig),0,'empty device stock no longer remains on rig');
 }finally{rig.dispose();}
});
test('field canisters attach to the correct bones without creating a new rig',()=>{
 const rig=createOperatorRig('moss','blue');
 try{
  const base=initialEquipmentLoadout();
  const four=replaceFieldQuantity(base.fieldInventory,'flashbang',4);
  const backpack={...base,fieldInventory:
   moveFieldStack(four,'flashbang','rig','backpack')};
  poseOperator(rig,pose(backpack,4),0);
  assert.equal(count(rig),0,'internal cargo is concealed in a closed backpack');
  assert.ok(rig.flashCanisters.every(x=>x.parent===rig.pack));
  rig.root.userData.fieldworkInspectPackCargo=true;
  poseOperator(rig,pose(backpack,4),0);
  assert.equal(count(rig),4,'explicit inspection reveals real owned cargo');
  rig.root.userData.fieldworkInspectPackCargo=false;
  assert.ok(rig.flashCanisters.every(x=>x.parent===rig.pack));
  const belt={...base,fieldInventory:
   moveFieldStack(four,'flashbang','rig','belt')};
  poseOperator(rig,pose(belt,4),0);
  assert.ok(rig.flashCanisters.every(x=>x.parent===rig.hip));
  assert.ok(rig.flashCanisters.every(x=>Array.isArray(x.userData.fieldworkBeltFlashRest)));
  assert.equal(rig.hip.children.filter(x=>x.name.startsWith('issued-belt-grenade-pouch-')&&x.visible).length,4);
  assert.equal(rig.flashCanisters[0],rig.flashCanister);
 }finally{rig.dispose();}
});
test('legacy smoke rendering never turns into a bundle of phantom flashes',()=>{
 const rig=createOperatorRig('ash','blue');
 try{
  const base=initialEquipmentLoadout();
  const legacy={version:1,slots:{...base.slots,tactical:'tactical-smoke'}};
  poseOperator(rig,pose(legacy,0),0);
  assert.equal(count(rig),1);
  assert.equal(rig.equipmentDetails.smokeHardware.visible,true);
  assert.equal(rig.equipmentDetails.flashHardware.visible,false);
 }finally{rig.dispose();}
});

test('physical wedges reflect the wedge utility and live consumption',async()=>{
 const {setEquipmentChoice}=await import('../src/equipment-loadouts.ts');
 const rig=createOperatorRig('rook','blue');
 try{
  const equipped=setEquipmentChoice(initialEquipmentLoadout(),'utility','utility-wedge');
  poseOperator(rig,{...pose(equipped,1),wedgeRemaining:2},0);
  assert.equal(rig.wedgeMeshes.length,2);
  assert.equal(rig.wedgeMeshes.filter(x=>x.visible).length,2);
  assert.equal(rig.equipmentDetails.tools['utility-wedge'].visible,false,
   'do not double-render decorative two-wedge package');
  poseOperator(rig,{...pose(equipped,1),wedgeRemaining:1},0);
  assert.equal(rig.wedgeMeshes.filter(x=>x.visible).length,1);
  poseOperator(rig,{...pose(equipped,1),wedgeRemaining:0},0);
  assert.equal(rig.wedgeMeshes.filter(x=>x.visible).length,0);
  const moved={...equipped,fieldInventory:
   moveFieldStack(equipped.fieldInventory,'wedge','belt','backpack')};
  poseOperator(rig,{...pose(moved,1),wedgeRemaining:2},0);
  assert.ok(rig.wedgeMeshes.slice(0,2).every(x=>x.parent===rig.pack));
 }finally{rig.dispose();}
});
test('ordinary operator models allocate no physical wedge meshes',()=>{
 const rig=createOperatorRig('vale','blue');
 try{
  poseOperator(rig,{...pose(initialEquipmentLoadout(),1),wedgeRemaining:0},0);
  assert.equal(rig.wedgeMeshes.length,0);
 }finally{rig.dispose();}
});

test('fitted flash mounting never floats on a missing chest rig',async()=>{
 const {setEquipmentChoice}=await import('../src/equipment-loadouts.ts');
 const {initialWardrobe}=await import('../src/operator-wardrobe-data.ts');
 const {equipmentExterior}=await import('../src/operator-equipment-exterior.ts');
 const {fittedFlashCanisterSocket}=await import('../src/equipment-field-visuals.ts');
 const fit=equipmentExterior('armor-bare','no-rig','bdu-shirt');
 assert.equal(fittedFlashCanisterSocket('rig',0,fit,false,false,false),null);
 assert.equal(fittedFlashCanisterSocket('rig',0,fit,false,true,false).bone,'hip');
 for(const [a,r,t] of [['armor-bare','light-rig','bdu-shirt'],['plate-heavy','full-chest','gorka-jacket']]){
  const f=equipmentExterior(a,r,t),s=fittedFlashCanisterSocket('rig',0,f,true,true,false);
  assert.ok(s.x-1.25<=Math.max(...[-1.8,0,1.8].flatMap(dy=>[-.8,0,.8].map(dz=>f.front(s.y+dy,s.z+dz)))));
 }
 const rig=createOperatorRig('flash-fit','blue');
 try{
  const base=initialEquipmentLoadout(),kit=setEquipmentChoice(base,'rig','rig-none'),w=initialWardrobe();
  const wardrobe={...w,styles:{...w.styles,armorStyle:'armor-bare',rigStyle:'no-rig',beltStyle:'no-belt',top:'bdu-shirt'}};
  const noBelt=setEquipmentChoice(kit,'belt','belt-none');
  poseOperator(rig,{...pose(noBelt,1),wardrobe},0);
  assert.equal(count(rig),0);
  poseOperator(rig,{...pose(kit,1),wardrobe:{...wardrobe,styles:{...wardrobe.styles,beltStyle:'duty-belt'}}},0);
  assert.equal(count(rig),1);assert.equal(rig.flashCanister.parent,rig.hip);
 }finally{rig.dispose();}
});
