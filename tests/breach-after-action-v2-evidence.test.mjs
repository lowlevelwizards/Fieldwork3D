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
test('after-action preserves source shot IDs, separation and outcomes',()=>{
 const r=buildAfterActionReport(rec());
 assert.equal(r.shots.length,4);
 assert.deepEqual(r.shots.map(s=>s.outcome),
  ['damaging','damaging','armor-stopped','miss']);
 assert.deepEqual(r.hostiles.map(c=>c.resolution),
  ['incapacitated','surrendered']);
 assert.equal(r.hostiles[0].finalShotId,2);
 assert.equal(r.hostiles[1].finalShotId,null,
  'a surrender never invents a finishing shot');
 assert.equal(r.shots[0].precision,'region-only');
 assert.equal(r.shots[0].caliber,null);
 assert.equal(r.operators.length,2);
 assert.equal(r.operators[1].shots,0,'quiet operators remain listed');
 assert.equal(r.operators[0].incapacitations,1);
 assert.equal(r.operators[1].doorsOpened,null,'unknown is not zero');
});
test('armor, misses, missing evidence and distance are handled honestly',()=>{
 assert.equal(shotOutcome({hit:true,healthBefore:4,healthAfter:4}),'armor-stopped');
 assert.equal(shotOutcome({hit:false,healthBefore:4,healthAfter:4}),'miss');
 assert.equal(shotOutcome({hit:true,healthBefore:null,healthAfter:null}),'hit-unknown');
 assert.equal(canonicalDistanceMeters(40),2);
 assert.equal(canonicalDistanceMeters(-1),null);
});
test('rank is deterministic and never penalizes casualties merely for status',()=>{
 const r=buildAfterActionReport(rec());
 assert.deepEqual(r.operators.map(o=>o.id),['ash','moss']);
 assert.equal(r.operators[0].rank,1);
 assert.equal(r.operators[0].contactReports,1);
});
