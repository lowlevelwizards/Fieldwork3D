/** Stage 9 regression: AI decision ownership, explicit physical/evidence
 * authority ports, and no additional simulation clock.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('authoritative session delegates enemy actions and delivered warnings',()=>{
 const game=source('breach-game.ts');
 const controller=source('breach-enemy-decision-controller.ts');
 assert.match(game,/const runEnemyAi=createEnemyDecisionController\(/);
 assert.match(game,/runEnemyAi\.decide\(s,a,h\)/);
 assert.match(game,/runEnemyAi\.distributeReports\(s\)/);
 assert.doesNotMatch(game,/function enemyDecisions\(/);
 assert.doesNotMatch(game,/function distributeReports\(/);
 assert.match(controller,/function enemyDecisions\(s:Session,a:TeamActor,dt:number\)/);
 assert.match(controller,/function distributeReports\(s:Session\)/);
 assert.match(controller,/scanEnemySoundEvidence\(s,a\)/);
 assert.match(controller,/scanEnemyVisualEvidence\(s,a,dt,inSight\)/);
 assert.match(controller,/reportToListener\(report,recipient.id,recipient.p,/);
 assert.match(controller,/report\.deliveredTo\.includes\(recipient.id\)/);
 assert.match(controller,/requestClearFireStep\(s,a,target,'muzzle'\)/);
 assert.match(controller,/approach\(a,/);
 assert.doesNotMatch(controller,/Math\.random|requestAnimationFrame|setTimeout|performance\.now/);
});

test('visual acquisition is fixed-step, actor-personal and not a UI fog source',()=>{
 const game=source('breach-game.ts');
 const visual=source('breach-visual-acquisition.ts');
 assert.match(game,/advanceActorSightProgress\(s,h,geometricallyVisible\)/);
 assert.match(game,/observeActorContactEvidence\(s,inSight\)/);
 assert.doesNotMatch(game,/function advanceVisualAwareness\(/);
 assert.match(visual,/for\(const observer of s\.operators\)/);
 assert.match(visual,/geometricallyVisible\(observer,subject,s\)/);
 assert.match(visual,/addObservation\(observer\.awareness,visibleObservation\(/);
 assert.match(visual,/subject\.side===observer\.side/);
 assert.doesNotMatch(visual,/\b(?:window|document|requestAnimationFrame|Math\.random)\b/);
});

test('decision module contains no second frame loop or game-owned clock',()=>{
 const ai=source('breach-enemy-decision-controller.ts');
 const visual=source('breach-visual-acquisition.ts');
 for(const content of [ai,visual]){
  assert.doesNotMatch(content,/stepSession\s*\(|toggling\s*\(|setInterval\s*\(|Date\.now\s*\(/);
  assert.doesNotMatch(content,/from ['"]three(?:\/|['"])/);
 }
 assert.match(ai,/WeakMap<Session,AiWorkScheduler>/);
 assert.match(ai,/electiveAiWork\(s,a,'search-expand'\)/);
 assert.match(ai,/checks\+\+<2/);
});
