import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {selectWardrobeItem} from '../src/operator-wardrobe-unified.ts';
import {FOOTWEAR_IDS,FOOTWEAR,resolveFootwearHem} from '../src/operator-footwear-catalog.ts';
const pose=(equipment,wardrobe)=>({x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,aiming:false,firing:false,turning:0,deterministic:true,equipment,wardrobe});
test('five authored footwear models and bare feet have exclusive visibility, finite bounds and unchanged ankle anchors',()=>{
 const r=createOperatorRig('rook','blue'),anchors=r.feet.map(f=>f.shoe),signatures=new Set();
 for(const id of FOOTWEAR_IDS){
  const {kit,wardrobe}=selectWardrobeItem(initialEquipmentLoadout(),initialWardrobe(),'footwear',id);
  poseOperator(r,pose(kit,wardrobe),0);
  assert.equal(kit.slots.feet,FOOTWEAR[id].equipment);
  assert.equal(r.visualKit.footwear.active,id);
  for(const v of r.visualKit.footwear.models){
   assert.deepEqual(FOOTWEAR_IDS.filter(key=>v[key].foot.visible),[id]);
   const signature=[];
   v[id].foot.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;assert.ok(b.min.toArray().every(Number.isFinite));assert.ok(b.max.toArray().every(Number.isFinite));signature.push(o.geometry.attributes.position.array.join(','));}});
   assert.ok(signature.length);
   signatures.add(signature.join(';'));
  }
  assert.ok(r.feet.every((f,i)=>f.shoe===anchors[i]&&f.shoe.geometry.attributes.position===undefined));
 }
 assert.equal(signatures.size,FOOTWEAR_IDS.length);
 r.dispose();
});
test('legacy saves migrate only to current assets; low footwear restores preferred blouse on switching back',()=>{
 assert.equal(readWardrobe({version:1,styles:{footwear:'field-boots'}}).styles.footwear,'combat-boots');
 assert.equal(resolveFootwearHem('bdu-trousers','sneakers','bloused'),'unbloused');
 assert.equal(resolveFootwearHem('bdu-trousers','combat-boots','bloused'),'bloused');
});
