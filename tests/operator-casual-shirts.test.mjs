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
import {CASUAL_SHIRT_SOLIDS,GLOVE_SOLIDS,solidChoicesFor,garmentSolidHex}
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

test('plaid is a legible checked textile at torso scale, not a flat tint',()=>{
 for(const id of BUTTON_UP_FLANNEL_IDS){
  const tex=buttonUpFlannelTexture(id),pixels=tex.image.data;
  assert.ok(tex.repeat.x>=2,'plaid repeats on an operator torso');
  assert.ok(tex.repeat.y>=2,'plaid repeats vertically');
  const sample=(x,y)=>[...pixels.slice((y*64+x)*4,(y*64+x)*4+3)].join(',');
  assert.notEqual(sample(5,5),sample(5,12),'crossed bands must differ from stripes');
  assert.notEqual(sample(5,12),sample(12,12),'horizontal and vertical bands');
  assert.notEqual(sample(12,12),sample(13,12),'fine woven ticking');
 }
});
test('all casual tops recolor the ONE actual torso, without duplicate jacket shells',()=>{
 const r=createOperatorRig('rook','blue');
 const torso=r.visualKit.baseTorso;
 for(const top of CASUAL_SHIRT_CUTS){
  poseOperator(r,frame(outfit(top,{fabricSolids:{top:'ranger-green'}})),0);
  const model=r.visualKit.casualShirts.cuts[top];
  assert.strictEqual(r.visualKit.baseTorso,torso,top+' keeps foundation');
  assert.ok(torso.geometry instanceof THREE.BufferGeometry,top+' uses a real torso');
  assert.strictEqual(r.poseCavity.torso.source,r.clothMaterial,
   'torso shadow receiver follows the one cloth color');
  assert.strictEqual(torso.material,r.poseCavity.torso.material);
  assert.equal(torso.material.color.getHex(),garmentSolidHex('ranger-green'),
   'visible torso uses selected shirt color');
  assert.equal(r.colors.get(r.clothMaterial).getHex(),garmentSolidHex('ranger-green'));
  assert.ok(torso.visible,top+' torso stays visible');
  assert.ok(model.torso.visible,top+' small details active');
  for(const part of model.torso.children){
   if(!(part instanceof THREE.Mesh))continue;
   part.geometry.computeBoundingBox();
   const box=part.geometry.boundingBox;
   assert.ok(box.max.x-box.min.x<.8,
    top+' must not introduce full-width chest/shoulder slabs');
   assert.ok(part.material!==r.skinMaterial,
    top+' no false skin plaque over chest');
  }
 }
 assert.equal(r.visualKit.casualShirts.cuts['tank-top'].torso.children.length,0,
  'tank is only the original torso and uncovered arms');
 r.dispose();
});
/** Preserve names through draw-call merging: one material can merge
 * dozens of little sewn blocks without losing part-span identification. */
