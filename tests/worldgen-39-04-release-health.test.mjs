import test from 'node:test';
import assert from 'node:assert/strict';
import {rollupReleaseSamples,auditReleaseMatrix}
 from '../src/worldgen/release-health.ts';
const audit=(seed,kind,family,side,errors=[])=>({
 seed,archetype:kind,planFamily:family,entrySide:side,layout:'courtyard',
 designQuality:{score:errors.length*4},errors,incompleteZones:[],
 serviceIssues:[],operationalRouteIssues:[]});
const sample=(a,scale,durationMs)=>({seed:a.seed,scale,
 archetype:a.archetype,family:a.planFamily,entrySide:a.entrySide,
 durationMs,errors:a.errors,rooms:7,doors:5,props:10});
test('release report surfaces repetitive families, invalid sites and host costs',()=>{
 const a=[audit(0,'retail','A','south'),
  audit(11,'retail','A','south',['unreachable']),
  audit(22,'retail','B','east')];
 const result=rollupReleaseSamples(a.map((x,i)=>sample(x,'medium',30+i*10)),a);
 assert.equal(result.sampled,3);
 assert.equal(result.invalid,1);
 assert.equal(result.archetypes,1);
 assert.equal(result.distinctFamilies,2);
 assert.equal(result.repeatedFamilyShare,33);
 assert.deepEqual(result.entrySides,{south:2,east:1});
 assert.equal(result.medianMs,40);
 assert.equal(result.slowestMs,50);
 assert.equal(result.byArchetype[0].distinctEntrySides,2);
});
test('release audit is explicitly bounded, not added to the live generator',()=>{
 assert.throws(()=>auditReleaseMatrix(Array.from({length:17},(_,i)=>i),
   ['small','medium','large']),/capped at 48/);
 assert.throws(()=>rollupReleaseSamples([],[
   audit(0,'office','A','north')]),/must have an audit/);
});
test('on-demand production smoke covers two scales with actual site diagnostics',()=>{
 const a=auditReleaseMatrix([0],['small','medium']);
 assert.equal(a.sampled,2);
 assert.ok(a.samples.every(x=>x.rooms>=3&&x.doors>=1));
 assert.equal(a.archetypes,1);
 assert.deepEqual(a.scales,['small','medium']);
});
