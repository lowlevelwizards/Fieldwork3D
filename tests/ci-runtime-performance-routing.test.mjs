import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {specs,infrastructure,selectRuntimePerformance} from '../scripts/verification/runtime-performance-routing.mjs';
const picked=(paths,manual)=>Object.entries(selectRuntimePerformance(paths,manual)).filter(([,v])=>v).map(([k])=>k);
test('every performance lane has its exact original source triggers and manual selection',()=>{
 for(const [lane,paths] of Object.entries(specs)){
  for(const p of paths)assert.ok(picked([p]).includes(lane),p);
  assert.deepEqual(picked([],lane),[lane]);
 }
 assert.deepEqual(picked([], 'all'),Object.keys(specs));
 assert.deepEqual(picked(['docs/readme.md']),[]);
 assert.deepEqual(picked(['src/breach-runtime-loop.ts']),['ui-attribution','runtime-listeners']);
 assert.deepEqual(picked(['src/breach-simulation-motion-phase.ts']),['civilian-sensing','movement-authority']);
 for(const p of infrastructure)assert.deepEqual(picked([p]),Object.keys(specs));
 assert.throws(()=>picked([],'unknown'),/Unknown lane/);
});
test('shared workflow retains triggers, focused steps and one production build',()=>{
 const w=readFileSync(new URL('../.github/workflows/runtime-performance-critical.yml',import.meta.url),'utf8');
 const filters=[...w.matchAll(/^      - '([^']+)'$/gm)].map(m=>m[1]);
 assert.deepEqual(new Set(filters),new Set([...Object.values(specs).flat(),...infrastructure]));
 for(const lane of Object.keys(specs))assert.ok(w.includes('steps.route.outputs.'+lane+" == 'true'"));
 assert.equal((w.match(/npm run check && npx vite build/g)||[]).length,1);
 assert.equal((w.match(/npm install --no-audit --no-fund/g)||[]).length,1);
});
