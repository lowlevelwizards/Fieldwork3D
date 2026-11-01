import test from 'node:test';
import assert from 'node:assert/strict';
import {apartmentUnitBlueprint} from '../src/worldgen/apartment-units.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {generateSite} from '../src/breach-site.ts';
test('medium apartments offer both central atrium and true U courtyard topologies',()=>{
 const atrium=apartmentUnitBlueprint(13,'medium');
 const courtyard=apartmentUnitBlueprint(24,'medium');
 assert.match(atrium.family,/atrium/);
 assert.match(courtyard.family,/courtyard/);
 assert.notDeepEqual(atrium.cells,courtyard.cells);
 assert.deepEqual(blueprintIssues(courtyard),[]);
 assert.ok(courtyard.cells.slice(0,2).every(row=>row[3]===null),
  'rear courtyard must be physical outside void across two rows');
 assert.equal(courtyard.cells[2][3],'lobby');
 assert.equal(courtyard.cells[4][3],'lobby');
});
test('inset courtyard keeps apartments self-contained on either side of lobby',()=>{
 const plan=apartmentUnitBlueprint(24,'medium');
 const units=new Set();
 for(let y=0;y<plan.cells.length;y++)for(let x=0;x<plan.widths.length;x++){
  const role=plan.cells[y][x],unit=plan.unitIds?.[y]?.[x];
  if(!role||role==='lobby'||role==='hallway')assert.equal(unit,null);
  else{assert.ok(unit==='APT-1'||unit==='APT-2');units.add(unit);}
 }
 assert.deepEqual([...units].sort(),['APT-1','APT-2']);
 const built=compileArchitecturalSite('apartment',24,'medium');
 assert.equal(built.units?.length,2);
 assert.ok(built.doors.some(x=>x.id==='FRONT'));
 assert.ok(built.rooms.filter(x=>x.purpose==='lobby').length>=4);
});
test('live apartment generation is stable with a genuine courtyard variant',()=>{
 const first=generateSite(24,'medium'),again=generateSite(24,'medium');
 assert.deepEqual(first.rooms,again.rooms);
 assert.deepEqual(first.doors,again.doors);
 assert.ok(first.spawn.length>=2);
});
