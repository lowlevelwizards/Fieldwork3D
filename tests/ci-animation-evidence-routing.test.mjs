import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lanes,infrastructure,matches,selectLanes} from '../scripts/verification/animation-evidence-routing.mjs';
const workflow=readFileSync(new URL('../.github/workflows/animation-physicality-evidence.yml',import.meta.url),'utf8');
test('eight original animation suites retain their path filters and explicit dispatch',()=>{
 assert.equal(Object.keys(lanes).length,8);
 for(const [id,paths] of Object.entries(lanes)){
  assert.deepEqual(selectLanes([],id),[id]);
  assert.ok(workflow.includes('          - '+id+'\n'));
  assert.ok(workflow.includes('steps.select.outputs.'+id));
  assert.ok(workflow.includes("needs.route.outputs."+id+" == 'true'"));
  for(const path of paths){
   assert.ok(workflow.includes("      - '"+path+"'"),path);
   assert.ok(selectLanes([path.replaceAll('*','sample')]).includes(id),id+': '+path);
  }
 }
});
test('glob matching respects path boundaries, exact filenames and shared ownership',()=>{
 assert.ok(matches('tests/animation-a3-*','tests/animation-a3-9-kick.test.mjs'));
 assert.ok(!matches('tests/animation-a3-*','tests/animation-a3-x/nested.test.mjs'));
 assert.ok(!matches('src/breach-3d.ts','src/breach-3dXts'));
 assert.ok(selectLanes(['src/breach-3d.ts']).length>1);
 assert.deepEqual(selectLanes(['unrelated.md']),[]);
});
test('infrastructure changes verify all lanes; manual dispatch can select all or one',()=>{
 for(const p of infrastructure)assert.deepEqual(selectLanes([p]),Object.keys(lanes));
 assert.deepEqual(selectLanes([],'all'),Object.keys(lanes));
 assert.throws(()=>selectLanes([],'unknown'),/Unknown/);
});
