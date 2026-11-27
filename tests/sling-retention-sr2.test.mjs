import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createSlingRibbonGeometry,updateSlingRibbonGeometry,SLING_RIBBON_CAPACITY} from '../src/operator-sling-ribbon.ts';
test('SR2 shared knot strip preserves width, topology and allocation across updates',()=>{
 const g=createSlingRibbonGeometry(),p=g.getAttribute('position'),index=g.index;
 const knots=[[0,0,0],[0,2,0],[-2,3,0],[-4,3,0]].map(x=>({point:new THREE.Vector3(...x),normal:new THREE.Vector3(0,0,1)}));
 for(const width of [.65,1.05]){
  assert.ok(updateSlingRibbonGeometry(g,knots,width));
  assert.equal(g.drawRange.count,18);
  assert.equal(g.getAttribute('position'),p);assert.equal(g.index,index);
  for(let i=0;i<knots.length;i++){
   const a=new THREE.Vector3().fromBufferAttribute(p,i*2),b=new THREE.Vector3().fromBufferAttribute(p,i*2+1);
   assert.ok(Math.abs(a.distanceTo(b)-width)<1e-5);
   assert.ok(a.add(b).multiplyScalar(.5).distanceTo(knots[i].point)<1e-5);
  }
 }
 assert.equal(p.count,SLING_RIBBON_CAPACITY*2);
 assert.equal(updateSlingRibbonGeometry(g,[],1),false);assert.equal(g.drawRange.count,0);
 g.dispose();
});
