import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARMOR_VISIBLE_STYLES,ARMOR_PROPORTIONS}
 from '../src/operator-armor-proportions.ts';
import {armorSideLayout} from '../src/operator-armor-side-layout.ts';
import {ARMOR_FIT_TOPS,fittedArmorSurfaces}
 from '../src/operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES} from '../src/operator-armor-rig-silhouettes.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {setEquipmentChoice,initialEquipmentLoadout}
 from '../src/equipment-loadouts.ts';
const pose=(r,top,armor)=>{
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor',
  armor.startsWith('plate-')?'armor-carrier':'armor-soft');
 kit=setEquipmentChoice(kit,'rig','rig-none');
 poseOperator(r,{
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
  injury:0,weapon:'carbine',reload:0,reloadDuration:0,lastDoorAt:-100,
  lastThrowAt:-100,down:false,surrender:false,aiming:false,firing:false,
  turning:0,deterministic:true,unarmedPreview:true,equipment:kit,
  wardrobe:{...initialWardrobe(),styles:{
   top,armorStyle:armor,trousers:'bdu-trousers',
   rigStyle:'no-rig',headwear:'bare',
   beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
 return kit;
};
const extent=(g)=>{
 g.updateMatrixWorld(true);
 const inverse=g.matrixWorld.clone().invert();
 const b=new THREE.Box3().makeEmpty();
 g.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  o.geometry.computeBoundingBox();
  b.union(o.geometry.boundingBox.clone().applyMatrix4(
   inverse.clone().multiply(o.matrixWorld)));
 });
 return b;
};
const hit=(g,x,y,z,dir)=>{
 g.updateMatrixWorld(true);
 const o=g.localToWorld(new THREE.Vector3(x,y,z));
 const d=new THREE.Vector3(...dir).transformDirection(g.matrixWorld);
 return new THREE.Raycaster(o,d,0,80).intersectObject(g,true).length>0;
};
test('R5 every visible armor declares a meaningful style, collar and rear bag',()=>{
 const spec=ARMOR_PROPORTIONS;
 assert.equal(spec['soft-vest'].collarStyle,'vest_v');
 assert.equal(spec['soft-flak'].collarStyle,'high_flak');
 assert.equal(spec['plate-legacy'].collarStyle,'legacy_wrap');
 assert.equal(spec['plate-jpc'].sideStyle,'open_two_band');
 assert.equal(spec['plate-heavy'].sideStyle,'side_plate');
 assert.ok(spec['plate-heavy'].sidePlateHeight>3.2);
 assert.ok(spec['plate-heavy'].shoulderWidth>
  spec['plate-standard'].shoulderWidth+.5);
 assert.ok(spec['plate-jpc'].width-spec['plate-slick'].width<.8,
  'slick and JPC differ mainly by attachment construction, not plate size');
 for(const id of ARMOR_VISIBLE_STYLES){
  const x=spec[id];
  assert.ok(x.rearWidth>8.8&&x.rearWidth<12.7,id+' rear bag');
  assert.ok(x.strapThickness>=.50,id+' no fiddly little straps');
  assert.ok(x.strapDrop>=.60,id+' strap must meet the front bag');
 }
});
test('R5 all 35 side layouts hug shirt while preserving three right-angle faces',()=>{
 for(const top of ARMOR_FIT_TOPS){
  for(const id of ARMOR_VISIBLE_STYLES){
   const spec=ARMOR_PROPORTIONS[id];
   const fit=fittedArmorSurfaces(id,top,ARMOR_PROFILES[id]);
   const p=armorSideLayout(fit,spec);
   assert.ok(p.centerZ-p.sideHalfThickness>=p.garmentSide+.115,
    id+' '+top+' side slab clips garment');
   assert.ok(p.frontX>4.8&&p.backX< -4.8,id+' '+top+' bag faces');
   assert.ok(p.frontX>p.backX+9,id+' '+top+' complete flank wall');
   assert.ok(p.plateEdgeZ<spec.width*.5,id+' seam hidden beneath bag');
   assert.ok(p.frontReturnLength>1.1,id+' '+top+' front return reaches side');
   assert.ok(p.sideHalfThickness>=.30,id+' substantial side fabric');
   assert.ok(p.returnThickness>=.48,'connector is chunky');
   assert.ok(p.centerZ<=fit.side+1.0,id+' '+top+' side not overbuilt');
  }
 }
});
test('R5 police V opens at the sternum, fragmentation front is closed',()=>{
 const r=createOperatorRig('rook','blue');
 pose(r,'combat-shirt','soft-vest');
 const p=r.visualKit.wardrobeGear.armor['soft-vest'];
 const pf=p.getObjectByName('authored-front-bag');
 assert.ok(pf);
 assert.equal(hit(pf,20,3.8,0,[-1,0,0]),false,
  'police V is real negative space, not a dark decal');
 assert.equal(hit(pf,20,-1,0,[-1,0,0]),true,
  'police central zipper joins lower fabric panels');
 pose(r,'combat-shirt','soft-flak');
 const f=r.visualKit.wardrobeGear.armor['soft-flak'];
 const ff=f.getObjectByName('authored-front-bag');
 const closure=ff.children.filter(o=>o instanceof THREE.Mesh)
  .map(o=>{
   o.geometry.computeBoundingBox();
   return o.geometry.boundingBox.getSize(new THREE.Vector3());
  });
 assert.ok(closure.some(v=>v.y>10&&v.z<1.05),
  'fragmentation closure is one uninterrupted tall, chunky center panel');
 r.dispose();
});
test('R5 new side plate and collar identities remain legible across outfits',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ARMOR_FIT_TOPS){
  for(const id of ARMOR_VISIBLE_STYLES){
   const kit=pose(r,top,id),g=r.visualKit.wardrobeGear.armor[id];
   assert.ok(g.visible,id+' selected over '+top);
   const joints=g.getObjectByName('uniform-fitted-connectors');
   const bag=g.getObjectByName('authored-front-bag');
   assert.ok(joints&&bag,'authored fit groups');
   const a=extent(joints),b=extent(bag);
   assert.ok(!a.isEmpty()&&!b.isEmpty(),'nonempty fitted mesh');
   assert.ok(a.max.y>ARMOR_PROPORTIONS[id].top+.9,
    id+' '+top+' crown visible above plate');
   assert.equal(kit.slots.armor,id.startsWith('plate-')?
    'armor-carrier':'armor-soft');
   const first=joints.children.map(x=>x.uuid);
   pose(r,top,id);
   assert.deepEqual(joints.children.map(x=>x.uuid),first,
    id+' '+top+' no per-frame geometry rebuild');
  }
 }
 const standard=ARMOR_PROPORTIONS['plate-standard'];
 const heavy=ARMOR_PROPORTIONS['plate-heavy'];
 assert.ok(heavy.width>standard.width&&heavy.bottom<standard.bottom);
 assert.ok(heavy.sideHeight>standard.sideHeight);
 r.dispose();
});
