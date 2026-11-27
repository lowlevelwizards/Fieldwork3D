import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lanes,infrastructure,selectLanes} from '../scripts/verification/rendering-evidence-routing.mjs';
test('rendering evidence retains every prior lane and selects exact path owners',()=>{
  assert.equal(Object.keys(lanes).length,16);
  for(const [id,paths] of Object.entries(lanes)) for(const path of paths) assert.ok(selectLanes([path]).includes(id),id+': '+path);
  assert.deepEqual(selectLanes(['docs/README.md']),[]);
  assert.deepEqual(selectLanes(['src/breach-3d.ts']).sort(),['cold-renderer','live-scene','preflight','shadow-submit','template-cache','fixture-cache','service-cache'].sort());
});
test('manual dispatch selects one lane or all; infrastructure changes validate all lanes',()=>{
  for(const id of Object.keys(lanes)) assert.deepEqual(selectLanes([],id),[id]);
  assert.deepEqual(selectLanes([],'all'),Object.keys(lanes));
  for(const path of infrastructure) assert.deepEqual(selectLanes([path]),Object.keys(lanes));
  assert.throws(()=>selectLanes([],'missing'),/Unknown/);
});

test('every routed rendering lane has a matching job, trigger and manual option',()=>{
 const w=readFileSync(new URL('../.github/workflows/rendering-performance-evidence.yml',import.meta.url),'utf8');
 for(const [id,paths] of Object.entries(lanes)){
  assert.ok(w.includes('  '+id+':\\n    needs: route'.replace('\\n','\n')),id);
  assert.ok(w.includes('          - '+id+'\n'),id);
  assert.ok(w.includes('steps.select.outputs.'+id),id);
  for(const p of paths)assert.ok(w.includes("      - '"+p+"'"),p);
 }
});
