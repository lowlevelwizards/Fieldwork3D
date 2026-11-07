import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sampleHandlingTransition,sampleCarryTransition}
 from '../src/breach-pose-transition-director.ts';
import {handlingProfile} from '../src/breach-handling-profiles.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const rig=()=>({
 lastHandling:'low',lastHandlingAt:0,autoHandling:null,
 handlingProfile:handlingProfile('low','carbine'),
 weapon:new THREE.Group(),
 arms:[{bend:V(0,-1,-1)},{bend:V(0,-1,1)}]
});
const pose=(seconds,extra={})=>({
 seconds,weapon:'carbine',down:false,surrender:false,aiming:false,
 firing:false,reload:0,...extra
});
const fit=x=>({
 origin:V(x,0,0),rotation:new THREE.Euler(),
 stock:V(x-7,0,7),primary:V(x+4,0,6),support:V(x+6,-1,-6),
 twoHanded:true,primaryReachable:true,handling:'ready',
 contactError:0,stockError:0
});

test('UOP transition director samples passive handling by time, not frames',()=>{
 const r=rig();
 const first=sampleHandlingTransition(r,pose(5),'ready');
 assert.equal(first.active?.from,'low');
 assert.equal(first.active?.alpha,0);
 assert.equal(r.lastHandlingAt,5);
 const halfway=sampleHandlingTransition(r,pose(5.12),'ready');
 const repeated=sampleHandlingTransition(r,pose(5.12),'ready');
 assert.ok(halfway.active.alpha>.49&&halfway.active.alpha<.51);
 assert.equal(repeated.active.alpha,halfway.active.alpha);
 const complete=sampleHandlingTransition(r,pose(5.25),'ready');
 assert.equal(complete.active?.alpha,1);
 assert.equal(sampleHandlingTransition(r,pose(5.26),'ready').active,undefined);
 assert.equal(sampleHandlingTransition(r,
   pose(5.3,{deterministic:true}),'ready').active,undefined);
});
test('UOP transition director preserves manual Lab and combat precedence',()=>{
 const r=rig(),manual={from:'low',to:'ads',alpha:.25};
 const lab=sampleHandlingTransition(r,pose(2,{
   handlingOverride:'ads',handlingTransition:manual}),'ads');
 assert.strictEqual(lab.active,manual);
 assert.equal(r.lastHandling,'low');
 const aiming=sampleHandlingTransition(r,
   pose(3,{aiming:true}),'ads');
 assert.equal(aiming.active?.from,'low');
 assert.equal(aiming.active?.to,'ads');
 assert.equal(aiming.active?.alpha,0,
   'urgent combat pose now eases from the currently rendered arm');
});
test('UOP carry bridge is timestamp repeatable and clears on replay seeks',()=>{
 const r=rig(),a=fit(0),b=fit(3);
 assert.equal(sampleCarryTransition(r,pose(1),a,false).active,false);
 const start=sampleCarryTransition(r,pose(1.01),b,true);
 assert.equal(start.active,true);
 assert.equal(start.fit.origin.x,0);
 const half=sampleCarryTransition(r,pose(1.18),b,true);
 const same=sampleCarryTransition(r,pose(1.18),b,true);
 assert.ok(half.alpha>0&&half.alpha<1);
 assert.ok(half.fit.origin.distanceTo(same.fit.origin)<1e-9);
 assert.equal(sampleCarryTransition(r,pose(1.4),b,true).active,false);
 assert.equal(sampleCarryTransition(r,pose(.1),a,false).active,false);
 const replay=sampleCarryTransition(r,pose(.1,{deterministic:true}),a,false);
 assert.equal(replay.active,false);
 assert.strictEqual(replay.fit,a);
});
