import test from 'node:test';import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,enemies} from '../src/breach-game.ts';
import {auditMissionScenario,captureTargetIndex}
 from '../src/breach-mission-semantics.ts';
import {activateSite} from '../src/breach-core.ts';
test('C9: all five missions refer to real generated world, not fake actors/cover',()=>{
 try{
  const missions=['clear','hold','intel','rescue','capture'];
  for(let index=0;index<missions.length;index++){
   const mission=missions[index],seed=16+index;
   const site=generateSite(seed,'small',undefined,{mission});
   assert.equal(site.encounter?.mission,mission);
   assert.equal(auditMissionScenario(site,{mission}).filter(x=>x.severity==='error').length,0);
   assert.ok(site.cover.every(o=>!!o.id));
   const s=newSession(0,seed,'floor-plan','small',mission,site);
   assert.equal(s.missionType,mission);
   const alive=enemies(s);
   assert.equal(alive.length,site.encounter.actors.length);
   if(mission==='capture'){
    const ix=captureTargetIndex(site,'capture',alive.length);
    assert.ok(ix>=0);
    assert.equal(s.captureTarget,alive[ix].id);
    assert.deepEqual(s.scenario.objective,alive[ix].p);
   }
   if(mission==='rescue')assert.ok(s.rescue,'real escort state is instantiated');
  }
 }finally{activateSite(null);}
});
