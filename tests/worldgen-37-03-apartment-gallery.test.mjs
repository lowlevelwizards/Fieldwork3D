import test from 'node:test';
import assert from 'node:assert/strict';
import {apartmentUnitBlueprint} from '../src/worldgen/apartment-units.ts';
import {blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
test('medium apartments offer a transverse public gallery with two private wings',()=>{
 for(const seed of [0,1,5,6]){
  const b=apartmentUnitBlueprint(seed,'medium');
  assert.match(b.family,/transverse T gallery/);
  assert.deepEqual(blueprintIssues(b),[],String(seed));
  assert.equal(b.cells.flat().filter(x=>x==='hallway').length,0);
  assert.ok(b.cells[2].filter(x=>x==='lobby').length>=3);
  const owners=new Set(b.unitIds.flat().filter(Boolean));
  assert.deepEqual([...owners].sort(),['APT-1','APT-2']);
  for(const owner of owners)for(const role of ['living','kitchen','bedroom','bathroom'])
   assert.ok(b.cells.some((row,y)=>row.some((r,x)=>
     r===role&&b.unitIds[y][x]===owner)),owner+' missing '+role);
  assert.deepEqual(apartmentUnitBlueprint(seed,'medium'),b);
 }
});
test('real corridor and courtyard families remain in rotation',()=>{
 assert.match(apartmentUnitBlueprint(2,'medium').family,/shared corridor/);
 assert.match(apartmentUnitBlueprint(3,'medium').family,/atrium/);
 assert.match(apartmentUnitBlueprint(4,'medium').family,/courtyard/);
});
test('new gallery produces a physical FRONT door and separate apartment ownership',()=>{
 for(const seed of [0,1,5]){
  const site=compileArchitecturalSite('apartment',seed,'medium');
  assert.ok(site.doors.some(d=>d.id==='FRONT'),seed+' missing entry');
  assert.equal(site.units?.length,2);
  assert.ok(site.walls.length>0);
 }
});
