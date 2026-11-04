import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe,WARDROBE_ITEMS} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {GARMENT_SOLID_COLORS} from '../src/operator-garment-color-policy.ts';
import {RIG_COLOR_ASSEMBLY,rigColorAssembly,RIG_VISUAL_TEXTILES}
 from '../src/operator-rig-authenticity-policy.ts';
const rigIDs=WARDROBE_ITEMS.filter(x=>x.slot==='rigStyle'&&x.id!=='no-rig')
 .map(x=>x.id);
const full=new Set(['split-front','full-chest','lbv','sadf-webbing','field-webbing']);
function dress(r,rig,wardrobe={}){
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor','armor-none');
 equipment=setEquipmentChoice(equipment,'rig',full.has(rig)?'rig-full':'rig-light');
 const initial=initialWardrobe();
 const look={...initial,...wardrobe,styles:{...initial.styles,
  top:'bdu-shirt',trousers:'bdu-trousers',headwear:'bare',
  armorStyle:'armor-bare',rigStyle:rig,
  packStyle:'no-pack',beltStyle:'no-belt',...wardrobe.styles}};
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment,wardrobe:look},0);
 const gear=r.visualKit.wardrobeGear;
 return {body:r.colors.get(r.gearMaterial),
  pouches:r.colors.get(gear.pouchMaterial),
  straps:r.colors.get(gear.strapMaterial),
  group:gear.rig[rig],
  material:gear};
}
const hex=id=>GARMENT_SOLID_COLORS[id].hex;
test('R10 all ten rigs have an explicit authentic coupled or modular textile assembly',()=>{
 assert.deepEqual(new Set(rigIDs),
  new Set(Object.keys(RIG_COLOR_ASSEMBLY).filter(x=>x!=='no-rig'&&x!=='belt-harness')));
 for(const id of rigIDs){
  const p=rigColorAssembly(id);
  assert.ok(p&&RIG_VISUAL_TEXTILES[id]);
  assert.ok(['match','solid-when-printed'].includes(p.webbing));
 }
 for(const id of ['chicom-rig','light-rig','lbv','sadf-webbing','bandolier'])
  assert.deepEqual([rigColorAssembly(id).detachablePouches,
   rigColorAssembly(id).replaceableHarness],[false,false],id+' sewn gear');
 for(const id of ['micro-rig','chest-placard','split-front','field-webbing'])
  assert.deepEqual([rigColorAssembly(id).detachablePouches,
   rigColorAssembly(id).replaceableHarness],[true,true],id+' actual detachable gear');
});
test('R10 changing a fixed sewn rig solid recolors BOTH pouches and webbing',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  for(const [rig,solid] of [['chicom-rig','tan'],['light-rig','coyote'],
   ['lbv','olive-drab'],['sadf-webbing','nutria-brown']]){
   const d=dress(r,rig,{fabricSolids:{gear:solid},
    // Previously saved advanced OD/black cannot silently override sewn kit.
    pouchSolid:'olive-drab',strapSolid:'black'});
   assert.equal(d.body.getHex(),hex(solid),rig+' body');
   assert.equal(d.pouches.getHex(),hex(solid),rig+' linked pouch');
   assert.equal(d.straps.getHex(),hex(solid),rig+' linked strap');
   const mats=new Set();d.group.traverse(o=>{
    if(o instanceof THREE.Mesh)mats.add(o.material);
   });
   assert.ok(mats.has(d.pouches&&d.material.pouchMaterial),
    rig+' uses the real recolorable pouch textile');
   assert.ok(mats.has(d.material.strapMaterial),
    rig+' has actually recolorable fitted webbing');
  }
 }finally{r.dispose();}
});
test('R10 modular pouches and harness can independently override; auto restores together',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  const rig='split-front';
  const selected=dress(r,rig,{fabricSolids:{gear:'black'},
   pouchSolid:'coyote',strapSolid:'tan'});
  assert.equal(selected.body.getHex(),hex('black'));
  assert.equal(selected.pouches.getHex(),hex('coyote'));
  assert.equal(selected.straps.getHex(),hex('tan'));
  const auto=dress(r,rig,{fabricSolids:{gear:'black'}});
  assert.equal(auto.body.getHex(),hex('black'));
  assert.equal(auto.pouches.getHex(),hex('black'));
  assert.equal(auto.straps.getHex(),hex('black'));
  assert.equal(auto.pouches, r.colors.get(r.visualKit.wardrobeGear.pouchMaterial));
  const printed=dress(r,'lbv');
  assert.equal(printed.body.getHex(),0xffffff,'M81 rig printed material');
  assert.equal(printed.pouches.getHex(),0xffffff,'sewn pouch retains M81 print');
  assert.equal(printed.material.pouchMaterial.map,
   r.gearMaterial.map,'sewn pouch shares physical camo artwork');
  assert.notEqual(printed.material.strapMaterial.map,
   r.gearMaterial.map,'LBV plain nylon yoke remains period-correct');
 }finally{r.dispose();}
});
