import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseMissionObjective,rankMissionObjectives}
 from '../src/worldgen/mission-objective-placement.ts';
import {generateSite} from '../src/breach-site.ts';
import {auditSite} from '../src/breach-site-audit.ts';
import {summarizeSiteQuality} from '../src/worldgen/quality-matrix.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {activeSite,activateSite} from '../src/breach-core.ts';

test('mission objectives vary by semantics and seed without leaving actual rooms',()=>{
 const rooms=[
  {id:'reception',kind:'room',purpose:'reception',x:0,y:60,w:110,h:110},
  {id:'office',kind:'room',purpose:'office',x:120,y:40,w:130,h:135},
  {id:'treatment',kind:'room',purpose:'treatment',x:260,y:40,w:130,h:135},
  {id:'loading',kind:'room',purpose:'loading',x:120,y:200,w:140,h:140},
  {id:'bedroom',kind:'room',purpose:'bedroom',x:270,y:200,w:130,h:135}
 ];
 const entrance={x:40,y:220};
 const results=new Map();
 for(const op of ['clear','intel','rescue','hold','capture']){
  const ranked=rankMissionObjectives(rooms,entrance,391,op);
  assert.equal(ranked.length,rooms.length);
  const chosen=chooseMissionObjective(rooms,entrance,391,op);
  assert.equal(chosen.roomId,ranked[0].roomId);
  assert.ok(chosen.distance>=90);
  results.set(op,chosen.roomId);
 }
 assert.ok(new Set(results.values()).size>=2,
  'mission purpose must affect where the authored objective belongs');
 assert.equal(chooseMissionObjective([],entrance,391,'intel'),null);
});
test('compiler retains the true selected mission before furnishing',()=>{
 const seed=18;
 const intel=compileArchitecturalSite('office',seed,'small','','intel');
 const hold=compileArchitecturalSite('office',seed,'small','','hold');
 const intelRoom=intel.rooms.find(r=>r.kind==='room'&&
  Math.abs(intel.objective.x-r.x-r.w/2)<1&&
  Math.abs(intel.objective.y-r.y-r.h/2)<1);
 const holdRoom=hold.rooms.find(r=>r.kind==='room'&&
  Math.abs(hold.objective.x-r.x-r.w/2)<1&&
  Math.abs(hold.objective.y-r.y-r.h/2)<1);
 assert.ok(intelRoom&&holdRoom);
 const again=compileArchitecturalSite('office',seed,'small','','intel');
 assert.deepEqual(intel.objective,again.objective);
});
test('audited entries are real apertures, tactical room opportunity is grounded',()=>{
 const site=generateSite(14,'small',undefined,{mission:'rescue'});
 try{
  const a=auditSite(site);
  const e=a.tacticalOpportunities;
  assert.ok(e.exteriorDoors>=1);
  assert.ok(e.entryOptions.some(x=>x.kind==='primary'));
  assert.ok(e.entryOptions.every(x=>
   site.doors.some(d=>d.id===x.id)||
   site.windows?.some(w=>w.id===x.id)));
  assert.ok(e.roomOpportunities.every(x=>
    site.rooms.some(r=>r.id===x.roomId)));
  assert.ok(e.objectiveEntryDistance>0);
  assert.equal(e.roomOpportunities.length,site.rooms.filter(r=>r.kind==='room').length);
  assert.equal(a.errors.length,0,a.errors.join(' / '));
 }finally{activateSite(null);}
});
test('11 archetypes are sampled, errors and approach variety are quantified',()=>{
 const audits=[];
 try{
  for(let seed=1;seed<=11;seed++){
   const site=generateSite(seed,'small');
   audits.push(auditSite(site));
  }
  const matrix=summarizeSiteQuality(audits);
  assert.equal(matrix.sampled,11);
  assert.equal(matrix.byArchetype.length,11);
  assert.equal(matrix.invalidSites,0,JSON.stringify(matrix.worst));
  assert.ok(matrix.byArchetype.every(r=>
    Number.isFinite(r.meanObjectiveEntryDistance)&&
    Number.isFinite(r.meanFirstContactDistance)));
  console.log('MISSION QUALITY AUDIT (11 archetypes, small): '+
    JSON.stringify(matrix.byArchetype.map(r=>({
      building:r.archetype,invalid:r.invalid,
      secondary:r.meanAlternateDoorCount,
      windows:r.meanPotentialWindowEntries,
      objective:r.meanObjectiveEntryDistance,
      contact:r.meanFirstContactDistance,
      furnishedThresholds:r.meanFurnishedThresholdRooms
    }))));
 }finally{activateSite(null);}
});
