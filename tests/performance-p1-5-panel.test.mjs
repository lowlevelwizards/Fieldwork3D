import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/ui/breach-perf-timeline-panel.ts',import.meta.url),'utf8');
test('P1.5d mobile chart provides spike inspection and one-tap report copying',()=>{
 for(const label of ['PERF HISTORY','GRAPH ▾','DETAILS','COPY',
  'Rolling 60 second','pointerdown','bucketCSV','performanceHotspot'])
  assert.ok(s.includes(label),label);
 assert.match(s,/this\.root=root/);
 assert.match(s,/z-index:9999/);
 assert.match(s,/max-height:62vh/);
 assert.match(s,/navigator\.clipboard\?\.writeText/);
});
test('P1.5d only instantiated in-game or URL diagnostics construct a canvas',()=>{
 assert.match(s,/constructor\(onHide:\(\)=>void=\(\)=>\{\}\)\{/);
 assert.match(s,/this\.hideButton\.addEventListener/);
 assert.match(s,/document\.createElement\('canvas'\)/);
 assert.doesNotMatch(s,/setInterval\(/);
 assert.doesNotMatch(s,/requestAnimationFrame\(/);
});
