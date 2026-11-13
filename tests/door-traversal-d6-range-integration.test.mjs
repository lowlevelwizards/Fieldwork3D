import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('D6 range uses the real production Session with optional mobile traces',()=>{
 const html=read('door-test-range.html');
 const runtime=read('src/door-test-range-main.ts');
 assert.match(html,/id="mobileProfile"/);
 assert.match(html,/id="mobileChart"/);
 assert.match(runtime,/new DoorRangeMobileProfile\(/);
 assert.match(runtime,/mobileProfile:profile\?\.snapshot\(/);
 assert.match(runtime,/profile\.add\(\{at:now,raf:gap,sim:simMs,paint:paintMs,steps\}\)/);
 assert.match(runtime,/stepSession\(s,1\/60\)/);
 assert.match(runtime,/if\(steps>0\)paint\(\)/);
 const tick=runtime.slice(runtime.indexOf('function tick(){'),runtime.indexOf('function toggle(){'));
 assert.doesNotMatch(tick,/paint\(\)/,'D6 cannot redraw on each fixed substep');
 assert.match(runtime,/profileToggle\.checked\?new DoorRangeMobileProfile\(\):null/);
});
