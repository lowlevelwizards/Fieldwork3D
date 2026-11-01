import test from 'node:test';
import assert from 'node:assert/strict';
import {architecturalBlueprint,blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {sizedBlueprint} from '../src/worldgen/size-blueprints.ts';
import {ensureFacilityProgram,facilityProgramIssues} from '../src/worldgen/facility-programs.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
const types=['clinic','office','retail','garage','warehouse','utility'];
test('staff and visitor facilities are physically authored in medium/large establishments',()=>{
 for(const kind of types)for(const seed of [0,12,33]){
  for(const scale of ['medium','large']){
   const base=architecturalBlueprint(kind,seed);
   const source=scale==='large'?sizedBlueprint(kind,seed,'large',base):base;
   const plan=ensureFacilityProgram(source,scale);
   assert.ok(plan.cells.flat().includes('restroom'),kind+' '+scale);
   assert.deepEqual(facilityProgramIssues(plan),[],kind+' '+scale);
   assert.deepEqual(blueprintIssues(plan),[],kind+' blueprint');
   const compiled=compileArchitecturalSite(kind,seed,scale);
   assert.ok(compiled.rooms.some(r=>r.purpose==='restroom'),kind+' room');
   assert.ok(compiled.doors.some(d=>d.id==='FRONT'),kind+' entry');
  }
 }
});
test('compact and complete apartment/motel programs keep their existing topology',()=>{
 for(const kind of ['house','apartment','motel','restaurant']){
  const original=architecturalBlueprint(kind,13);
  assert.deepEqual(ensureFacilityProgram(original,'small'),original);
  assert.deepEqual(ensureFacilityProgram(original,'medium'),original);
 }
});
