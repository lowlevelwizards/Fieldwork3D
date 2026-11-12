import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('D0 Door Test Range is built and discoverable in existing development labs',()=>{
 const html=read('door-test-range.html'),vite=read('vite.config.ts'),
   landing=read('index.html'),lab=read('physicality-lab.html');
 assert.match(html,/id="doorStage"/);
 assert.match(html,/id="scenario"/);
 assert.match(html,/id="copy"/);
 assert.match(vite,/doorTestRange:\s*'door-test-range.html'/);
 assert.match(landing,/door-test-range.html/);
 assert.match(lab,/door-test-range.html/);
});
test('D0 Door Test Range drives the actual Session, never alternate lab physics',()=>{
 const src=read('src/door-test-range-main.ts');
 for(const contract of ['newSession(', 'stepSession(', 'planSquadEntry(',
    'planMove(', 'prepareDoorRangeCase(', 'syncDoorTraversalEpisode']){
  // The last helper is consumed by the same actor motor and reflected
  // through live actor.doorTraversal, not called independently by the lab.
  assert.ok(src.includes(contract)||contract==='syncDoorTraversalEpisode'&&
   src.includes('a.doorTraversal'),contract);
 }
 assert.doesNotMatch(src,/resolveMovementFrame\(/);
 assert.match(src,/doorLeafSegment\(/);
});
