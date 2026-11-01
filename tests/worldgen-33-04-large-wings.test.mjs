import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHITECTURAL_FAMILIES,architecturalBlueprint,blueprintIssues}
 from '../src/worldgen/architectural-program.ts';
import {sizedBlueprint} from '../src/worldgen/size-blueprints.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {apartmentUnitBlueprint} from '../src/worldgen/apartment-units.ts';
test('large map massing has added depth, side wings, and notched courts',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES){
  const programs=[0,1,2].map(seed=>sizedBlueprint(kind,seed,'large',
   architecturalBlueprint(kind,seed)));
  assert.equal(new Set(programs.map(p=>p.family)).size,3,kind);
  for(const p of programs){
   assert.deepEqual(blueprintIssues(p),[],kind+' '+p.family);
   assert.ok(p.cells.flat().filter(Boolean).length>
    architecturalBlueprint(kind,0).cells.flat().filter(Boolean).length,
    kind+' '+p.family+' must add usable sections');
  }
  assert.ok(programs[1].widths.length>architecturalBlueprint(kind,1).widths.length,
    kind+' lateral wing missing');
  assert.ok(programs[2].depths.length>architecturalBlueprint(kind,2).depths.length,
    kind+' rear wing missing');
 }
});
test('large building family candidates compile with actual entrance thresholds',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES){
  for(const seed of [0,1,2]){
   const site=compileArchitecturalSite(kind,seed,'large');
   assert.ok(site.rooms.length>0,kind+' '+seed);
   assert.ok(site.doors.some(d=>d.id==='FRONT'),kind+' '+seed);
  }
 }
});
test('large apartment units still use dedicated multi-flat ownership grammar',()=>{
 for(const seed of [0,1,2]){
  const b=apartmentUnitBlueprint(seed,'large');
  assert.ok(new Set(b.unitIds?.flat().filter(Boolean)).size>=4);
  assert.deepEqual(blueprintIssues(b),[]);
 }
});
