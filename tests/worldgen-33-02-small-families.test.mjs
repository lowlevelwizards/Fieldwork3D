import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHITECTURAL_FAMILIES,architecturalBlueprint,blueprintIssues}
 from '../src/worldgen/architectural-program.ts';
import {sizedBlueprint} from '../src/worldgen/size-blueprints.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
test('all eleven archetypes have three distinct valid small architectural programs',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES){
  const plans=[0,1,2].map(seed=>sizedBlueprint(kind,seed,'small',
   architecturalBlueprint(kind,seed)));
  const families=plans.map(p=>p.family.replace(' / mirrored',''));
  assert.equal(new Set(families).size,3,kind+' family count');
  for(const p of plans){
   assert.deepEqual(blueprintIssues(p),[],kind+': '+p.family);
   assert.ok(p.cells[p.front.row]?.[p.front.col]);
   assert.equal(p.widths.length,p.cells[0].length);
  }
 }
});
test('authored compact alternatives produce actual doors and nonidentical circulation',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES){
  const sites=[0,1,2].map(seed=>compileArchitecturalSite(kind,seed,'small'));
  assert.ok(sites.every(s=>s.doors.some(d=>d.id==='FRONT')),kind);
  if(kind!=='apartment'){
   const shapes=sites.map(s=>JSON.stringify(s.rooms.map(r=>r.purpose+
    ':'+r.x+','+r.y+','+r.w+','+r.h)));
   assert.equal(new Set(shapes).size,3,kind+' physical programs');
  }
 }
});
