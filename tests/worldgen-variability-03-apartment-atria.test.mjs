import test from 'node:test';
import assert from 'node:assert/strict';
import {apartmentUnitBlueprint} from '../src/worldgen/apartment-units.ts';
import {blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {generateSite} from '../src/breach-site.ts';
test('medium apartment has an atrium variant with no long shared hallway spine',()=>{
 const plan=apartmentUnitBlueprint(13,'medium');
 assert.match(plan.family,/atrium/);
 assert.deepEqual(blueprintIssues(plan),[]);
 assert.ok(plan.cells.flat().filter(x=>x==='hallway').length===0);
 assert.ok(plan.cells.flat().filter(x=>x==='lobby').length>=4);
 assert.ok(plan.cells.some(row=>row.includes(null)),'entry and void must be inset');
});
test('both private flats have access to the atrium without leaking ownership',()=>{
 const b=apartmentUnitBlueprint(13,'medium');
 const privateRooms=new Set(),publicRooms=new Set();
 for(let y=0;y<b.cells.length;y++)for(let x=0;x<b.widths.length;x++){
  const role=b.cells[y][x],unit=b.unitIds[y][x];
  if(role==='lobby'||role==='hallway'||role===null){
   assert.equal(unit,null,'public lobby and outdoor cutout must stay shared');
   publicRooms.add(y+':'+x);
  }else{
   assert.ok(unit==='APT-1'||unit==='APT-2');
   privateRooms.add(unit);
  }
 }
 assert.deepEqual([...privateRooms].sort(),['APT-1','APT-2']);
 const site=compileArchitecturalSite('apartment',13,'medium');
 assert.ok(site.doors.some(d=>d.id==='FRONT'));
 assert.ok(site.units?.length===2);
});
test('atrium selection changes actual built rooms and remains deterministic',()=>{
 const a=apartmentUnitBlueprint(13,'medium');
 const b=apartmentUnitBlueprint(14,'medium');
 assert.notDeepEqual(a.cells,b.cells);
 assert.deepEqual(apartmentUnitBlueprint(13,'medium'),a);
 const site=generateSite(13,'medium');
 assert.ok(site.doors.some(d=>d.id==='FRONT'));
 assert.deepEqual(generateSite(13,'medium').rooms,site.rooms);
});
