import test from 'node:test';
import assert from 'node:assert/strict';
import {architecturalBlueprint,blueprintIssues}
 from '../src/worldgen/architectural-program.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
test('third architectural families vary room count and real perimeter geometry',()=>{
 for(const kind of ['house','clinic','motel','warehouse','retail']){
  const families=new Set(),counts=new Set(),shapes=new Set();
  for(let seed=0;seed<36;seed++){
   const b=architecturalBlueprint(kind,seed);
   assert.deepEqual(blueprintIssues(b),[],kind+' '+seed);
   const site=compileArchitecturalSite(kind,seed,'standard');
   assert.ok(site.doors.find(d=>d.id==='FRONT'));
   assert.ok(site.rooms.every(r=>!!r.purpose));
   families.add(b.family.replace(' / mirrored',''));
   counts.add(site.rooms.length);
   shapes.add(site.walls.map(w=>w.a.x+','+w.a.y).join(';'));
  }
  assert.ok(families.size>=3,kind+' should have >=3 massing families');
  assert.ok(shapes.size>10);
  if(kind==='motel'||kind==='warehouse')assert.ok(counts.size>=2);
 }
 const motel=architecturalBlueprint('motel',0);
 assert.equal(motel.cells.flat().filter(r=>r==='guest').length,5);
 assert.ok(motel.cells.some(row=>row.filter(r=>r===null).length>=2));
});
