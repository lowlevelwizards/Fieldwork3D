import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {ARMOR_FIT_TOPS} from '../src/operator-uniform-fit-envelope.ts';
import {armorAttachmentFrame}
 from '../src/operator-armor-attachment-frame.ts';
import {createArmorFitDebug,disposeArmorFitDebug}
 from '../src/operator-armor-fit-debug.ts';

const armors=['soft-slick','soft-vest','soft-flak','plate-slick',
 'plate-jpc','plate-standard','plate-heavy','plate-legacy'];
const rigs=['micro-rig','light-rig','chest-placard','split-front',
 'lbv','full-chest','chicom-rig','field-webbing','sadf-webbing'];
const pose=(r,top,armor,rig)=>{
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor',armor.startsWith('plate-')?
  'armor-carrier':'armor-soft');
 kit=setEquipmentChoice(kit,'rig',
  ['micro-rig','light-rig','chest-placard','chicom-rig'].includes(rig)?
   'rig-light':'rig-full');
 poseOperator(r,{
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
  injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  unarmedPreview:true,equipment:kit,
  wardrobe:{...initialWardrobe(),styles:{
   top,trousers:'bdu-trousers',headwear:'bare',armorStyle:armor,
   rigStyle:rig,beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
 return kit;
};
test('Lab debug validates all 40 combinations using true armor inner-face clearance',()=>{
 for(const top of ARMOR_FIT_TOPS)for(const armor of armors){
  const check=createArmorFitDebug(armor,top);
  assert.deepEqual(check.warnings,[],armor+' over '+top+': '+check.status);
  assert.ok(check.group.children.length>2,armor+' has visible debug anchors');
  assert.ok(check.status.includes('FIT')||check.status.includes('CONCEALED'));
  if(armor!=='soft-slick'){
   assert.ok(check.clearance.front>=.12);
   assert.ok(check.clearance.back>=.12);
   assert.ok(check.clearance.side>=.12);
  }
  disposeArmorFitDebug(check.group);
 }
});
test('all load-bearing rig harnesses route to selected armor shoulder and are cached',()=>{
 const r=createOperatorRig('rook','blue');
 const styles=['micro-rig','light-rig','chest-placard','split-front',
  'lbv','full-chest','chicom-rig','field-webbing','sadf-webbing'];
 for(const top of ARMOR_FIT_TOPS)for(const style of styles){
  pose(r,top,'plate-standard',style);
  const rig=r.visualKit.wardrobeGear.rig[style];
  const harness=rig.getObjectByName('uniform-fitted-rig-harness');
  assert.ok(harness,style+' exposes mutable harness');
  const frame=armorAttachmentFrame('plate-standard',top);
  assert.ok(frame.shoulderY>=6.8,'actual garment is cleared');
  assert.ok(harness.children.length>0,style+' has a fitted strap route');
  const uuid=harness.children.map(c=>c.uuid);
  pose(r,top,'plate-standard',style);
  assert.deepEqual(harness.children.map(c=>c.uuid),uuid,
   style+' '+top+' does not recreate straps each pose');
  assert.equal(rig.position.x,frame.rigShiftX);
 }
 // Switching to thicker armor must change the fitted rig harness route,
 // while the pouch shapes and equipment ledger stay unchanged.
 pose(r,'combat-shirt','plate-slick','micro-rig');
 const harness=r.visualKit.wardrobeGear.rig['micro-rig']
  .getObjectByName('uniform-fitted-rig-harness');
 const before=harness.children.map(c=>c.uuid);
 pose(r,'gorka-jacket','plate-heavy','micro-rig');
 assert.notDeepEqual(harness.children.map(c=>c.uuid),before,
  'full armor/top change refreshes strap routes');
 r.dispose();
});
