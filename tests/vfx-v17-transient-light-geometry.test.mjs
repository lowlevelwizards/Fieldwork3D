import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TacticalGeometryIndex,pointBounds} from '../src/breach-spatial-index.ts';
import {safeTransientLightRange,fillTransientLightReach,transientReachAt,TRANSIENT_LIGHT_SECTORS,TRANSIENT_LIGHT_BLOCKER_LIMIT} from '../src/rendering/breach-transient-light-geometry.ts';
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

test('V17 directional reach preserves open side and real apertures with conservative angular bins',()=>{
 const p={x:80,y:100},reach=new Float32Array(TRANSIENT_LIGHT_SECTORS);
 const solid=world([wall(100,0,200)]);
 assert.ok(fillTransientLightReach(solid,[],p,58,reach));
 assert.equal(transientReachAt(reach,0),15);
 assert.equal(transientReachAt(reach,Math.PI),58);
 assert.equal(transientReachAt(reach,-.001),15);
 const gap=world([wall(100,0,70),wall(100,130,200)]);
 assert.ok(fillTransientLightReach(gap,[],p,58,reach));
 assert.equal(transientReachAt(reach,0),58);
 assert.ok(transientReachAt(reach,Math.PI/3)<58);
 const copy=Array.from(reach);
 assert.ok(fillTransientLightReach(gap,[],p,58,reach));assert.deepEqual(Array.from(reach),copy);
});
test('V17 narrow corner blocker cannot fall between samples; overflow and invalid source fail closed',()=>{
 const p={x:80,y:100},reach=new Float32Array(TRANSIENT_LIGHT_SECTORS);
 assert.ok(fillTransientLightReach(world([wall(100,100.1,100.2)]),[],p,58,reach));
 assert.ok(transientReachAt(reach,.005)<58);
 assert.equal(transientReachAt(reach,Math.PI),58);
 assert.equal(fillTransientLightReach(world([wall(80,0,200)]),[],p,58,reach),false);
 assert.ok(reach.every(v=>v===0));
 const crowded=Array.from({length:TRANSIENT_LIGHT_BLOCKER_LIMIT+1},()=>wall(100,90,110));
 assert.equal(fillTransientLightReach(world(crowded),[],p,58,reach),false);
 assert.ok(reach.every(v=>v===0));
 assert.equal(fillTransientLightReach(world(),[],{x:NaN,y:100},58,reach),false);
 assert.ok(reach.every(v=>v===0));
});
test('V17 directional mask honors opaque doors and high cover, not glazing or low cover',()=>{
 const p={x:80,y:100},reach=new Float32Array(TRANSIENT_LIGHT_SECTORS);
 const closed={id:'door',a:{x:100,y:80},b:{x:100,y:120},style:'wood',open:false,openedAt:0};
 assert.ok(fillTransientLightReach(world(),[closed],p,58,reach));
 assert.equal(transientReachAt(reach,0),15);
 assert.equal(transientReachAt(reach,Math.PI),58);
 assert.ok(fillTransientLightReach(world(),[{...closed,style:'glazed'}],p,58,reach));
 assert.ok(reach.every(v=>v===58));
 const box={x:100,y:100,w:10,h:10,low:false,fixture:'crate'};
 assert.ok(fillTransientLightReach(world([],[box]),[],p,58,reach));
 assert.equal(transientReachAt(reach,0),14);
 assert.equal(transientReachAt(reach,Math.PI),58);
 assert.ok(fillTransientLightReach(world([],[{...box,low:true}]),[],p,58,reach));
 assert.ok(reach.every(v=>v===58));
});

import {TransientReceiverLight,registerTransientReceiverLight,injectTransientReceiverLight} from '../src/rendering/breach-transient-receiver-light.ts';
test('V17 receiver mask is scene-owned, quantized conservatively and avoids unchanged uploads',()=>{
 const r=new TransientReceiverLight(),p={x:80,y:100},w=world([wall(100,0,200)]);
 r.begin();r.offer(1,w,[],p,13,58,15,1);r.finish();
 assert.equal(r.sources[1].w,58);assert.equal(r.strengths[1].x,1);
 assert.equal(r.strengths[0].x,0);
 const bytes=r.texture.image.data,offset=TRANSIENT_LIGHT_SECTORS;
 assert.ok(bytes[offset]*58/255<=15);assert.equal(bytes[offset+32],255);
 const version=r.texture.version;
 r.begin();r.offer(1,w,[],p,13,58,15,.5);r.finish();
 assert.equal(r.texture.version,version);assert.equal(r.strengths[1].x,.5);
 r.begin();r.finish();assert.equal(r.strengths[1].x,0);
 const renderer={},other={};registerTransientReceiverLight(renderer,r);
 const shader=()=>({fragmentShader:'#include <lights_fragment_end>',uniforms:{}});
 const a=shader(),b=shader();
 assert.ok(injectTransientReceiverLight(a,renderer));
 assert.equal(a.uniforms.fwTransientReach.value,r.texture);
 assert.match(a.fragmentShader,/fwTransientContribution/);
 assert.equal(injectTransientReceiverLight(b,other),false);
 r.dispose();
});
