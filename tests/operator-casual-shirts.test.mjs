import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,readWardrobe,resolvedWardrobe,
 setWardrobeFabricCamo,setWardrobeFabricSolid,wardrobeItemsForSlot,
 sleeveStateOptions} from '../src/operator-wardrobe-data.ts';
import {CASUAL_SHIRT_CUTS} from '../src/operator-casual-shirts.ts';
import {topColorwayChoices,BUTTON_UP_FLANNEL_IDS,
 buttonUpFlannelTexture} from '../src/operator-upper-colorways.ts';
import {CASUAL_SHIRT_SOLIDS,solidChoicesFor,garmentSolidHex}
 from '../src/operator-garment-color-policy.ts';
import {fabricCamoChoices} from '../src/operator-fabric-camo-policy.ts';

const kit=initialEquipmentLoadout();
const outfit=(top,extras={})=>({...initialWardrobe(),
 styles:{top,trousers:'bdu-trousers'},...extras});
const frame=(wardrobe,phase={})=>({
 x:0,z:0,heading:0,velocity:0,seconds:.25,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 unarmedPreview:true,equipment:kit,wardrobe,...phase
});
test('four casual upper cuts are real catalog entries with curated solids',()=>{
 assert.deepEqual(CASUAL_SHIRT_CUTS,
  ['t-shirt','button-up-shirt','polo-shirt','tank-top']);
 for(const cut of CASUAL_SHIRT_CUTS){
  assert.ok(wardrobeItemsForSlot('top').some(item=>item.id===cut),cut);
  assert.ok(CASUAL_SHIRT_SOLIDS[cut].length>=8);
  const resolved=resolvedWardrobe(outfit(cut),kit);
  assert.equal(resolved.top,cut);
  assert.deepEqual(solidChoicesFor('top',resolved),CASUAL_SHIRT_SOLIDS[cut]);
  assert.ok(fabricCamoChoices('top',resolved).length>=3,cut);
  assert.ok(!fabricCamoChoices('top',resolved).includes('ucp'),cut);
 }
 assert.ok(solidChoicesFor('top',{top:'button-up-shirt'}).includes('burnt-orange'));
 assert.ok(!solidChoicesFor('top',{top:'tank-top'}).includes('burnt-orange'));
 assert.deepEqual(sleeveStateOptions('button-up-shirt'),['unrolled','cuffed','rolled']);
 assert.deepEqual(sleeveStateOptions('t-shirt'),['unrolled']);
 assert.ok(garmentSolidHex('navy')!==garmentSolidHex('rust'));
});
test('each new silhouette follows articulated operator poses without changing anchors',()=>{
 const r=createOperatorRig('rook','blue');
 const foot=r.feet[0].shoe.geometry,head=r.visualKit.wardrobeHead;
 const elbow=r.arms[0].upper.geometry;
 for(const cut of CASUAL_SHIRT_CUTS){
  for(const phase of [{posture:'stand'},{posture:'crouch'},{aiming:true}]){
   poseOperator(r,frame(outfit(cut),phase),0);
   assert.equal(r.visualKit.casualShirts.cuts[cut].torso.visible,true,cut);
   for(const other of CASUAL_SHIRT_CUTS.filter(x=>x!==cut))
    assert.equal(r.visualKit.casualShirts.cuts[other].torso.visible,false);
   assert.strictEqual(r.feet[0].shoe.geometry,foot);
   assert.strictEqual(r.arms[0].upper.geometry,elbow);
   assert.strictEqual(r.visualKit.wardrobeHead,head);
  }
 }
 r.dispose();
});
test('casual short sleeves expose arm skin; tank top has no sleeve overlays',()=>{
 const r=createOperatorRig('rook','blue');
 for(const cut of ['t-shirt','polo-shirt','tank-top']){
  poseOperator(r,frame(outfit(cut)),0);
  for(const arm of r.arms){
   assert.strictEqual(arm.upper.material,r.skinMaterial,cut+' upper arm');
   assert.strictEqual(arm.lower.material,r.skinMaterial,cut+' forearm');
  }
  const model=r.visualKit.casualShirts.cuts[cut];
  assert.equal(model.upper.every(g=>g.visible),cut!=='tank-top');
  assert.equal(model.torso.visible,true);
 }
 for(const sleeveState of ['unrolled','cuffed','rolled']){
  poseOperator(r,frame(outfit('button-up-shirt',{sleeveState})),0);
  const model=r.visualKit.casualShirts.cuts['button-up-shirt'];
  assert.strictEqual(r.arms[0].upper.material,r.clothMaterial);
  assert.equal(model.rolledUpper.every(g=>g.visible),sleeveState==='rolled');
  assert.equal(model.cuffedLower.every(g=>g.visible),sleeveState==='cuffed');
  assert.strictEqual(r.arms[0].lower.material,
   sleeveState==='unrolled'?r.clothMaterial:r.skinMaterial);
 }
 r.dispose();
});
test('four authentic muted flannel colorways are deterministic button-up only',()=>{
 assert.equal(BUTTON_UP_FLANNEL_IDS.length,4);
 const labels=topColorwayChoices('button-up-shirt').map(x=>x[1]);
 for(const name of ['Rust red','Forest green','Dusty blue','Burnt orange'])
  assert.ok(labels.some(label=>label.includes(name)),name);
 const firstPixels=[];
 for(const id of BUTTON_UP_FLANNEL_IDS){
  const tex=buttonUpFlannelTexture(id);
  assert.ok(tex instanceof THREE.DataTexture,id);
  assert.strictEqual(tex,buttonUpFlannelTexture(id),'cache is deterministic');
  assert.equal(tex.image.data.length,64*64*4);
  firstPixels.push([...tex.image.data.slice(0,4)]);
 }
 assert.equal(new Set(firstPixels.map(x=>x.join(','))).size,4);
 assert.equal(buttonUpFlannelTexture('standard'),null);
 assert.deepEqual(topColorwayChoices('tank-top'),[]);
});
test('flannel persists through wardrobe storage, switches back to fabric, and does not tint trousers',()=>{
 const r=createOperatorRig('rook','blue');
 const saved=outfit('button-up-shirt',{topColorway:'flannel-rust-red'});
 const reloaded=readWardrobe(JSON.parse(JSON.stringify(saved)));
 assert.equal(reloaded.topColorway,'flannel-rust-red');
 poseOperator(r,frame(reloaded),0);
 assert.strictEqual(r.clothMaterial.map,buttonUpFlannelTexture('flannel-rust-red'));
 assert.notStrictEqual(r.clothMaterial.map,r.trouserMaterial.map);
 const current=resolvedWardrobe(reloaded,kit);
 const solid=setWardrobeFabricSolid(reloaded,'top','navy',current);
 assert.equal(solid.topColorway,'standard');
 poseOperator(r,frame(solid),0);
 assert.notStrictEqual(r.clothMaterial.map,buttonUpFlannelTexture('flannel-rust-red'));
 const next=setWardrobeFabricCamo(reloaded,'top','m81-woodland',current);
 assert.equal(next.topColorway,'standard');
 poseOperator(r,frame(next),0);
 assert.match(r.clothMaterial.map.name,/m81-woodland/);
 poseOperator(r,frame(outfit('t-shirt')),0);
 assert.notStrictEqual(r.clothMaterial.map,buttonUpFlannelTexture('flannel-rust-red'));
 r.dispose();
});
