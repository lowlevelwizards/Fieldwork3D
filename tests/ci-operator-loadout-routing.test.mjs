import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectOperatorLoadout,specs} from '../scripts/verification/ci-operator-loadout-routing.mjs';
const wf=name=>readFileSync(new URL('../.github/workflows/'+name+'.yml',import.meta.url),'utf8');
const selected=paths=>Object.entries(selectOperatorLoadout(paths)).filter(([,value])=>value).map(([key])=>key);
test('all original operator/loadout path filters and focused entry points survive consolidation',()=>{
 for(const [key,paths] of Object.entries(specs)){
  const source=wf(key),router=wf('ci-operator-loadout-acceptance');
  assert.match(source,/^  workflow_call:$/m);
  assert.match(source,/^  workflow_dispatch:$/m);
  assert.match(source,/^    branches-ignore: \[main\]$/m);
  assert.ok(source.includes('group: '+key+'-'));
  const pr=source.slice(source.indexOf('  pull_request:'),source.indexOf('  workflow_dispatch:'));
  const filters=[...pr.matchAll(/^      - '([^']+)'$/gm)].map(m=>m[1]);
  assert.deepEqual(paths,filters,key);
  assert.ok(router.includes('uses: ./.github/workflows/'+key+'.yml'));
  for(const path of paths){
   assert.ok(selected([path.replaceAll('**','example').replaceAll('*','example')]).includes(key),key+': '+path);
  }
 }
 assert.ok(wf('weapon-retention-critical').includes('branches: [feature/wr-weapon-retention]'));
});
test('isolated changes skip unrelated operator lanes and shared surfaces retain overlapping tests',()=>{
 assert.deepEqual(selected(['src/operator-backpack-geometry.ts','docs/readme.md']),[]);
 assert.deepEqual(selected(['tests/operator-pose-workbench.test.mjs']),['operator-pose-workbench-smoke']);
 assert.ok(selected(['src/equipment-preview.ts']).includes('loadout-l214-inspection-critical'));
 assert.ok(selected(['src/equipment-preview.ts']).includes('loadout-bench-r1-critical'));
 assert.ok(selected(['src/breach-operator-rig.ts']).includes('operator-animation-integrity'));
 assert.ok(selected(['src/breach-operator-rig.ts']).includes('operator-armor-rig-visual'));
 assert.equal(selected(['package.json']).length,Object.keys(specs).length);
});
