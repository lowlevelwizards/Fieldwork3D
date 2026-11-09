import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
test('the mission debrief has one presentation owner outside the application entrypoint',()=>{
 const main=read('breach-main.ts');
 const debrief=read('ui/breach-mission-debrief.ts');
 assert.match(main,/renderMissionDebrief\(\{/);
 assert.doesNotMatch(main,/formatCombatReview\(/);
 assert.doesNotMatch(main,/CAREER DEVELOPMENT\\n/);
 assert.match(debrief,/formatCombatReview\(/);
 assert.match(debrief,/sessionIntelligenceReview\(/);
 assert.match(debrief,/OPERATIONS LOGGED/);
});
