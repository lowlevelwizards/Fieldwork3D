import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHITECTURAL_FAMILIES,architecturalBlueprint,blueprintIssues}
 from '../src/worldgen/architectural-program.ts';
import {sizedBlueprint} from '../src/worldgen/size-blueprints.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {generateSite} from '../src/breach-site.ts';

test('small and large plans have distinct functional programs in all 11 families',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES){
  const medium=architecturalBlueprint(kind,12);
  const small=sizedBlueprint(kind,12,'small',medium);
  const large=sizedBlueprint(kind,12,'large',medium);
  for(const plan of [small,medium,large])assert.deepEqual(blueprintIssues(plan),[],kind);
  const count=plan=>plan.cells.flat().filter(Boolean).length;
  assert.ok(count(small)<count(medium),kind+' small did not reduce room cells');
  assert.ok(count(medium)<count(large),kind+' large did not add room cells');
  const sites=['small','medium','large'].map(scale=>compileArchitecturalSite(kind,12,scale));
  assert.ok(sites[0].roomCount<sites[1].roomCount,kind+' size small');
  assert.ok(sites[1].roomCount<sites[2].roomCount,kind+' size large');
 }
});
test('new program tiers generate repeatable playable sites',()=>{
 for(const seed of [22,24,28,31]){
  for(const scale of ['small','medium','large']){
   const site=generateSite(seed,scale);
   const again=generateSite(seed,scale);
   assert.equal(site.scale,scale);
   assert.ok(site.doors.some(d=>d.id==='FRONT'));
   assert.deepEqual(site.rooms,again.rooms,seed+' '+scale);
  }
 }
});
