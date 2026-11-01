import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHITECTURAL_FAMILIES,architecturalBlueprint,blueprintIssues}
 from '../src/worldgen/architectural-program.ts';
import {apartmentUnitBlueprint} from '../src/worldgen/apartment-units.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';

test('all archetypes have three distinct medium architectural layouts',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES){
  const programs=[0,4,7].map(seed=>architecturalBlueprint(kind,seed));
  assert.equal(new Set(programs.map(x=>x.family.replace(' / mirrored',''))).size,3,
   kind+' missing medium families');
  for(const p of programs)assert.deepEqual(blueprintIssues(p),[],kind+' '+p.family);
 }
});
test('medium apartment family changes real rooms but keeps unit ownership',()=>{
 const plans=[0,1,2].map(seed=>apartmentUnitBlueprint(seed,'medium'));
 assert.equal(new Set(plans.map(p=>p.family)).size,3);
 for(const p of plans){
  assert.ok(p.unitIds?.length===p.cells.length);
  for(let row=0;row<p.cells.length;row++)for(let col=0;col<p.widths.length;col++)
   if(p.cells[row][col]==='hallway'||p.cells[row][col]==='lobby')
    assert.equal(p.unitIds[row][col],null);
 }
 assert.ok(plans[2].cells.flat().filter(role=>role==='bedroom').length>
  plans[0].cells.flat().filter(role=>role==='bedroom').length);
});
test('new medium layout programs produce actual front access',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES){
  const site=compileArchitecturalSite(kind,0,'medium');
  assert.ok(site.doors.some(d=>d.id==='FRONT'),kind);
  assert.ok(site.rooms.length>=8,kind);
 }
});
