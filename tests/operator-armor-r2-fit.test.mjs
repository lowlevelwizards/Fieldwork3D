import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {uniformFitEnvelope,ARMOR_FIT_TOPS,fittedArmorSurfaces,
 ARMOR_PANEL_DEPTHS}
 from '../src/operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES} from '../src/operator-armor-rig-silhouettes.ts';
import {armorAttachmentFrame,armorMountedMagazineSocket}
 from '../src/operator-armor-attachment-frame.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {setEquipmentChoice,initialEquipmentLoadout}
 from '../src/equipment-loadouts.ts';

const armorStyles=[
 'soft-slick','soft-vest','soft-flak','plate-slick','plate-jpc',
 'plate-standard','plate-heavy','plate-legacy'
];
const pose=(rig,top,armor,rigStyle='no-rig')=>{
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor',
  armor.startsWith('plate-')?'armor-carrier':'armor-soft');
 kit=setEquipmentChoice(kit,'rig',
  rigStyle==='no-rig'?'rig-none':'rig-light');
 poseOperator(rig,{
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
  injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  unarmedPreview:true,equipment:kit,
  wardrobe:{...initialWardrobe(),styles:{
   top,trousers:'bdu-trousers',headwear:'bare',
   armorStyle:armor,rigStyle,beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
 return kit;
};
test('all five authored uniforms supply deterministic monotonic fit envelopes',()=>{
 assert.equal(ARMOR_FIT_TOPS.length,5);
 for(const top of ARMOR_FIT_TOPS){
  const env=uniformFitEnvelope(top);
  assert.equal(env.top,top);
  assert.equal(env,uniformFitEnvelope(top),'stable cached envelope');
  assert.ok(env.rings.length>=4);
  assert.ok(env.shoulderCrown>6.3,'shoulder dimensions include garment top');
  for(const y of [-7,-4,-1,1,4,6]){
   const r=env.outer(y);
   assert.ok(r.front>5&&r.back< -5&&r.side>7,top+' '+y);
   assert.deepEqual(r,env.outer(y),'deterministic interpolation');
  }
 }
 assert.ok(uniformFitEnvelope('smock-jacket').frontOverhang>
  uniformFitEnvelope('combat-shirt').frontOverhang);
 assert.ok(uniformFitEnvelope('bdu-shirt').shoulderCrown>
  uniformFitEnvelope('combat-shirt').shoulderCrown);
});
test('all 40 armor/uniform combinations clear the garment and preserve authored size',()=>{
 for(const top of ARMOR_FIT_TOPS)for(const style of armorStyles){
  const e=uniformFitEnvelope(top);
  const f=fittedArmorSurfaces(style,top,ARMOR_PROFILES[style]);
  const outside=e.outer(-1.0);
  assert.ok(f.shoulderY>=e.shoulderCrown+.46,
   style+' over '+top+' shoulder crown is above fabric');
  if(style==='soft-slick'){
   assert.ok(f.front<=5.17,'concealed armor remains under clothes');
   continue;
  }
  assert.ok(f.front-ARMOR_PANEL_DEPTHS[style]>outside.front+.19,
   style+' over '+top+' inner plate face clears torso');
  assert.ok(f.side>outside.side,
   style+' over '+top+' side closure clears torso');
  assert.ok(f.back+ARMOR_PANEL_DEPTHS[style]<outside.back-.15,
   style+' over '+top+' rear inner face clears torso');
 }
});
test('bag geometry is invariant, and connector geometry regenerates only when top changes',()=>{
 const r=createOperatorRig('rook','blue');
 const armor=r.visualKit.wardrobeGear.armor['plate-standard'];
 pose(r,'combat-shirt','plate-standard');
 const front=armor.getObjectByName('authored-front-bag');
 const rear=armor.getObjectByName('authored-rear-bag');
 const joins=armor.getObjectByName('uniform-fitted-connectors');
 assert.ok(front&&rear&&joins);
 const firstGeometry=front.children.filter(o=>o instanceof THREE.Mesh)
  .map(o=>o.geometry.uuid);
 const firstConnectors=joins.children.map(o=>o.uuid);
 pose(r,'combat-shirt','plate-standard');
 assert.deepEqual(joins.children.map(o=>o.uuid),firstConnectors,
  'no per-frame rebuilding or extra mesh churn');
 pose(r,'smock-jacket','plate-standard');
 assert.deepEqual(front.children.filter(o=>o instanceof THREE.Mesh)
  .map(o=>o.geometry.uuid),firstGeometry,
  'bag geometry is invariant across uniform changes');
 assert.notDeepEqual(joins.children.map(o=>o.uuid),firstConnectors,
  'shoulder/cummerbund connections recompute after top change');
 const mounted=armorAttachmentFrame('plate-standard','smock-jacket');
 assert.equal(front.position.x,
  mounted.front.x-ARMOR_PROFILES['plate-standard'].front);
 pose(r,'smock-jacket','plate-standard');
 const second=joins.children.map(o=>o.uuid);
 assert.deepEqual(joins.children.map(o=>o.uuid),second,
  'second same outfit pose reuses connector mesh');
 r.dispose();
});
test('every armor can be posed over every top; rigs and magazines follow same fitted surface',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ARMOR_FIT_TOPS)for(const armor of armorStyles){
  const k=pose(r,top,armor,'chest-placard');
  const group=r.visualKit.wardrobeGear.armor[armor];
  assert.equal(group.visible,true,armor+' over '+top+' active');
  const frame=armorAttachmentFrame(armor,top);
  assert.equal(r.visualKit.wardrobeGear.rig['chest-placard'].position.x,
   frame.rigShiftX,'rig rides fitted '+armor+' over '+top);
  const actual=armorMountedMagazineSocket('chest-placard',0,armor,1,top);
  assert.equal(r.visualKit.magazines.rig[0].position.x,
   actual.x,'carried magazine follows front pouch');
  assert.equal(k.slots.armor,armor.startsWith('plate-')?
   'armor-carrier':'armor-soft','cosmetic has no mechanical protection');
 }
 r.dispose();
});
test('slick vs skeletal vs standard vs heavy retain readable side profile',()=>{
 for(const top of ARMOR_FIT_TOPS){
  const a=['plate-slick','plate-jpc','plate-standard','plate-heavy']
   .map(id=>fittedArmorSurfaces(id,top,ARMOR_PROFILES[id]).side);
  for(let i=0;i<a.length-1;i++)
   assert.ok(a[i]<a[i+1],top+' side coverage hierarchy');
 }
});


test('R5 flank closures stay torso-parallel without projecting loose rails',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ARMOR_FIT_TOPS){
  for(const style of ['soft-vest','soft-flak','plate-slick',
   'plate-jpc','plate-standard','plate-heavy','plate-legacy']){
   pose(r,top,style);
   const armor=r.visualKit.wardrobeGear.armor[style];
   const joins=armor.getObjectByName('uniform-fitted-connectors');
   const fit=fittedArmorSurfaces(style,top,ARMOR_PROFILES[style]);
   assert.ok(joins,style+' has fitted side connections');
   let inspected=0;
   for(const mesh of joins.children){
    if(!(mesh instanceof THREE.Mesh))continue;
    mesh.updateMatrix();
    const p=mesh.geometry.getAttribute('position');
    for(let i=0;i<p.count;i++){
     const v=new THREE.Vector3().fromBufferAttribute(p,i)
      .applyMatrix4(mesh.matrix);
     if(Math.abs(v.z)<fit.side-.65||Math.abs(v.y)>5.55)continue;
     inspected++;
     assert.ok(Math.abs(v.x)<fit.front+1.0,
      style+' '+top+' has longitudinal rail outside plate front '+v.x);
     assert.ok(Math.abs(v.z)<fit.side+2.15,
      style+' '+top+' has lateral beam outside torso flank '+v.z);
    }
   }
   assert.ok(inspected>0,style+' '+top+' has flank coverage');
  }
 }
 r.dispose();
});
