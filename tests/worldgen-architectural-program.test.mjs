import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHITECTURAL_FAMILIES,architecturalBlueprint,blueprintIssues}
 from '../src/worldgen/architectural-program.ts';
test('eleven building-specific blueprints have sensible front doors, proportions and unique circulation',()=>{
 assert.equal(ARCHITECTURAL_FAMILIES.length,11);
 for(const kind of ARCHITECTURAL_FAMILIES)for(const seed of [0,1,19,147]){
  const b=architecturalBlueprint(kind,seed);
  assert.deepEqual(blueprintIssues(b),[],kind+' / '+seed);
  assert.deepEqual(b,architecturalBlueprint(kind,seed));
 }
 const house=architecturalBlueprint('house',8);
 assert.ok(house.cells.flat().filter(r=>r==='living').length>=3);
 const motel=architecturalBlueprint('motel',9);
 assert.equal(motel.cells.flat().filter(r=>r==='guest').length,4);
 const clinic=architecturalBlueprint('clinic',10);
 assert.equal(clinic.cells[clinic.front.row][clinic.front.col],'waiting');
 const families=new Set(ARCHITECTURAL_FAMILIES.map(
  kind=>architecturalBlueprint(kind,3).family));
 assert.equal(families.size,11);
});
