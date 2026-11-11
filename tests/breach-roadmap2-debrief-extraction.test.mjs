import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
test('the mission debrief has one presentation owner outside the application entrypoint',()=>{
 const main=read('breach-main.ts');
 const debrief=read('ui/breach-mission-debrief.ts');
 const hud=read('ui/tactical-hud-controller.ts');
 assert.match(main,/hudController\.renderSession\(\{/);
 assert.match(hud,/renderMissionDebrief\(\{/);
 assert.doesNotMatch(main,/formatCombatReview\(/);
 assert.doesNotMatch(main,/CAREER DEVELOPMENT\\n/);
 // Stage 5 preserves the same presentation owner while replacing the
 // obsolete raw combat text dump with a structured mission projection.
 const structured=read('ui/breach-after-action-mission-details.ts');
 assert.match(debrief,/renderStructuredMissionDetails\(/);
 assert.doesNotMatch(debrief,/formatCombatReview\(/);
 assert.match(debrief,/sessionIntelligenceReview\(/);
 assert.match(structured,/summarizeMissionPacing\(/);
 assert.match(structured,/OPERATIONS LOGGED/);
});
