import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,readWardrobe,resolvedWardrobe,
 setWardrobeStyle,setWardrobeFabricCamo,
 SLEEVE_STATES,TROUSER_HEMS,wardrobeItemsForSlot}
 from '../src/operator-wardrobe-data.ts';
import {FIELD_TROUSER_CUTS,FIELD_TROUSER_PROFILES,garmentLegLoft}
 from '../src/operator-field-trouser-prototypes.ts';
import {FIELD_UNIFORM_FAMILY_CAMO,UNIFORM_CUT_CAMO,
 uniformCutCamoCompatible} from '../src/operator-uniform-cut-eligibility.ts';
import {fabricCamoChoices,fabricCamoCompatible}
 from '../src/operator-fabric-camo-policy.ts';
import {makeWardrobeLook,exportWardrobeLook,importWardrobeLook}
 from '../src/operator-wardrobe-storage.ts';
import {initialRoster,readRoster,serializeQuickPlayCosmetics}
 from '../src/breach-roster.ts';
const src=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
const kit=initialEquipmentLoadout();
const pose=(wardrobe,other={})=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment:kit,wardrobe,...other
});
const look=(top,trousers,sleeveState='unrolled',trouserHem='bloused')=>({
 ...initialWardrobe(),styles:{top,trousers},sleeveState,trouserHem
});
const visible=(xs)=>xs.every(x=>x.visible);
test('Stage 3C real trouser catalog, player-facing names and no old placeholders',()=>{
 assert.deepEqual(wardrobeItemsForSlot('trousers').map(x=>x.id),
  ['base-shorts','bdu-trousers','acu-trousers']);
 assert.deepEqual(wardrobeItemsForSlot('top').map(x=>x.name),
  ['Base underlayer','Classic Field Blouse','Modern Utility Blouse']);
 assert.equal(wardrobeItemsForSlot('trousers')[1].name,'Classic Field Trousers');
 assert.equal(wardrobeItemsForSlot('trousers')[2].name,'Modern Utility Trousers');
 assert.equal(wardrobeItemsForSlot('trousers').some(x=>x.id==='field-trousers'),false);
 assert.deepEqual(SLEEVE_STATES,['unrolled','cuffed','rolled']);
 assert.deepEqual(TROUSER_HEMS,['unbloused','bloused']);
});
test('valid sleeve/hem states persist but the old rolled checkbox is NOT migrated',()=>{
 assert.equal(initialWardrobe().sleeveState,'unrolled');
 assert.equal(initialWardrobe().trouserHem,'bloused');
 const old=readWardrobe({version:1,rolledSleeves:true,
  styles:{trousers:'field-trousers'}});
 assert.equal(old.sleeveState,'unrolled');
 assert.equal(old.styles.trousers,undefined,'deleted trouser choice stays deleted');
 const source=look('acu-shirt','acu-trousers','rolled','unbloused');
 const hydrated=readWardrobe(JSON.parse(JSON.stringify(source)));
 assert.equal(hydrated.sleeveState,'rolled');
 assert.equal(hydrated.trouserHem,'unbloused');
 const bad=readWardrobe({...source,sleeveState:'retracted',trouserHem:'floated'});
 assert.equal(bad.sleeveState,'unrolled');
 assert.equal(bad.trouserHem,'bloused');
 const saved=makeWardrobeLook('Modern Utility',kit,source);
 const imported=importWardrobeLook(exportWardrobeLook(saved));
 assert.equal(imported?.wardrobe.sleeveState,'rolled');
 assert.equal(imported?.wardrobe.trouserHem,'unbloused');
 const roster=initialRoster();
 roster.members[0].wardrobe=source;
 const roundtrip=readRoster(serializeQuickPlayCosmetics(roster));
 assert.equal(roundtrip.members[0].wardrobe.sleeveState,'rolled');
 assert.equal(roundtrip.members[0].wardrobe.trouserHem,'unbloused');
});
test('two real pants cuts have separate shaped thighs, cuffs, pocket assemblies and stable UVs',()=>{
 assert.deepEqual(FIELD_TROUSER_CUTS,['bdu-trousers','acu-trousers']);
 const a=FIELD_TROUSER_PROFILES['bdu-trousers'];
 const b=FIELD_TROUSER_PROFILES['acu-trousers'];
 assert.ok(a.thigh[2][1]>b.thigh[2][1]+.25);
 assert.ok(a.unbloused.at(-1)[1]>a.bloused.at(-1)[1]+.8);
 assert.ok(b.unbloused.at(-1)[1]>b.bloused.at(-1)[1]+.5);
 assert.ok(a.cargo[0]>b.cargo[0]);
 for(const cut of FIELD_TROUSER_CUTS){
  const p=FIELD_TROUSER_PROFILES[cut];
  for(const finish of ['thigh','unbloused','bloused']){
   const geometry=garmentLegLoft(p[finish],11.25);
   geometry.computeBoundingBox();
   assert.ok(geometry.boundingBox.max.y-geometry.boundingBox.min.y>=1.05);
   assert.ok(geometry.getAttribute('uv').count>100);
   assert.ok(geometry.index?.count>100);
   const sample=geometry.getAttribute('uv');
   assert.ok(Math.abs(sample.getY(1)-sample.getY(0))>.02);
   geometry.dispose();
  }
 }
});
test('real changeable trouser finish and sleeve state follow bones without changing knee/foot or weapon IK',()=>{
 const rig=createOperatorRig('rook','blue');
 const original={
  foot:rig.feet.map(f=>f.shoe.geometry),
  ankle:rig.feet.map(f=>f.anchor),
  arms:rig.arms.map(a=>a.upper.geometry),
  headwear:rig.visualKit.wardrobeHead,
  kneeOffset:rig.garmentFitAnchors['knee-left'].offset.clone()
 };
 for(const top of ['bdu-shirt','acu-shirt'])
 for(const trousers of ['bdu-trousers','acu-trousers'])
 for(const sleeve of SLEEVE_STATES)
 for(const hem of TROUSER_HEMS){
  const w=look(top,trousers,sleeve,hem);
  poseOperator(rig,pose(w,{unarmedPreview:true}),0);
  const blouse=rig.visualKit.fieldBlouses[top];
  const pants=rig.visualKit.fieldTrousers[trousers];
  assert.ok(blouse.torso.visible);
  assert.equal(visible(blouse.upper),sleeve!=='rolled');
  assert.equal(visible(blouse.lower),sleeve!=='rolled');
  assert.equal(visible(blouse.cuffed),sleeve==='cuffed');
  assert.equal(visible(blouse.rolledUpper),sleeve==='rolled');
  assert.equal(visible(pants.thigh),true);
  assert.equal(visible(pants.bloused),hem==='bloused');
  assert.equal(visible(pants.unbloused),hem==='unbloused');
  assert.ok(rig.arms.every(a=>a.lower.material===
   (sleeve==='rolled'?rig.skinMaterial:rig.clothMaterial)));
  assert.deepEqual(rig.feet.map(f=>f.shoe.geometry),original.foot);
  assert.deepEqual(rig.feet.map(f=>f.anchor),original.ankle);
  assert.deepEqual(rig.arms.map(a=>a.upper.geometry),original.arms);
  assert.strictEqual(rig.visualKit.wardrobeHead,original.headwear);
  assert.ok(rig.garmentFitAnchors['knee-left'].offset.equals(original.kneeOffset));
  assert.equal(rig.visualKit.jacket.children.length,0);
  assert.equal(rig.visualKit.lightShirt.children.length,0);
 }
 // Check ankle finish while running, crouching, aiming and falling.
 for(const state of [
  {posture:'crouch'}, {velocity:20,stride:17,seconds:.3},
  {aiming:true},{down:true,downProgress:.7}
 ]){
  poseOperator(rig,pose(look('acu-shirt','acu-trousers','rolled','bloused'),
   state),.4);
  const g=rig.visualKit.fieldTrousers['acu-trousers'];
  assert.ok(visible(g.bloused));
  for(const [id,node] of Object.entries(rig.garmentFitAnchors))
   assert.ok(node.parent instanceof THREE.Object3D,id);
 }
 rig.dispose();
});
test('international analogous families share same print rules for blouse and pants, not equipment',()=>{
 assert.ok(FIELD_UNIFORM_FAMILY_CAMO.classic.length>=14);
 assert.ok(FIELD_UNIFORM_FAMILY_CAMO.modern.length>=12);
 assert.ok(FIELD_UNIFORM_FAMILY_CAMO.classic.includes('flecktarn'));
 assert.ok(FIELD_UNIFORM_FAMILY_CAMO.classic.includes('woodland-dpm'));
 assert.ok(FIELD_UNIFORM_FAMILY_CAMO.modern.includes('cadpat-tw'));
 assert.ok(FIELD_UNIFORM_FAMILY_CAMO.modern.includes('woodland-marpat'));
 const blocked=['mitchell-leaf','splittertarn-31','alpenflage'];
 for(const cut of ['bdu-shirt','acu-shirt','bdu-trousers','acu-trousers']){
  const outfit=resolvedWardrobe(
   look(cut.includes('bdu')?'bdu-shirt':'acu-shirt',
    cut.includes('bdu')?'bdu-trousers':'acu-trousers'),kit);
  const channel=cut.endsWith('shirt')?'top':'trousers';
  const choices=fabricCamoChoices(channel,outfit);
  assert.deepEqual([...choices].sort(),[...UNIFORM_CUT_CAMO[cut]].sort());
  for(const id of blocked){
   assert.equal(uniformCutCamoCompatible(cut,id),false,id+' '+cut);
   assert.equal(fabricCamoCompatible(id,channel,outfit),false);
  }
 }
 let w=look('acu-shirt','acu-trousers');
 const outfit=resolvedWardrobe(w,kit);
 w=setWardrobeFabricCamo(w,'trousers','cadpat-tw',outfit);
 assert.equal(w.fabricCamo.trousers,'cadpat-tw');
 assert.equal(setWardrobeFabricCamo(w,'trousers','m81-woodland',outfit),w);
 assert.equal(uniformCutCamoCompatible('acu-shirt','cadpat-tw'),true);
 assert.equal(uniformCutCamoCompatible('bdu-shirt','cadpat-tw'),false);
});
test('Operator Lab, Campaign and Quick Play offer contextual states and no rolled boolean control',()=>{
 const html=src('../operator-lab.html');
 const lab=src('../src/breach-operator-lab.ts');
 const campaign=src('../src/campaign-ui.ts');
 const quick=src('../src/breach-main.ts');
 const grid=src('../src/operator-appearance-grid.ts');
 assert.ok(html.includes('id="wardrobeSleeveState"'));
 assert.ok(html.includes('id="wardrobeTrouserHem"'));
 assert.ok(!html.includes('id="rolledSleeves"'));
 assert.match(lab,/sleeveSelect\.value=wardrobeOptions\.sleeveState/);
 assert.match(lab,/hemSelect\.value=wardrobeOptions\.trouserHem/);
 assert.ok(campaign.includes("'trouserHem','TROUSER HEM'"));
 assert.ok(quick.includes("'sleeveState','SLEEVE FINISH'"));
 assert.ok(grid.includes("['top','bdu-shirt'],['trousers','bdu-trousers']"));
 assert.ok(grid.includes("'acu-trousers'"));
 const data=src('../src/operator-wardrobe-data.ts');
 assert.ok(!data.includes('rolledSleeves'));
});
