import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
import {selectWardrobeItem} from '../src/operator-wardrobe-unified.ts';
import {
 HEADWEAR_SOLID_COLORS,HEADWEAR_ALLOWED_SOLIDS,
 HEADWEAR_DEFAULT_SOLIDS,HEADWEAR_COLOR_MODEL_IDS,
 resolvedHeadwearSolid,headwearSolidHex,headwearColorChoices
} from '../src/operator-headwear-colors.ts';

const expected={
 'patrol-cap':['olive-drab','ranger-green','desert-tan','black','navy'],
 boonie:['olive-drab','ranger-green','desert-tan','coyote-brown','black','navy'],
 beanie:['black','navy','charcoal','olive-drab','coyote-brown','desert-tan','winter-white'],
 ach:['olive-drab','foliage-green','desert-tan','coyote-brown','black','navy'],
 'high-cut':['ranger-green','black','desert-tan','coyote-brown','urban-gray'],
 pasgt:['olive-drab','desert-tan','coyote-brown','black','navy'],
 'soviet-steel':['soviet-4bo','postwar-green']
};
const pose=(kit,wardrobe)=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 unarmedPreview:true,equipment:kit,wardrobe
});
test('seven headgear families offer only their approved solid colors',()=>{
 assert.deepEqual([...HEADWEAR_COLOR_MODEL_IDS].sort(),Object.keys(expected).sort());
 assert.equal(Object.keys(HEADWEAR_SOLID_COLORS).length,12);
 for(const id of HEADWEAR_COLOR_MODEL_IDS){
  assert.deepEqual(HEADWEAR_ALLOWED_SOLIDS[id],expected[id]);
  assert.equal(HEADWEAR_DEFAULT_SOLIDS[id],expected[id][0]);
  for(const c of expected[id]){
   assert.ok(Number.isInteger(HEADWEAR_SOLID_COLORS[c].hex));
   assert.equal(resolvedHeadwearSolid(id,c),c);
  }
  assert.equal(resolvedHeadwearSolid(id,'invalid'),expected[id][0]);
 }
 assert.deepEqual(headwearColorChoices('bare'),[]);
 assert.equal(headwearSolidHex('bare','black'),null);
 assert.equal(resolvedHeadwearSolid('soviet-steel','ranger-green'),'soviet-4bo');
 assert.equal(resolvedHeadwearSolid('high-cut','winter-white'),'ranger-green');
});

test('selected headwear swatches actually tint the material and survive look serialization',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const id of HEADWEAR_COLOR_MODEL_IDS){
  let {kit,wardrobe}=selectWardrobeItem(bareLabEquipment(),initialWardrobe(),'headwear',id);
  const requested=HEADWEAR_ALLOWED_SOLIDS[id].at(-1);
  wardrobe={...wardrobe,headwearColor:requested};
  const saved=readWardrobe(JSON.parse(JSON.stringify(wardrobe)));
  assert.equal(saved.headwearColor,requested);
  poseOperator(rig,pose(kit,saved),0);
  assert.equal(rig.visualKit.wardrobeHead.headwear[id].visible,true);
  assert.equal(rig.visualKit.wardrobeHead.headwearMaterials[id].color.getHex(),HEADWEAR_SOLID_COLORS[requested].hex,id);
  assert.ok(rig.visualKit.wardrobeHead.headwearMaterials[id].roughnessMap,id);
 }
 // Regression: the previous renderer applied the swatch, then the rig's
 // neutral material ledger silently restored the gray preview every frame.
 // Exercise repeated poses with the same mesh rather than only UI selection.
 const chosen=selectWardrobeItem(bareLabEquipment(),initialWardrobe(),'headwear','boonie');
 const mesh=rig.visualKit.wardrobeHead.headwearMaterials.boonie;
 const map=mesh.map,roughness=mesh.roughnessMap;
 for(const color of ['black','desert-tan','olive-drab','black']){
  const current={...chosen.wardrobe,headwearColor:color};
  poseOperator(rig,pose(chosen.kit,current),0);
  assert.equal(mesh.color.getHex(),HEADWEAR_SOLID_COLORS[color].hex,
   'repeated pose must visibly retain '+color);
  assert.equal(mesh.map,map,'construction detail must stay intact');
  assert.equal(mesh.roughnessMap,roughness,'surface finish must stay intact');
 }
 // Reset to the correct new item's default, never the prior hat's black.
 const steel=selectWardrobeItem(bareLabEquipment(),initialWardrobe(),'headwear','soviet-steel');
 poseOperator(rig,pose(steel.kit,steel.wardrobe),0);
 assert.equal(rig.visualKit.wardrobeHead.headwearMaterials['soviet-steel'].color.getHex(),
  HEADWEAR_SOLID_COLORS['soviet-4bo'].hex);
 const colorless=readWardrobe({...initialWardrobe(),headwearColor:'fake-metallic'});
 assert.equal(colorless.headwearColor,undefined);
 rig.dispose();
});
test('Lab uses touch-friendly visual grid, not legacy named global palette selector',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(html,/id="headwearColorGrid"/);
 assert.match(html,/grid-template-columns:repeat\(6/);
 assert.match(html,/id="headwearColorChoice"/);
 assert.doesNotMatch(html,/id="kitPalette"/);
 assert.match(js,/button\.style\.backgroundColor/);
 assert.match(js,/button\.setAttribute\('aria-label',definition\.label\)/);
 assert.match(js,/button\.setAttribute\('aria-pressed',String\(selected===color&&!wardrobeOptions\.headwearCamo\)\)/);
 assert.match(js,/headwearColor:color/);
 assert.match(js,/renderHeadwearSolidSwatches\(compatible\.headwear\)/);
});
