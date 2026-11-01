import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {straightWorkApproach}
 from '../src/worldgen/operational-route-audit.ts';
import {generateSite} from '../src/breach-site.ts';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('a short physically unobstructed work approach avoids route expansion',()=>{
 const from={x:0,y:0},to={x:120,y:0};
 assert.equal(straightWorkApproach(from,to,()=>true),true);
 assert.equal(straightWorkApproach(from,to,p=>p.x<54||p.x>64),false);
 assert.equal(straightWorkApproach(from,{x:260,y:0},()=>true),false);
 assert.equal(straightWorkApproach(from,to,()=>false),false);
});
test('generator reports real worker, audit and preview timings',()=>{
 const worker=file('src/map-lab-worker.ts');
 const main=file('src/map-lab-main.ts');
 const protocol=file('src/map-lab-generation.ts');
 assert.match(worker,/const generationStart=performance\.now\(\)/);
 assert.match(worker,/const auditStart=performance\.now\(\)/);
 assert.match(worker,/workerMs:Math\.round\(performance\.now\(\)-startedAt\)/);
 assert.match(main,/TIMING: worldgen/);
 assert.match(main,/previewMs=Math\.round\(performance\.now\(\)-previewStart\)/);
 assert.match(main,/response\.timing/);
 assert.match(protocol,/export type GeneratorTiming=/);
});
test('direct approach shortcut does not disturb reproducible site geometry',()=>{
 for(const seed of [3,8]){
  const first=generateSite(seed,'small'),again=generateSite(seed,'small');
  assert.deepEqual(first.rooms,again.rooms);
  assert.deepEqual(first.cover,again.cover);
 }
});
