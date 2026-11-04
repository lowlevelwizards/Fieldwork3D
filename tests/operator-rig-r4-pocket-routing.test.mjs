import test from 'node:test';
import assert from 'node:assert/strict';
import {rigContactFrame,RIG_PANEL_INNER_FACES}
 from '../src/operator-rig-contact-frame.ts';
import {rigGarmentFrontClearance,RIG_FRONT_SPANS}
 from '../src/operator-rig-garment-relief.ts';
import {ARMOR_FIT_TOPS,uniformFitEnvelope}
 from '../src/operator-uniform-fit-envelope.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';

const RIGS=['chest-placard','micro-rig','light-rig','chicom-rig',
 'bandolier','split-front','full-chest','lbv','field-webbing',
 'sadf-webbing'];
test('R4-A: pocket protrusions are measured at their real authored outer faces',()=>{
 assert.ok(rigGarmentFrontClearance('bdu-shirt','micro-rig',5)>6.46);
 assert.ok(rigGarmentFrontClearance('acu-shirt','micro-rig',5)>6.26);
 assert.ok(rigGarmentFrontClearance('smock-jacket','full-chest',5.59)>6.74);
 assert.ok(rigGarmentFrontClearance('gorka-jacket','full-chest',5.72)>6.76);
 assert.equal(rigGarmentFrontClearance('combat-shirt','micro-rig',5.11),5.11);
 // A pocket outside the actual rig footprint must NOT push all designs out.
 assert.equal(rigGarmentFrontClearance('smock-jacket','micro-rig',5.59),5.59);
 assert.equal(Object.keys(RIG_FRONT_SPANS).length,11);
});
test('R4-A: all exterior harnesses clear garment pockets, shoulders and sides',()=>{
 for(const top of ARMOR_FIT_TOPS)
  for(const rig of RIGS){
   for(const armor of ['armor-bare','soft-slick','plate-jpc','plate-heavy']){
    const f=rigContactFrame(armor,top,rig);
    const jacket=uniformFitEnvelope(top);
    assert.ok(f.shoulderY>=jacket.shoulderCrown+.39,
     rig+'/'+top+'/'+armor+' shoulder cap');
    assert.ok(f.sideRight.z-f.sideContact>=.49,
     rig+'/'+top+'/'+armor+' whole flank strap thickness');
    if(armor==='armor-bare'||armor==='soft-slick')
     assert.ok(f.front.x>=rigGarmentFrontClearance(top,rig,
      top==='combat-shirt'?5.11:top==='smock-jacket'?5.59:
      top==='gorka-jacket'?5.725:5),
      rig+'/'+top+' pocket clearance');
    if(rig==='field-webbing')assert.equal(f.rigShiftX,0);
    else assert.ok(Math.abs(f.rigShiftX+RIG_PANEL_INNER_FACES[rig]-
     f.front.x-.14)<.001,rig+'/'+top+'/'+armor+' actual inner face');
   }
  }
});
function equip(r,top,armor,rig){
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor',armor==='armor-bare'?
  'armor-none':armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-full');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  unarmedPreview:true,equipment,
  wardrobe:{...initialWardrobe(),styles:{top,
   trousers:'bdu-trousers',headwear:'bare',armorStyle:armor,
   rigStyle:rig,beltStyle:'no-belt',packStyle:'no-pack'}}
 },0);
}
test('R4-B: thick front, rear and side harness routes are stable on outfit changes',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  for(const [top,armor,rig] of [
   ['bdu-shirt','armor-bare','micro-rig'],
   ['smock-jacket','armor-bare','full-chest'],
   ['gorka-jacket','plate-heavy','lbv'],
   ['acu-shirt','plate-jpc','chest-placard'],
   ['bdu-shirt','armor-bare','light-rig'],
   ['combat-shirt','armor-bare','bandolier'],
   ['smock-jacket','armor-bare','field-webbing'],
   ['gorka-jacket','armor-bare','sadf-webbing'],
   ['bdu-shirt','armor-bare','split-front']
  ]){
   equip(r,top,armor,rig);
   const group=r.visualKit.wardrobeGear.rig[rig];
   const h=group.getObjectByName('uniform-fitted-rig-harness');
   assert.ok(h&&h.children.length>0,rig+' has fitted harness');
   const before=h.children.map(x=>x.uuid);
   equip(r,top,armor,rig);
   assert.deepEqual(h.children.map(x=>x.uuid),before,
    rig+' deterministic memoized geometry');
  }
 }finally{r.dispose();}
});
