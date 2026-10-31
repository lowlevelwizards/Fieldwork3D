import test from 'node:test';
import assert from 'node:assert/strict';
import {architecturalBlueprint,blueprintIssues}
 from '../src/worldgen/architectural-program.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
test('L-shaped houses, courtyard motels and shipping courts change actual wall silhouettes',()=>{
 for(const kind of ['house','motel','clinic','warehouse','restaurant','office']){
  const plans=new Set();
  for(let seed=0;seed<14;seed++){
   const b=architecturalBlueprint(kind,seed);
   assert.deepEqual(blueprintIssues(b),[],kind+' '+seed);
   plans.add(b.family.replace(' / mirrored',''));
   const site=compileArchitecturalSite(kind,seed);
   assert.equal(site.doors.find(d=>d.id==='FRONT')!==undefined,true);
   assert.ok(site.rooms.every(r=>!!r.purpose));
   assert.ok(site.rooms.filter(r=>r.kind==='hall').every(r=>
      Math.min(r.w,r.h)<88),'corridors remain hallways, not squares');
  }
  assert.ok(plans.size>=2,kind+' only one building shape');
 }
 const courtyard=architecturalBlueprint('motel',0);
 assert.ok(courtyard.cells.some(row=>row.filter(x=>x===null).length>=2));
 assert.ok(courtyard.cells.flat().filter(x=>x==='guest').length>=4);
});
