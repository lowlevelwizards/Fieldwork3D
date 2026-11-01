import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeSiteQuality} from '../src/worldgen/quality-matrix.ts';
const mk=(seed,archetype,planFamily,entrySide)=>({
 seed,archetype,planFamily,entrySide,layout:'grid',
 designQuality:{score:0},errors:[],incompleteZones:[],
 serviceIssues:[],operationalRouteIssues:[]});
test('seed matrix reveals repeated plan family and fixed entries',()=>{
 const q=summarizeSiteQuality([mk(1,'restaurant','A','east'),
  mk(2,'restaurant','A','east'),mk(3,'restaurant','B','south'),
  mk(4,'clinic','C','north')]);
 assert.equal(q.distinctFamilies,3);
 assert.equal(q.repeatedFamilyShare,25);
 const r=q.byArchetype.find(x=>x.archetype==='restaurant');
 assert.equal(r.distinctPlans,2);assert.equal(r.distinctEntrySides,2);
 assert.equal(r.largestPlanShare,67);
});
test('empty matrix reports zeros without NaNs',()=>{
 const x=summarizeSiteQuality([]);assert.equal(x.distinctFamilies,0);
 assert.equal(x.repeatedFamilyShare,0);
});
