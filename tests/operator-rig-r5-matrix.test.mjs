import test from 'node:test';
import assert from 'node:assert/strict';
import {rigContactFrame,RIG_PANEL_INNER_FACES,RIG_MODULAR_ARMORS}
 from '../src/operator-rig-contact-frame.ts';
import {ARMOR_FIT_TOPS} from '../src/operator-uniform-fit-envelope.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';

const RIGS=['chest-placard','micro-rig','light-rig','chicom-rig','bandolier',
 'split-front','full-chest','lbv','field-webbing','sadf-webbing'];
const ARMORS=['armor-bare','soft-slick','soft-vest','soft-flak',
 'plate-slick','plate-jpc','plate-standard','plate-heavy','plate-legacy'];
function pose(r,top,armor,rig){
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor',armor==='armor-bare'?
  'armor-none':armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig',
  ['chest-placard','micro-rig','light-rig','chicom-rig','bandolier'].includes(rig)?
  'rig-light':'rig-full');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment,wardrobe:{...initialWardrobe(),styles:{
   top,trousers:'bdu-trousers',armorStyle:armor,rigStyle:rig,
   headwear:'bare',beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
}
test('RIG-E every named rig × real armor × uniform has finite actual exterior contact',()=>{
 let count=0;
 for(const top of ARMOR_FIT_TOPS)
  for(const armor of ARMORS)
   for(const rig of RIGS){
    const f=rigContactFrame(armor,top,rig);
    for(const x of [f.front.x,f.back.x,f.sideRight.z,
      f.shoulderY,f.shoulderRight.z,f.rigShiftX])
     assert.ok(Number.isFinite(x),top+'/'+armor+'/'+rig+' finite');
    assert.ok(f.front.x>f.back.x&&f.sideRight.z>0);
    if(rig==='field-webbing'){
     assert.equal(f.rigShiftX,0,'pelvis-mounted webbing is never translated as a front slab');
    }else{
     assert.ok(Math.abs(RIG_PANEL_INNER_FACES[rig]+f.rigShiftX-
      f.front.x-.14)<.001,top+'/'+armor+'/'+rig+' panel inner face');
    }
    const expected=['micro-rig','chest-placard'].includes(rig)&&
     RIG_MODULAR_ARMORS.has(armor)?
     'carrier-placard':'external-harness';
    assert.equal(f.mode,expected);
    count++;
   }
 assert.equal(count,ARMOR_FIT_TOPS.length*ARMORS.length*RIGS.length);
});
test('RIG-E selected worst-case mobile configurations retain one rig and stable geometry',()=>{
 const r=createOperatorRig('rook','blue');
 const pairs=[
  ['combat-shirt','armor-bare','micro-rig'],
  ['bdu-shirt','plate-standard','chest-placard'],
  ['acu-shirt','soft-flak','chicom-rig'],
  ['gorka-jacket','plate-heavy','full-chest'],
  ['smock-jacket','plate-legacy','sadf-webbing'],
  ['bdu-shirt','plate-jpc','light-rig'],
  ['bdu-shirt','plate-standard','field-webbing'],
  ['combat-shirt','soft-vest','split-front']
 ];
 for(const [top,armor,rig] of pairs){
  pose(r,top,armor,rig);
  const gear=r.visualKit.wardrobeGear;
  assert.equal(gear.armor[armor].visible,true);
  assert.equal(gear.rig[rig].visible,true);
  assert.equal(Object.values(gear.rig).filter(g=>g.visible).length,1);
  const harness=gear.rig[rig].getObjectByName('uniform-fitted-rig-harness');
  assert.ok(harness&&harness.children.length>0,rig+' harness');
  const before=harness.children.map(x=>x.uuid);
  pose(r,top,armor,rig);
  assert.deepEqual(harness.children.map(x=>x.uuid),before,
   top+'/'+armor+'/'+rig+' no unnecessary rebuilds');
  const hipBased=rig==='field-webbing'||rig==='sadf-webbing';
  if(hipBased)assert.equal(gear.waistRig[rig].parent,r.hip);
 }
 r.dispose();
});
