import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {civilianRefugePoints}
 from '../src/breach-civilian-refuge.ts';
import {activateSite} from '../src/breach-core.ts';

for(const seed of [13,17,23]){
 test('EQA3.14 actual rescue person '+seed+
  ' receives same local refuge options as ordinary civilians',()=>{
  const site=generateSite(seed,'small',undefined,
   {mission:'rescue',enableIncidentIntent:true});
  const s=newSession(0,seed,'floor-plan','small','rescue',site,
   {enableCivilians:true});
  try{
   const rescue=s.civilians.find(c=>c.rescueTarget);
   assert.ok(rescue);
   const expected=civilianRefugePoints(site,rescue);
   assert.ok(expected.length>0,
    'generated room contains at least one legal local refuge candidate');
   assert.deepEqual(rescue.refugePoints,expected);
   assert.deepEqual(rescue.p,s.scenario.objective,
    'refuge initialization cannot relocate or reveal the real rescue subject');
   assert.equal(rescue.goal,null);
   assert.deepEqual(rescue.nav,[]);
   assert.equal(rescue.fear,0);
   assert.equal(s.civilians.filter(c=>c.rescueTarget).length,1,
    'rescue identity stays singular, never a duplicate or puppet');
  }finally{activateSite(null);}
 });
}
test('EQA3.14 disabled physical civilians still retain legacy marker-only rescue',()=>{
 const site=generateSite(13,'small',undefined,{mission:'rescue'});
 const s=newSession(0,13,'floor-plan','small','rescue',site,
  {enableCivilians:false});
 try{
  assert.equal(s.civilians.length,0);
  assert.ok(s.rescue);
 }finally{activateSite(null);}
});
