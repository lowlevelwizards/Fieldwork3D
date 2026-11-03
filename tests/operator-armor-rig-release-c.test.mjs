import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {initialWardrobe,readWardrobe,resolvedWardrobe}
 from '../src/operator-wardrobe-data.ts';
import {resolveAutomaticGearColors}
 from '../src/operator-gear-color-policy.ts';
import {GARMENT_SOLID_COLORS,CAMO_CUFF_DEFAULTS,garmentSolidHex}
 from '../src/operator-garment-color-policy.ts';
import {WARDROBE_RECIPES,applyWardrobeRecipe,wardrobeRecipe}
 from '../src/operator-wardrobe-recipes.ts';
const setup=(r,top='bdu-shirt',print='m81-woodland',extras={})=>{
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor','armor-carrier');
 kit=setEquipmentChoice(kit,'rig','rig-light');
 const wardrobe={...initialWardrobe(),styles:{
  top,trousers:'bdu-trousers',armorStyle:'plate-standard',rigStyle:'micro-rig'},
  fabricCamo:print?{top:print}:{},...extras};
 poseOperator(r,{
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
  injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment:kit,wardrobe
 },0);
};
test('all 30 approved prints resolve to valid deterministic neutral gear swatches',()=>{
 for(const id of Object.keys(CAMO_CUFF_DEFAULTS)){
  const a=resolveAutomaticGearColors({print:id});
  const b=resolveAutomaticGearColors({print:id});
  assert.deepEqual(a,b,id+' pairing stable');
  for(const channel of ['armor','gear','pack'])
   assert.ok(a[channel] in GARMENT_SOLID_COLORS,id+' '+channel);
 }
 assert.equal(resolveAutomaticGearColors({print:'woodland-marpat'}).armor,'coyote');
 assert.equal(resolveAutomaticGearColors({print:'multicam'}).gear,'coyote');
 assert.equal(resolveAutomaticGearColors({print:'ucp'}).armor,'foliage');
 assert.equal(resolveAutomaticGearColors({solid:'black'}).gear,'black');
});
test('armor, rig and pack auto match top while explicit materials remain independent',()=>{
 const r=createOperatorRig('rook','blue');
 setup(r,'bdu-shirt','m81-woodland');
 assert.equal(r.vestMaterial.color.getHex(),garmentSolidHex('olive-drab'));
 assert.equal(r.gearMaterial.color.getHex(),garmentSolidHex('ranger-green'));
 assert.equal(r.packMaterial.color.getHex(),garmentSolidHex('olive-drab'));
 setup(r,'combat-shirt','multicam');
 assert.equal(r.vestMaterial.color.getHex(),garmentSolidHex('coyote'));
 assert.equal(r.gearMaterial.color.getHex(),garmentSolidHex('coyote'));
 setup(r,'combat-shirt','multicam',{
  fabricSolids:{armor:'black',gear:'khaki',pack:'forest-green'}
 });
 assert.equal(r.vestMaterial.color.getHex(),garmentSolidHex('black'));
 assert.equal(r.gearMaterial.color.getHex(),garmentSolidHex('khaki'));
 assert.equal(r.packMaterial.color.getHex(),garmentSolidHex('forest-green'));
 r.dispose();
});
test('pouch fabric inherits rig camo and supports optional pouch-only solid',()=>{
 const r=createOperatorRig('rook','blue');
 setup(r,'combat-shirt','multicam',{fabricCamo:{
  top:'multicam',gear:'multicam'
 }});
 const pouch=r.visualKit.wardrobeGear.pouchMaterial;
 assert.equal(pouch.map,r.gearMaterial.map,
  'default pouches inherit the same authored gear print texture and cutting phase');
 assert.equal(pouch.color.getHex(),r.gearMaterial.color.getHex());
 setup(r,'combat-shirt','multicam',{fabricCamo:{
  top:'multicam',gear:'multicam'
 },pouchSolid:'black'});
 assert.equal(pouch.color.getHex(),garmentSolidHex('black'));
 assert.notEqual(pouch.map,r.gearMaterial.map,'solid pouch override does not change rig print');
 assert.ok(r.gearMaterial.map?.name.startsWith('Fieldwork cloth gear'));
 const saved=readWardrobe({...initialWardrobe(),pouchSolid:'black'});
 assert.equal(saved.pouchSolid,'black');
 assert.equal(readWardrobe({...initialWardrobe(),pouchSolid:'invalid'}).pouchSolid,undefined);
 r.dispose();
});
test('new full-role outfit recipes map to real valid armor and rig classes',()=>{
 const ids=['police-entry','legacy-infantry','recon-light',
  'irregular-canvas','bush-webbing'];
 for(const id of ids){
  const recipe=wardrobeRecipe(id);assert.ok(recipe,id+' registered');
  const result=applyWardrobeRecipe(recipe);
  const outfit=resolvedWardrobe(result.wardrobe,result.kit);
  assert.equal(outfit.armorStyle,recipe.styles.armorStyle,id+' armor');
  assert.equal(outfit.rigStyle,recipe.styles.rigStyle,id+' rig');
 }
 assert.ok(WARDROBE_RECIPES.length>=15);
});
