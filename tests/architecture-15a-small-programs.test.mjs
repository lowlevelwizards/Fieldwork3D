import test from 'node:test';
import assert from 'node:assert/strict';
import {sizedBlueprint} from '../src/worldgen/size-blueprints.ts';
import {architecturalBlueprint,blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {ensureFacilityProgram,facilityProgramIssues} from '../src/worldgen/facility-programs.ts';
import {specializeBlueprint} from '../src/worldgen/subtype-blueprints.ts';
test('compact offices, shops and utility plants have actual sanitary rooms',()=>{
 for(const kind of ['office','retail','utility']){
  const small=sizedBlueprint(kind,12,'small',architecturalBlueprint(kind,12));
  const final=ensureFacilityProgram(small,'small');
  assert.ok(final.cells.flat().includes('restroom'),kind);
  assert.deepEqual(facilityProgramIssues(final),[]);
  assert.equal(final.cells[final.front.row][final.front.col],
    small.cells[small.front.row][small.front.col],'public entrance protected');
  assert.deepEqual(blueprintIssues(final),[]);
 }
});
test('small cafes and diners get real checkout, without removing kitchen or dining',()=>{
 const small=sizedBlueprint('restaurant',16,'small',architecturalBlueprint('restaurant',16));
 for(const subtype of ['cafe','diner']){
  const b=specializeBlueprint(small,subtype);
  assert.ok(b.cells.flat().includes('checkout'));
  assert.ok(b.cells.flat().includes('kitchen'));
  assert.ok(b.cells.flat().includes('dining'));
  assert.deepEqual(blueprintIssues(b),[]);
 }
});
test('small repair shop specializes without erasing its working bay',()=>{
 const small=sizedBlueprint('garage',14,'small',architecturalBlueprint('garage',14));
 const b=specializeBlueprint(small,'tire-service');
 assert.ok(b.cells.flat().includes('parts'));
 assert.ok(b.cells.flat().includes('bay'));
 assert.deepEqual(blueprintIssues(b),[]);
});
