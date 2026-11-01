import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';

test('Map Lab generation uses exactly the selected site scale',()=>{
 const source=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/map-lab-worker.ts',import.meta.url),'utf8');
 assert.match(source,/const id=\+\+generationId,archetype=typeInput.value as BuildingArchetype,choice=siteScale\(\)/);
 assert.match(source,/worker.postMessage\(request\)/);
 assert.match(source,/newSession\(0,site.seed,'floor-plan',site.scale,undefined,site\)/);
 assert.match(worker,/resolveLabScale\(req.scale,seed\)/);
 assert.doesNotMatch(source,/scaleInput.value==='large'/);
});
test('audit exposes furnishing density and empty functional rooms',()=>{
 const result=auditGeneratedSite(12,'standard');
 assert.ok(result.functionalRooms>0);
 assert.equal(result.roomFill.length,result.functionalRooms);
 assert.ok(result.roomFill.every(r=>r.areaM2>0&&r.fixtures>=0));
 assert.deepEqual(result.emptyRooms,result.roomFill.filter(r=>r.fixtures===0).map(r=>r.id));
});
