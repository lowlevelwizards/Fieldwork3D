import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TacticalGeometryIndex,pointBounds} from '../src/breach-spatial-index.ts';
import {safeTransientLightRange} from '../src/rendering/breach-transient-light-geometry.ts';
import {TransientLightPreview} from '../src/rendering/breach-transient-light-preview.ts';
const wall=(x,y1,y2)=>({a:{x,y:y1},b:{x,y:y2}});
function world(walls=[],cover=[]){
 const index=new TacticalGeometryIndex(walls,cover);
 return {
  someWallNearPoint:(p,r,match)=>index.someWall(pointBounds(p,r),match),
  someCoverNearPoint:(p,r,match)=>index.someCover(pointBounds(p,r),match)
 };
}
test('V17 sphere cannot cross solid wall shell, genuine gaps increase safe range',()=>{
 const p={x:80,y:100};
 assert.equal(safeTransientLightRange(world([wall(100,0,200)]),[],p,58),15);
 const gap=world([wall(100,0,50),wall(100,150,200)]);
 assert.ok(safeTransientLightRange(gap,[],p,58)>48);
 assert.equal(safeTransientLightRange(world(),[],p,58),58);
 assert.equal(safeTransientLightRange(world(),[],{x:NaN,y:100},58),0);
 assert.equal(safeTransientLightRange(world([wall(80,0,200)]),[],p,58),0);
});
test('V17 solid leaf and high cover clip the light, transparent or low cover does not',()=>{
 const p={x:80,y:100};
 const closed={id:'door',a:{x:100,y:80},b:{x:100,y:120},style:'wood',open:false,openedAt:0};
 assert.equal(safeTransientLightRange(world(),[closed],p,58),15);
 assert.equal(safeTransientLightRange(world(),[{...closed,style:'glazed'}],p,58),58);
 const box={x:100,y:100,w:10,h:10,low:false,fixture:'crate'};
 assert.equal(safeTransientLightRange(world([],[box]),[],p,58),14);
 assert.equal(safeTransientLightRange(world([],[{...box,low:true}]),[],p,58),58);
 assert.equal(safeTransientLightRange(world([],[{...box,fixture:'glass-barrier'}]),[],p,58),58);
});
test('V17 confinement is once per selected channel, fail-closed and rewind-safe',()=>{
 const lights=new TransientLightPreview(new THREE.Scene());
 const closed=world([wall(100,0,200)]);
 lights.begin();lights.offer('flash',1,80,13,100,0);lights.confine(closed,[]);
 assert.equal(lights.flash.distance,15);assert.ok(lights.flash.intensity>0);
 lights.begin();lights.offer('flash',1,100,13,100,0);lights.confine(closed,[]);
 assert.equal(lights.flash.intensity,0);assert.ok(lights.flash.distance>0);
 lights.begin();lights.offer('flash',1,80,13,100,0);lights.confine(world(),[]);
 assert.equal(lights.flash.distance,58);
 lights.reset();assert.equal(lights.flash.intensity,0);assert.equal(lights.flash.distance,58);
 let queries=0;
 const empty={someWallNearPoint:()=>{queries++;return false;},someCoverNearPoint:()=>{queries++;return false;}};
 lights.confine(empty,[]);assert.equal(queries,0);lights.dispose();
});
