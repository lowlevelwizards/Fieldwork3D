import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe,resolvedWardrobe,readWardrobe}
 from '../src/operator-wardrobe-data.ts';
import {ARMOR_PROFILES,RIG_FRONT_PROFILES}
 from '../src/operator-armor-rig-silhouettes.ts';
import {armorAttachmentFrame,armorMountedMagazineSocket}
 from '../src/operator-armor-attachment-frame.ts';

const kit=(armor='armor-carrier',rig='rig-light')=>{
 let k=initialEquipmentLoadout();
 k=setEquipmentChoice(k,'armor',armor);
 return setEquipmentChoice(k,'rig',rig);
};
const pose=(r,k,armor,rig)=>poseOperator(r,{
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
 injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
 equipment:k,wardrobe:{...initialWardrobe(),styles:{
  armorStyle:armor,rigStyle:rig,top:'bdu-shirt',trousers:'bdu-trousers'
 }}
},0);
const size=g=>{
 const old=g.visible;g.visible=true;
 const v=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
 g.visible=old;return v;
};
test('foundational armor models are genuinely distinct, not one scaled base vest',()=>{
 const r=createOperatorRig('rook','blue'),a=r.visualKit.wardrobeGear.armor;
 for(const id of ['soft-vest','plate-standard','plate-jpc','plate-legacy'])
  assert.ok(a[id].children.length>0,id+' has authored geometry');
 assert.ok(size(a['plate-jpc']).z<size(a['plate-standard']).z,
  'skeletonized carrier visibly narrower than regular carrier');
 assert.ok(size(a['plate-legacy']).y>size(a['plate-standard']).y+2,
  'legacy body substantially longer/higher than standard');
 assert.ok(size(a['plate-standard']).x>size(a['plate-jpc']).x*.9,
  'light carrier is not a scaled legacy slab');
 assert.ok(size(a['soft-vest']).y>9,
  'police soft armor has continuous full torso coverage');
 r.dispose();
});
test('four rig archetypes have authored nonempty meshes and two-bank separation',()=>{
 const r=createOperatorRig('rook','blue'),v=r.visualKit.wardrobeGear.rig;
 for(const id of ['chest-placard','micro-rig','light-rig','split-front'])
  assert.ok(v[id].children.length>0,id+' must not be a renamed generic rig');
 assert.ok(size(v['micro-rig']).y<size(v['light-rig']).y,
  'micro harness has compact profile');
 assert.ok(size(v['split-front']).z>size(v['micro-rig']).z,
  'split-front has wide separated banks');
 r.dispose();
});
test('wardrobe armor and rig styles respect real armor class and rig capacity',()=>{
 const heavy=kit('armor-carrier','rig-full');
 const w={...initialWardrobe(),styles:{
  armorStyle:'plate-legacy',rigStyle:'split-front'}};
 const after=readWardrobe(w);
 assert.equal(resolvedWardrobe(after,heavy).armorStyle,'plate-legacy');
 assert.equal(resolvedWardrobe(after,heavy).rigStyle,'split-front');
 assert.equal(resolvedWardrobe(after,kit('armor-soft','rig-light')).armorStyle,'soft-vest');
 assert.equal(resolvedWardrobe(after,kit('armor-soft','rig-light')).rigStyle,'light-rig');
 assert.equal(heavy.slots.armor,'armor-carrier');
 assert.equal(heavy.slots.rig,'rig-full');
});
test('wardrobe uses exactly one armored shell and one rig, no legacy double model',()=>{
 const r=createOperatorRig('rook','blue');
 const k=kit('armor-carrier','rig-full');
 pose(r,k,'plate-legacy','split-front');
 const v=r.visualKit;
 assert.equal(v.softArmor.visible,false,'unwanted legacy soft shell hidden');
 assert.equal(v.plateCarrier.visible,false,'unwanted universal plate shell hidden');
 assert.equal(v.chestRig.visible,false,'old generic rig hidden');
 assert.equal(v.fieldWebbing.visible,false,'old full webbing hidden');
 assert.equal(v.wardrobeGear.armor['plate-legacy'].visible,true);
 assert.equal(v.wardrobeGear.rig['split-front'].visible,true);
 assert.equal(Object.values(v.wardrobeGear.armor).filter(g=>g.visible).length,1);
 assert.equal(Object.values(v.wardrobeGear.rig).filter(g=>g.visible).length,1);
 assert.equal(v.wardrobeGear.rig['split-front'].position.x,
  armorAttachmentFrame('plate-legacy').rigShiftX);
 assert.ok(Math.abs(v.magazines.rig[0].position.x-
  armorMountedMagazineSocket('split-front',0,'plate-legacy').x)<1e-6,
  'issued magazine and split-front rig share the same exterior attachment');
 pose(r,kit('armor-soft','rig-light'),'soft-vest','micro-rig');
 assert.equal(v.wardrobeGear.armor['soft-vest'].visible,true);
 assert.equal(v.wardrobeGear.rig['micro-rig'].visible,true);
 assert.equal(v.wardrobeGear.armor['plate-legacy'].visible,false);
 assert.equal(v.wardrobeGear.rig['split-front'].visible,false);
 r.dispose();
});
