import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectVisualWorld,specs,matchesGlob} from '../scripts/verification/ci-visual-world-routing.mjs';
const wf=name=>readFileSync(new URL('../.github/workflows/'+name+'.yml',import.meta.url),'utf8');
const selected=paths=>Object.entries(selectVisualWorld(paths)).filter(([,value])=>value).map(([key])=>key);
test('every prior positive path filter is retained and main PRs enter one router',()=>{
 for(const [key,paths] of Object.entries(specs)){
  const source=wf(key),router=wf('ci-visual-world-acceptance');
  assert.match(source,/^  workflow_call:$/m);
  assert.match(source,/^  workflow_dispatch:$/m);
  assert.match(source,/^    branches-ignore: \[main\]$/m);
  assert.ok(source.includes('group: '+key+'-'));
  const oldFilters=[...source.slice(0,source.indexOf('jobs:')).matchAll(/^      - '([^']+)'$/gm)].map(m=>m[1]);
  assert.deepEqual(paths,oldFilters,key);
  assert.ok(router.includes('uses: ./.github/workflows/'+key+'.yml'));
  for(const path of paths){
   const example=path.replaceAll('**','example').replaceAll('*','example');
   assert.ok(selected([example]).includes(key),key+': '+path);
  }
 }
});
test('disjoint changes do not trigger unrelated visual lanes',()=>{
 assert.deepEqual(selected(['src/operator-backpack-geometry.ts','docs/readme.md']),[]);
 assert.deepEqual(selected(['tests/vfx-v13-blood-evidence.test.mjs']),['vfx-v13-blood']);
 assert.deepEqual(selected(['tests/veh-parking.test.mjs']),['veh-vehicle']);
 assert.ok(selected(['src/breach-3d.ts']).includes('vfx-v13-blood'));
 assert.ok(selected(['src/breach-3d.ts']).includes('veh-vehicle'));
});
test('infrastructure changes select all lanes and file order is stable',()=>{
 assert.equal(selected(['package.json']).length,Object.keys(specs).length);
 assert.deepEqual(selected(['tests/veh-parking.test.mjs','tests/vfx-v13-blood-evidence.test.mjs']),selected(['tests/vfx-v13-blood-evidence.test.mjs','tests/veh-parking.test.mjs']));
});

test('GitHub path glob semantics preserve nested double-star and slash boundaries',()=>{
 assert.ok(matchesGlob('src/breach-render/nested.ts','src/breach-**'));
 assert.ok(!matchesGlob('src/worldgen/vehicle-folder/sub.ts','src/worldgen/vehicle-*.ts'));
 assert.ok(!matchesGlob('tests/vfx-v13-blood-evidenceXtestYmjs','tests/vfx-v13-blood-evidence.test.mjs'));
});
