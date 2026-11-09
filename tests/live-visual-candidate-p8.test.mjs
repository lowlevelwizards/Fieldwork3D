import test from 'node:test';
import assert from 'node:assert/strict';
import {groundViewCandidate} from '../src/breach-ground-view.ts';
import {cachedActorGroundView}
  from '../src/breach-live-visual-candidates.ts';
import {newSession,observerPointVisible,liveVisibility,team}
  from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const reference=(actor,p)=>{
  const dx=p.x-actor.p.x,dy=p.y-actor.p.y;
  const angle=Math.atan2(dy,dx);
  const delta=Math.atan2(Math.sin(angle-actor.heading),
    Math.cos(angle-actor.heading));
  return Math.hypot(dx,dy)<240&&Math.abs(delta)<1.15;
};
test('cached actor projection preserves reference facing and range at cone edges',()=>{
 let n=0;
 for(const heading of [-Math.PI,-2.5,-1.25,-.4,0,.7,1.9,Math.PI]){
   const a={p:{x:203.5,y:392.125},heading};
   const before=cachedActorGroundView(a);
   assert.strictEqual(cachedActorGroundView(a),before);
   for(const radius of [0,.1,19,239.999,240,241]){
     for(let degrees=-180;degrees<180;degrees+=3){
       const theta=degrees*Math.PI/180;
       const p={x:a.p.x+Math.cos(theta)*radius,
         y:a.p.y+Math.sin(theta)*radius};
       assert.equal(groundViewCandidate(cachedActorGroundView(a),p.x,p.y),
         reference(a,p),'heading '+heading+' r '+radius+' a '+degrees);
       n++;
     }
   }
 }
 assert.ok(n>=5000);
});
test('in-place turn, move and world coordinate updates invalidate projections',()=>{
 const actor={p:{x:100,y:100},heading:0};
 const start=cachedActorGroundView(actor);
 assert.strictEqual(start,cachedActorGroundView(actor));
 actor.heading=Math.PI;
 const turned=cachedActorGroundView(actor);
 assert.notStrictEqual(turned,start);
 assert.equal(groundViewCandidate(turned,120,100),false);
 actor.p.x=110;
 const moved=cachedActorGroundView(actor);
 assert.notStrictEqual(moved,turned);
 actor.p={x:110,y:90};
 assert.notStrictEqual(cachedActorGroundView(actor),moved);
});
test('live team sight preserves full-view and observer side/health gates',()=>{
 try{
  const s=newSession(0,34,'true-blind'),blue=team(s)[0];
  assert.ok(blue);
  assert.equal(observerPointVisible(s,{...blue,side:'red'},blue.p),false);
  assert.equal(observerPointVisible(s,{...blue,health:0},blue.p),false);
  s.intel.mode='full-view';
  assert.equal(liveVisibility(s,{x:-1e6,y:-1e6}),true);
  s.intel.mode='true-blind';
  for(const a of s.operators)if(a.side==='blue')a.health=0;
  assert.equal(liveVisibility(s,blue.p),false);
 }finally{activateSite(null);}
});
