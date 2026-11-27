import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lanes,infrastructure,selectLanes} from '../scripts/verification/rendering-evidence-routing.mjs';
test('rendering evidence retains every prior lane and selects exact path owners',()=>{
  assert.equal(Object.keys(lanes).length,9);
  for(const [id,paths] of Object.entries(lanes)) for(const path of paths) assert.ok(selectLanes([path]).includes(id),id+': '+path);
  assert.deepEqual(selectLanes(['docs/README.md']),[]);
  assert.deepEqual(selectLanes(['src/breach-3d.ts']).sort(),['cold-renderer','live-scene','preflight','shadow-submit'].sort());
});
test('manual dispatch selects one lane or all; infrastructure changes validate all lanes',()=>{
  for(const id of Object.keys(lanes)) assert.deepEqual(selectLanes([],id),[id]);
  assert.deepEqual(selectLanes([],'all'),Object.keys(lanes));
  for(const path of infrastructure) assert.deepEqual(selectLanes([path]),Object.keys(lanes));
  assert.throws(()=>selectLanes([],'missing'),/Unknown/);
});
