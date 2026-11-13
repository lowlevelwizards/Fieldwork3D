import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseFriendlyLaneStep,chooseMuzzleRecoveryStep}
 from '../src/breach-combat-reactions.ts';
import {assessFireLane} from '../src/breach-fire-safety.ts';
import {newSession,team,planMove,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const pt=(x,y)=>({x,y});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('A3.4 tiny lateral physical step wins over old 12-unit escape',()=>{
 const origin=pt(0,0),tests=[];
 const result=chooseFriendlyLaneStep(origin,0,q=>{
  tests.push(q);return true;
 },q=>q.y>=7);
 assert.deepEqual(result,pt(0,7));
 assert.ok(tests.every(q=>d(origin,q)<=7),
  'stop evaluating larger escape maneuvers once micro-step succeeds');
});
test('A3.4 both sides and all lengths use deterministic minimal order',()=>{
 const origin=pt(5,5);
 const attempts=[];
 const step=chooseFriendlyLaneStep(origin,0,()=>true,q=>{
  attempts.push(q.y-origin.y);
  return q.y-origin.y===12;
 });
 assert.deepEqual(attempts,[-4,4,-7,7,-10,10,-12,12]);
 assert.deepEqual(step,pt(5,17));
 const impossible=chooseFriendlyLaneStep(origin,0,()=>true,()=>false);
 assert.equal(impossible,null);
});
test('A3.4 retreat and oblique correction try shortest swept motor step first',()=>{
 const origin=pt(0,0);
 const blocked=chooseMuzzleRecoveryStep(origin,0,
  q=>d(origin,q)>=7,q=>q.x<=-7);
 assert.ok(blocked&&d(origin,blocked)<=7+.00001,
  'closest physically legal rear clearance used');
 assert.ok(blocked.x<0);
 assert.equal(chooseMuzzleRecoveryStep(origin,0,()=>false,()=>true),null);
});
test('A3.4 a teammate only vetoes the actual swept firing lane',()=>{
 const origin=pt(0,0),target=pt(100,0),friend=pt(37,0);
 const canShoot=pos=>assessFireLane(pos,26,target,26,[],[],[],
  [friend]).blocker==='clear';
 assert.equal(canShoot(origin),false);
 const correction=chooseFriendlyLaneStep(origin,0,()=>true,canShoot);
 assert.ok(correction&&d(origin,correction)>=4);
 assert.equal(canShoot(correction),true);
});
test('A3.4 short corrective steps never mutate authored route themselves',()=>{
 const s=newSession(0,31063,'full-view','standard','hold');
 try{
  const a=team(s)[0],from={...a.p};
  const planned=planMove(s,a.id,pt(from.x+36,from.y));
  const before=JSON.stringify(a.plan);
  chooseFriendlyLaneStep(a.p,a.heading,()=>true,()=>false);
  chooseMuzzleRecoveryStep(a.p,a.heading,()=>true,()=>false);
  assert.equal(JSON.stringify(a.plan),before);
  assert.equal(a.p.x,from.x);assert.equal(a.p.y,from.y);
  if(planned){
   toggling(s);for(let i=0;i<45;i++)stepSession(s,1/60);
   assert.ok(Number.isFinite(a.p.x));
   assert.ok(Number.isFinite(a.p.y));
  }
 }finally{activateSite(null);}
});
