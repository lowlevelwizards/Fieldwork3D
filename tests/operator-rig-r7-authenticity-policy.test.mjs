import test from 'node:test';
import assert from 'node:assert/strict';
import {WARDROBE_ITEMS,initialWardrobe,
 setWardrobeFabricSolid} from '../src/operator-wardrobe-data.ts';
import {HEADWEAR_CAMO_IDS} from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_POLICY,fabricCamoCompatible,fabricCamoChoices}
 from '../src/operator-fabric-camo-policy.ts';
import {GARMENT_SOLID_COLORS} from '../src/operator-garment-color-policy.ts';
import {
 RIG_VISUAL_TEXTILES,ARMOR_VISUAL_TEXTILES,rigSignature,
 assessRigArmor,validRigSolid,validArmorPrint
} from '../src/operator-rig-authenticity-policy.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';

const rigs=WARDROBE_ITEMS.filter(x=>x.slot==='rigStyle'&&x.id!=='no-rig')
 .map(x=>x.id);
const armors=WARDROBE_ITEMS.filter(x=>x.slot==='armorStyle'&&x.id!=='armor-bare')
 .map(x=>x.id);
const outfit=(rig,armor)=>({rigStyle:rig,armorStyle:armor,
 top:'bdu-shirt',trousers:'bdu-trousers',packStyle:'no-pack'});

test('R7 all ten rigs and seven wearable armor cuts define known unique defaults',()=>{
 assert.equal(rigs.length,10);assert.equal(armors.length,8);
 for(const rig of rigs){
  const policy=RIG_VISUAL_TEXTILES[rig];
  assert.ok(policy,'missing policy: '+rig);
  assert.ok(policy.solids.includes(policy.signature.solid));
  assert.ok(GARMENT_SOLID_COLORS[policy.signature.solid]);
  assert.ok(policy.rationale.length>=25);
  if(policy.signature.print)assert.ok(policy.prints.includes(policy.signature.print));
  assert.equal(new Set(policy.solids).size,policy.solids.length);
  assert.equal(new Set(policy.prints).size,policy.prints.length);
 }
 for(const armor of armors){
  const policy=ARMOR_VISUAL_TEXTILES[armor];
  assert.ok(policy,'missing armor policy: '+armor);
  assert.ok(policy.solids.includes(policy.signature.solid));
 }
 assert.equal(rigSignature('sadf-webbing').solid,'nutria-brown');
 assert.equal(rigSignature('lbv').print,'m81-woodland');
 assert.equal(rigSignature('field-webbing').print,'woodland-dpm');
 assert.equal(RIG_VISUAL_TEXTILES['chicom-rig'].prints.length,0);
 assert.equal(RIG_VISUAL_TEXTILES['sadf-webbing'].prints.length,0);
});
test('R7 camouflage choices check 10 rig x 8 armor vs all approved patterns',()=>{
 for(const rig of rigs)
  for(const armor of armors){
   const o=outfit(rig,armor);
   for(const channel of ['gear','armor']){
    const actual=fabricCamoChoices(channel,o);
    for(const id of HEADWEAR_CAMO_IDS){
     const specific=(channel==='gear'?RIG_VISUAL_TEXTILES[rig]:
      ARMOR_VISUAL_TEXTILES[armor]).prints.includes(id);
     const allowed=specific&&FABRIC_CAMO_POLICY[id].channels.includes(channel);
     assert.equal(fabricCamoCompatible(id,channel,o),allowed,
      rig+'/'+armor+'/'+channel+'/'+id+' policy mismatch');
     assert.equal(actual.includes(id),allowed);
    }
   }
  }
 assert.equal(validArmorPrint('soft-slick','multicam'),false);
 assert.equal(fabricCamoCompatible('woodland-dpm','gear',
  outfit('field-webbing','armor-bare')),true);
 assert.equal(fabricCamoCompatible('woodland-dpm','gear',
  outfit('chicom-rig','armor-bare')),false);
});
test('R7 modern carrier mounting needs an actual receiver and convertible rig',()=>{
 for(const rig of rigs)
  for(const armor of [...armors,'armor-bare','soft-paca']){
   const a=assessRigArmor(rig,armor);
   const plate=['plate-jpc','plate-standard','plate-heavy'].includes(armor);
   const convertible=['micro-rig','chest-placard'].includes(rig);
   assert.equal(a.mode==='plate-placard',plate&&convertible,
    rig+'/'+armor+' cannot invent quick-attach carrier');
   assert.ok(['usual','possible','caution'].includes(a.fit));
  }
 assert.equal(assessRigArmor('sadf-webbing','plate-heavy').fit,'caution');
});
test('R7 solids validate the specific model without silently deleting saved looks',()=>{
 let w=initialWardrobe();
 const p83=outfit('sadf-webbing','armor-bare');
 w=setWardrobeFabricSolid(w,'gear','nutria-brown',p83);
 assert.equal(w.fabricSolids.gear,'nutria-brown');
 const unchanged=setWardrobeFabricSolid(w,'gear','black',p83);
 assert.equal(unchanged,w,'unverified black P83 rejected');
 const modern=setWardrobeFabricSolid(w,'gear','black',
  outfit('micro-rig','armor-bare'));
 assert.equal(modern.fabricSolids.gear,'black');
 assert.ok(validRigSolid('micro-rig','black'));
 // The shared gear channel also covers belts when NO chest rig is present.
 const belt=setWardrobeFabricSolid(w,'gear','black',
  outfit('no-rig','armor-bare'));
 assert.equal(belt.fabricSolids.gear,'black','no-rig belt swatches remain usable');
});
function pose(r,rig){
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor','armor-none');
 equipment=setEquipmentChoice(equipment,'rig',
  ['field-webbing','sadf-webbing','lbv','split-front','full-chest'].includes(rig)?
   'rig-full':'rig-light');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment,wardrobe:{...initialWardrobe(),styles:{
   top:'combat-shirt',trousers:'bdu-trousers',armorStyle:'armor-bare',
   rigStyle:rig,headwear:'bare',beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
}
test('R7 signature appearance is a real rig material and changes with selection',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  pose(r,'chicom-rig');
  const color=r.colors.get(r.gearMaterial);
  assert.ok(color);
  assert.ok(Math.abs(color.getHex()-GARMENT_SOLID_COLORS['field-green'].hex)<2,
   'historical canvas has an actual signature material');
  pose(r,'sadf-webbing');
  const c=r.colors.get(r.gearMaterial);
  assert.equal(c.getHex(),GARMENT_SOLID_COLORS['nutria-brown'].hex);
 }finally{r.dispose();}
});