function partBounds(group,name){
 const box=new THREE.Box3();
 let count=0;
 for(const mesh of group.children){
  if(!(mesh instanceof THREE.Mesh))continue;
  const positions=mesh.geometry.getAttribute('position');
  const spans=mesh.geometry.userData.fieldworkLightingPartSpans??[
   {partId:mesh.name,start:0,count:positions.count}
  ];
  mesh.updateMatrix();
  for(const span of spans){
   if(span.partId!==name)continue;
   for(let j=span.start;j<span.start+span.count;j++){
    const v=new THREE.Vector3().fromBufferAttribute(positions,j)
     .applyMatrix4(mesh.matrix);
    box.expandByPoint(v);count++;
   }
  }
 }
 assert.ok(count>0,'missing authored clothing feature: '+name);
 return box;
}
test('neckline overlays never sit inside torso front; T-shirt has no collar clutter',()=>{
 const r=createOperatorRig('rook','blue');
 const tees=r.visualKit.casualShirts.cuts['t-shirt'];
 assert.equal(tees.torso.children.length,0,'tee uses plain torso, no neck strips');
 for(const [cut,names] of [
  ['polo-shirt',['polo:collar-leaf','polo:short-placket','polo:button']],
  ['button-up-shirt',['button-up:folded-collar','button-up:placket',
    'button-up:chest-pocket','button-up:pocket-flap','button-up:button']]
 ]){
  const group=r.visualKit.casualShirts.cuts[cut].torso;
  for(const name of names){
   const box=partBounds(group,name);
   assert.ok(box.min.x>=5.12,
    cut+' '+name+' must clear front X=5 with enough depth separation');
  }
 }
 assert.ok(partBounds(r.visualKit.casualShirts.cuts['polo-shirt'].torso,
  'polo:collar-leaf').getSize(new THREE.Vector3()).y>.8);
 assert.ok(partBounds(r.visualKit.casualShirts.cuts['polo-shirt'].torso,
  'polo:button').getSize(new THREE.Vector3()).z>=.38);
 assert.ok(partBounds(r.visualKit.casualShirts.cuts['button-up-shirt'].torso,
  'button-up:chest-pocket').getSize(new THREE.Vector3()).z>=3.7);
 assert.ok(partBounds(r.visualKit.casualShirts.cuts['button-up-shirt'].torso,
  'button-up:button').getSize(new THREE.Vector3()).y>=.45);
 r.dispose();
});
test('short sleeves are slightly larger, with the distinctive polo hem restored',()=>{
 const r=createOperatorRig('rook','blue');
 for(const cut of ['t-shirt','polo-shirt']){
  const model=r.visualKit.casualShirts.cuts[cut];
  for(const sleeve of model.upper){
   const shape=partBounds(sleeve,cut+':short-sleeve');
   const size=shape.getSize(new THREE.Vector3());
   assert.ok(size.x>=4.20&&size.x<=4.35,cut+' modest upper-arm width');
   assert.ok(size.y>=.49&&size.y<=.52,cut+' modest sleeve length');
   assert.ok(size.z>=4.35&&size.z<=4.45,cut+' modest upper-arm depth');
   if(cut==='polo-shirt'){
    const hem=partBounds(sleeve,'polo:sleeve-hem');
    assert.ok(hem.max.y>shape.max.y,'hem sits at the distal sleeve edge');
    assert.ok(hem.max.x>shape.max.x&&hem.max.z>shape.max.z,
     'hem is proud of sleeve silhouette without big armor pad');
   }else assert.equal(sleeve.children.length,1,'tee has no added cuff');
  }
 }
 r.dispose();
});
test('cuffed button-up covers skin from elbow to raised forearm band',()=>{
 const r=createOperatorRig('rook','blue');
 const model=r.visualKit.casualShirts.cuts['button-up-shirt'];
 for(const cuff of model.cuffedLower){
  const sleeve=partBounds(cuff,'button-up:proximal-cuffed-sleeve');
  const join=partBounds(cuff,'button-up:elbow-join');
  const hem=partBounds(cuff,'button-up:raised-forearm-cuff');
  assert.ok(sleeve.min.y<-.5,'forearm fabric reaches elbow joint');
  assert.ok(join.min.y<-.55,'small overlap conceals bent elbow seam');
  assert.ok(hem.max.y<-.08&&hem.min.y>-.27,
   'raised cuff is on mid forearm, not wrist');
  assert.ok(sleeve.max.y>=hem.min.y,
   'cloth sleeve and cuff overlap instead of exposing a skin gap');
 }
 for(const posture of ['stand','crouch']){
  poseOperator(r,frame(outfit('button-up-shirt',{sleeveState:'cuffed'}),
   {posture}),0);
  assert.ok(model.cuffedLower.every(g=>g.visible));
  assert.ok(model.lower.every(g=>!g.visible));
  for(const arm of r.arms){
   assert.strictEqual(arm.upper.material,r.clothMaterial);
   assert.strictEqual(arm.lower.material,r.skinMaterial);
  }
 }
 r.dispose();
});
test('gloves are independent from shirts, can be hidden and retain their own color',()=>{
 assert.ok(GLOVE_SOLIDS.length>=8);
 const r=createOperatorRig('rook','blue');
 const saved=outfit('button-up-shirt',{
  gloveSolid:'coyote',styles:{top:'button-up-shirt',gloves:'gloves-field'},
  fabricSolids:{top:'rust'}});
 const roundtrip=readWardrobe(JSON.parse(JSON.stringify(saved)));
 assert.equal(roundtrip.gloveSolid,'coyote');
 poseOperator(r,frame(roundtrip),0);
 assert.ok(r.gloveCovers.every(x=>x.visible));
 assert.notStrictEqual(r.gloveCovers[0].material,r.clothMaterial);
 assert.notStrictEqual(r.gloveCovers[0].material,r.vestMaterial);
 assert.equal(r.colors.get(r.gloveMaterial).getHex(),garmentSolidHex('coyote'));
 const newShirt={...roundtrip,fabricSolids:{top:'navy'}};
 poseOperator(r,frame(newShirt),0);
 assert.equal(r.colors.get(r.gloveMaterial).getHex(),garmentSolidHex('coyote'));
 poseOperator(r,frame({...newShirt,styles:{top:'tank-top',gloves:'gloves-none'}}),0);
 assert.ok(r.gloveCovers.every(x=>!x.visible));
 const manual={...roundtrip,gloveSolid:'black'};
 poseOperator(r,frame(manual),0);
 assert.equal(r.colors.get(r.gloveMaterial).getHex(),garmentSolidHex('black'));
 const withoutHands={...kit,slots:{...kit.slots,hands:'hands-none'}};
 assert.equal(resolvedWardrobe(manual,withoutHands).gloves,'gloves-field',
  'explicit glove appearance is independent of equipment truth');
 assert.equal(readWardrobe({...manual,gloveSolid:'invalid'}).gloveSolid,undefined);
 r.dispose();
});
