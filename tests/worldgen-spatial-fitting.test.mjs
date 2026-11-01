import test from 'node:test';
import assert from 'node:assert/strict';
import {architecturalBlueprint,blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {fitSpatialProgram,blueprintRelationshipCost} from '../src/worldgen/spatial-program-fit.ts';
import {apartmentUnitBlueprint} from '../src/worldgen/apartment-units.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {generateSite} from '../src/breach-site.ts';

test('bounded fitter retains rooms, frontage, physical dimensions and deterministic improvement',()=>{
 const kinds=['house','townhouse','retail','office','garage','warehouse',
   'restaurant','utility','clinic'];
 let improved=0;
 for(const kind of kinds)for(const seed of [0,4,9,15,28]){
  const start=architecturalBlueprint(kind,seed);
  const after=fitSpatialProgram(start);
  assert.equal(after.widths,start.widths);
  assert.equal(after.depths,start.depths);
  assert.deepEqual(after.front,start.front);
  assert.deepEqual(after.cells.flat().slice().sort(),
    start.cells.flat().slice().sort(),kind+' seed '+seed);
  assert.ok(blueprintRelationshipCost(after)<=blueprintRelationshipCost(start),
    kind+' seed '+seed+' regressed');
  assert.deepEqual(blueprintIssues(after),[],kind+' seed '+seed);
  assert.deepEqual(after,fitSpatialProgram(start));
  if(after!==start)improved++;
 }
 assert.ok(improved>=2,'expected genuine physical room reassignment');
});
test('does not swap public corridors or cross owned dwelling boundaries',()=>{
 const apt=apartmentUnitBlueprint(4,'large');
 assert.strictEqual(fitSpatialProgram(apt),apt);
 const motel=architecturalBlueprint('motel',1);
 assert.strictEqual(fitSpatialProgram(motel),motel);
});
test('real architectural compiler retains doors and playable routes after fitting',()=>{
 for(const kind of ['house','retail','garage','clinic','restaurant']){
  const index=['house','townhouse','apartment','retail','office','garage',
    'warehouse','restaurant','motel','utility','clinic'].indexOf(kind);
  const site=generateSite(index+11*13,'medium');
  assert.equal(site.archetype,kind);
  assert.ok(site.doors.some(d=>d.id==='FRONT'));
  assert.ok(site.rooms.some(r=>r.kind==='room'));
  assert.deepEqual(generateSite(index+11*13,'medium').rooms,site.rooms);
 }
});
