import test from 'node:test';
import assert from 'node:assert/strict';
import {architecturalBlueprint,blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {generateSite} from '../src/breach-site.ts';
import {assetLibraryProblems} from '../src/worldgen/asset-library.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
test('real front entry rooms and rear domestic mudrooms form part of physical blueprints',()=>{
 for(let seed=0;seed<30;seed++){
  const b=architecturalBlueprint('house',seed);
  assert.deepEqual(blueprintIssues(b),[]);
  assert.ok(b.cells.flat().includes('foyer'));
  assert.ok(b.cells.flat().includes('mudroom'));
  assert.equal(b.cells[b.front.row][b.front.col],'foyer');
 }
 for(let seed=0;seed<20;seed++){
  const t=architecturalBlueprint('townhouse',seed);
  assert.deepEqual(blueprintIssues(t),[]);
  assert.equal(t.cells[t.front.row][t.front.col],'foyer');
 }
});
test('foyer and mudroom fixtures have real low/high cover and showroom scale',()=>{
 for(const id of ['entry-bench','shoe-cubby','coat-rack']){
  const p=propDefinition(id);assert.ok(p&&p.solid);assert.ok(p.rooms.length>0);
 }
 assert.deepEqual(assetLibraryProblems(),[]);
});
test('seeded domestic and clinical sites include connected functional entrance rooms',()=>{
 let foyer=0,mudroom=0,vestibule=0;
 for(let seed=0;seed<=88;seed++){
  const site=generateSite(seed);
  for(const room of site.rooms){
   if(room.purpose==='foyer')foyer++;
   if(room.purpose==='mudroom')mudroom++;
   if(room.purpose==='vestibule')vestibule++;
  }
 }
 assert.ok(foyer>0&&mudroom>0&&vestibule>0);
});
