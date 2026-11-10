import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAfterActionReport,canonicalDistanceMeters,shotOutcome}
  from '../src/breach-after-action-report.ts';
const shot=(id,at,who,target,hit,before,after,down=false,region='torso')=>({
 id,recordedAt:at,shooterId:who,targetId:target,hit,
 healthBefore:before,healthAfter:after,down,hitRegion:region,
 weaponAtFire:'rifle',start:{x:0,y:0},end:{x:30,y:0}
});
const rec=()=>{
 const people=[{id:'moss',name:'MOSS',side:'blue'},
  {id:'ash',name:'ASH',side:'blue'},
  {id:'guard',name:'GUARD',side:'red'},
  {id:'sentry',name:'SENTRY',side:'red'}];
 return {manifest:{actors:people},duration:195,
  completeness:{complete:true,truncatedAt:null,reason:null},
  frames:[{actors:[{id:'moss',health:4,injuryStage:0},
    {id:'ash',health:4,injuryStage:0}]}],
  ballistics:{shots:[shot(1,4,'ash','guard',true,3,2),
    shot(2,5,'ash','guard',true,2,0,true),
    shot(3,10,'ash','sentry',true,4,4),
    shot(4,11,'sentry','moss',false,4,4)]},
  events:[{id:1,t:5,kind:'down',actor:'guard'},
   {id:2,t:12,kind:'surrender',actor:'sentry'},
   {id:3,t:3,kind:'intel',actor:'ash'}]};
};
test('report preserves shot IDs, side, chronological contact resolution',()=>{
 const r=buildAfterActionReport(rec());
 assert.deepEqual(r.shots.map(s=>s.outcome),['damaging','damaging','armor-stopped','miss']);
 assert.deepEqual(r.hostiles.map(c=>c.resolution),['incapacitated','surrendered']);
 assert.equal(r.hostiles[0].finalShotId,2);
 assert.equal(r.hostiles[1].finalShotId,null,'surrender cannot invent a finishing shot');
 assert.equal(r.shots[0].precision,'region-only');
 assert.equal(r.shots[0].caliber,null);
 assert.equal(r.operators.length,2);
 assert.equal(r.operators.find(x=>x.id==='moss').shots,0,
  'non-shooting contributors must not vanish');
});
test('forensic classifications retain absence of evidence and unit scale',()=>{
 assert.equal(shotOutcome({hit:false,healthBefore:4,healthAfter:4}),'miss');
 assert.equal(shotOutcome({hit:true,healthBefore:4,healthAfter:4}),'armor-stopped');
 assert.equal(shotOutcome({hit:true,healthBefore:null,healthAfter:null}),'hit-unknown');
 assert.equal(canonicalDistanceMeters(40),2);
 assert.equal(canonicalDistanceMeters(-1),null);
});
test('ranking is deterministic and not an XP or surviving-only filter',()=>{
 const r=buildAfterActionReport(rec());
 assert.deepEqual(r.operators.map(o=>o.id),['ash','moss']);
 assert.equal(r.operators[0].rank,1);
});
test('structured objective contributor does not change original event identity',()=>{
 const r=rec();
 r.events.push({id:8,t:20,kind:'objective',actor:undefined,
   text:'OBJECTIVE SECURED',meta:{action:'objective-secure',
     contributorId:'moss',objectId:'clear'}});
 const report=buildAfterActionReport(r);
 const moss=report.operators.find(o=>o.id==='moss');
 assert.equal(moss.categories.objective,8);
 assert.equal(r.events.at(-1).actor,undefined);
});
