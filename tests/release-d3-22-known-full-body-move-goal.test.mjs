import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planMove} from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {SQUEEZE_RADIUS} from '../src/breach-navigation.ts';
import {intelPassable} from '../src/breach-intel.ts';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('D3.22A Garage: never commit a squeeze-only MOVE landing as if fully standable',()=>{
 const seed=19285501,scale='standard';
 const site=generateSite(seed,scale,undefined,{mission:'intel'},
  {archetype:'garage'});
 const s=newSession(0,seed,'full-view',scale,'intel',
  {...site,training:true,enemies:[],encounter:undefined},
  {enableCivilians:false});
 try{
  const targets={
   rook:{x:597.6,y:564.5},moss:{x:554.4,y:564.5},
   ash:{x:597.6,y:420.5},vale:{x:597.6,y:161.5}
  };
  const records=[];
  for(const actor of team(s).slice(0,4)){
   const requested=targets[actor.id];
   assert.ok(requested,'Garage actor fixture changed: '+actor.id);
   const originalPlan=actor.plan.map(n=>n.id);
   const accepted=planMove(s,actor.id,requested);
   const last=actor.plan.at(-1);
   if(accepted){
    assert.equal(last?.kind,'move');
    assert.ok(intelPassable(last.p,s.intel,OPERATOR_RADIUS),
     'accepted final GO must have full operator radius clearance in known intel');
    assert.ok(dist(last.p,requested)<=13.001,
     'auto-nudge cannot silently relocate an authored GO to another room');
   }else{
    assert.deepEqual(actor.plan.map(n=>n.id),originalPlan,
     'rejected known-tight destination cannot mutate the plan');
   }
   records.push({actor:actor.id,accepted,original:requested,
    committed:accepted?last.p:null,
    requestedSqueeze:intelPassable(requested,s.intel,SQUEEZE_RADIUS),
    requestedStanding:intelPassable(requested,s.intel,OPERATOR_RADIUS)});
  }
  console.log('D322A_GARAGE_PLANNER',JSON.stringify(records));
  assert.ok(records.some(x=>x.accepted),
   'must not disable all otherwise legitimate full-body authored MOVE plans');
 }finally{activateSite(null);}
});

test('D3.22A known tight projected point cannot bypass full-body landing constraint',()=>{
 const seed=19285501;
 const site=generateSite(seed,'standard',undefined,{mission:'intel'},
  {archetype:'garage'});
 const s=newSession(0,seed,'full-view','standard','intel',
  {...site,training:true,enemies:[],encounter:undefined},
  {enableCivilians:false});
 try{
  const actor=team(s).find(a=>a.id==='rook');
  const prior={x:593.6,y:564.5};
  assert.equal(intelPassable(prior,s.intel,SQUEEZE_RADIUS),true,
   'this is the historically projected Garage narrow target');
  assert.equal(intelPassable(prior,s.intel,OPERATOR_RADIUS),false,
   'the historically projected point cannot hold a standing body');
  const accepted=planMove(s,actor.id,prior);
  if(accepted){
   const p=actor.plan.at(-1).p;
   assert.ok(intelPassable(p,s.intel,OPERATOR_RADIUS));
   assert.ok(dist(p,prior)<=13.001);
  }else assert.equal(actor.plan.length,0);
 }finally{activateSite(null);}
});
