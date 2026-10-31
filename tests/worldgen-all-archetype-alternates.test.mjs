import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHITECTURAL_FAMILIES,architecturalBlueprint,blueprintIssues}
  from '../src/worldgen/architectural-program.ts';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
test('every building type has at least two distinct functional massing programs',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES){
  const distinct=new Set();let stepped=false;
  for(let seed=0;seed<18;seed++){
   const b=architecturalBlueprint(kind,seed);
   distinct.add(b.family.replace(' / mirrored',''));
   assert.deepEqual(blueprintIssues(b),[],kind+' '+seed);
   stepped ||= b.cells.flat().some(x=>x===null);
  }
  assert.ok(distinct.size>=2,kind+' lacks meaningful alternate');
  assert.ok(stepped,'no setback/courtyard option for '+kind);
 }
});
test('sampled compact and expanded facilities remain accessible under all massings',()=>{
 const seen=new Set();
 for(let seed=1;seed<=66;seed++){
  const site=generateSite(seed,seed%2?'standard':'expanded');
  assert.equal(site.programLocked,true);
  seen.add(site.archetype);
  assert.ok(site.doors.some(d=>d.id==='FRONT'));
  assert.ok(site.rooms.length>=8);
  activateSite(site);
  try{assert.ok(passable(site.spawn[0]));
   assert.ok(route(site.spawn[0],site.objective).length,'seed '+seed);}
  finally{activateSite(null);}
 }
 assert.equal(seen.size,11);
});
