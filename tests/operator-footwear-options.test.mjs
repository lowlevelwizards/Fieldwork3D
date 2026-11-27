import test from 'node:test';
import * as THREE from 'three';
import {footwearDetailTexture} from '../src/operator-footwear-detail.ts';
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
   assert.ok(FOOTWEAR_IDS.filter(key=>key!==id).every(key=>!v[key].foot.children.length&&!v[key].shaft.children.length),'inactive footwear is never allocated');
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

test('FW13: pixel detail atlas is shared, opaque, nearest-sampled and authored for each shod style',()=>{
 const fingerprints=new Set();
 for(const id of FOOTWEAR_IDS.filter(id=>id!=='bare-feet')){
  const tex=footwearDetailTexture(id),{data,width,height}=tex.image;
  assert.strictEqual(footwearDetailTexture(id),tex);
  assert.equal(width,64);assert.equal(height,64);
  assert.equal(tex.magFilter,THREE.NearestFilter);
  assert.equal(tex.minFilter,THREE.NearestMipmapLinearFilter);
  const pixel=(x,y)=>data[(y*width+x)*4];
  assert.ok(pixel(12,10)<pixel(11,12),'dark top lace stroke next to highlight');
  assert.ok(pixel(12,12)<250,'lace shadows are present');
  assert.ok(data.every((v,i)=>i%4!==3||v===255),'opaque surface texture, not an overlay');
  const side=pixel(40,15);
  if(id==='combat-boots'||id==='hiking-boots')assert.ok(side<255,'canvas panel');
  else assert.equal(side,255,'other shoe sides stay plain');
  if(id==='hiking-boots'||id==='hiking-shoes')assert.ok(pixel(58,8)<180,'printed rubber toe');
  fingerprints.add(Array.from(data).join(','));
 }
 assert.equal(fingerprints.size,5,'style-specific artwork');
});
test('FW13: no overlapping toe prism or lace panels; mapped upper and shaft share the original material',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  for(const id of FOOTWEAR_IDS){
   const {kit,wardrobe}=selectWardrobeItem(initialEquipmentLoadout(),initialWardrobe(),'footwear',id);
   poseOperator(r,pose(kit,wardrobe),0);
   for(const variants of r.visualKit.footwear.models){
    const model=variants[id];
    if(id==='bare-feet'){assert.equal(model.foot.children.length,1);continue;}
    assert.deepEqual(model.foot.children.map(o=>o.name),['sole','upper']);
    const shell=model.foot.children[1];
    assert.strictEqual(shell.material.map,footwearDetailTexture(id));
    const uv=shell.geometry.getAttribute('uv'),normal=shell.geometry.getAttribute('normal');
    for(let i=0;i<uv.count;i++){
     assert.ok(uv.getX(i)>0&&uv.getX(i)<1&&uv.getY(i)>0&&uv.getY(i)<1);
     if(Math.abs(normal.getZ(i))>.9)assert.ok(uv.getX(i)>.5&&uv.getY(i)<.5,'side tile');
     else assert.ok(uv.getX(i)<.5&&uv.getY(i)<.5,'top tile');
    }
    const shaft=model.shaft.children.find(o=>o.name==='shaft');
    if(shaft)assert.strictEqual(shaft.material.map,shell.material.map);
   }
  }
 }finally{r.dispose();}
});
