import test from 'node:test';
import assert from 'node:assert/strict';
import {architecturalBlueprint,blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {specializeBlueprint} from '../src/worldgen/subtype-blueprints.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {generateSite} from '../src/breach-site.ts';
const variants=[
 ['retail','convenience-store','stockroom','sales'],
 ['retail','hardware-store','storage','stockroom'],
 ['office','open-workplace','office','cubicles'],
 ['garage','tire-service','bay','parts'],
 ['warehouse','distribution','storage','packing'],
 ['restaurant','cafe','service','checkout'],
 ['clinic','urgent-care','exam','treatment']
];
test('building subtype visibly changes its spatial work program',()=>{
 for(const [kind,subtype,from,to] of variants){
  const original=architecturalBlueprint(kind,0);
  const result=specializeBlueprint(original,subtype);
  const count=(plan,role)=>plan.cells.flat().filter(v=>v===role).length;
  assert.equal(count(result,to),count(original,to)+1,kind+' '+subtype);
  assert.equal(count(result,from),count(original,from)-1,kind+' '+subtype);
  assert.deepEqual(blueprintIssues(result),[],kind+' '+subtype);
  assert.deepEqual(specializeBlueprint(original,subtype),result);
  const live=compileArchitecturalSite(kind,0,'medium',subtype);
  assert.ok(live.planFamily.includes(subtype),kind+' name');
  assert.ok(live.rooms.some(r=>r.purpose===to),kind+' '+to);
 }
});
test('subtype layouts preserve generation determinism across real site types',()=>{
 for(const seed of [3,4,5,6,7,10,14,16,18,29]){
  const site=generateSite(seed,'medium');
  const again=generateSite(seed,'medium');
  assert.deepEqual(site.rooms,again.rooms);
  assert.equal(site.identity.subtype,again.identity.subtype);
 }
});
