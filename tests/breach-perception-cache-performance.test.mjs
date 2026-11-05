import test from 'node:test';
import assert from 'node:assert/strict';
import {PerceptionPairCache} from '../src/breach-perception-cache.ts';

const actor=(id,x=0,y=0)=>({
 id,p:{x,y},heading:0,health:3,posture:'stand'
});
test('geometric visibility shared for exact same actor-pair inputs only',()=>{
 const cache=new PerceptionPairCache();
 const a=actor('rook'),b=actor('guard',40,10);let rays=0;
 const doors=[{id:'D1',open:false,openFraction:0,
   a:{x:15,y:-8},b:{x:15,y:8},openedAt:0}];
 const check=()=>cache.get(a,b,1,'1:3',doors,()=>{rays++;return true;});
 assert.equal(check(),true);
 assert.equal(check(),true);
 assert.equal(rays,1);
 a.heading=.1;
 assert.equal(check(),true);assert.equal(rays,2,'facing invalidation');
 b.p.y=11;
 assert.equal(check(),true);assert.equal(rays,3,'movement invalidation');
 b.posture='crouch';
 assert.equal(check(),true);assert.equal(rays,4,'target posture invalidation');
 a.health=0;
 assert.equal(check(),true);assert.equal(rays,5,'health invalidation');
 cache.get(a,b,1,'1:4',doors,()=>{rays++;return false;});
 assert.equal(rays,6,'cover revision invalidation');
 doors[0].open=true;doors[0].openFraction=.9;
 cache.get(a,b,1,'1:4',doors,()=>{rays++;return false;});
 assert.equal(rays,7,'door geometry invalidation');
 cache.get(a,b,2,'1:4',doors,()=>{rays++;return false;});
 assert.equal(rays,8,'tick invalidation');
 assert.ok(cache.hits>=1);
});

test('visibility caches are directional and do not share opposing sight',()=>{
 const cache=new PerceptionPairCache();
 const a=actor('rook'),b=actor('guard',40,0);
 const forward=cache.get(a,b,1,'1',[],()=>true);
 const reverse=cache.get(b,a,1,'1',[],()=>false);
 assert.equal(forward,true);assert.equal(reverse,false);
});
