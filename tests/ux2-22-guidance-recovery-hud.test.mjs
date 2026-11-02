import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ContextualTeaching,resolveHudPresentation} from '../src/ui/contextual-teaching.ts';
import {recoveryAdviceFor} from '../src/ui/recovery-guidance.ts';
import {ExecutionNoticeFeed} from '../src/ui/execution-feedback.ts';

test('first-use teaching is one-time, expires and persists when possible',()=>{
 const memory=new Set();
 const coach=new ContextualTeaching(k=>memory.has(k),k=>memory.add(k));
 assert.equal(coach.offer('waypoint','Drag to move',100,2000),true);
 assert.equal(coach.current(500)?.text,'Drag to move');
 assert.equal(coach.current(2100),null);
 assert.equal(coach.offer('waypoint','Drag to move',2200),false);
 assert.ok(memory.has('waypoint'));
 const subsequent=new ContextualTeaching(k=>memory.has(k),()=>{});
 assert.equal(subsequent.offer('waypoint','Repeated',3000),false);
});
test('target instructions and manual help outrank coaching; danger silences tips',()=>{
 const p=resolveHudPresentation({phase:'planning',urgency:'normal',
   explicitHelp:false,coaching:true,targetPrompt:false});
 assert.deepEqual(p,{showGuidance:true,showCoaching:true,compactMission:false});
 const target=resolveHudPresentation({phase:'targeting',urgency:'warning',
   explicitHelp:false,coaching:true,targetPrompt:true});
 assert.equal(target.showGuidance,true);
 assert.equal(target.showCoaching,false);
 const critical=resolveHudPresentation({phase:'planning',urgency:'contact',
   explicitHelp:false,coaching:true,targetPrompt:false});
 assert.equal(critical.showGuidance,false);
 const executing=resolveHudPresentation({phase:'execution',urgency:'danger',
   explicitHelp:true,coaching:true,targetPrompt:false});
 assert.equal(executing.showGuidance,false);
 assert.equal(executing.compactMission,true);
});
test('error advice is actionable and does not infer concealed geography',()=>{
 assert.match(recoveryAdviceFor('DESTINATION HAS INSUFFICIENT CLEARANCE').next,/nearby clear floor/);
 assert.match(recoveryAdviceFor('MOVE WOULD INVALIDATE A LATER WAYPOINT').next,/later waypoint/);
 assert.match(recoveryAdviceFor('FLASH TARGET BLOCKED \/ OUT OF RANGE').next,/closer/);
 assert.match(recoveryAdviceFor('ROOK BLOCKED · FURNITURE').next,/route/);
 assert.match(recoveryAdviceFor('DOOR NOT REACHABLE FROM THAT POINT').next,/door action/);
 assert.equal(recoveryAdviceFor('CONTACT HOSTILE'),null);
 assert.equal(recoveryAdviceFor('ROOK RELOADED'),null);
});
test('recovery instructions travel with prioritized warnings',()=>{
 const feed=new ExecutionNoticeFeed();
 feed.update([],'planning',0);
 const warn=feed.update(['DESTINATION HAS INSUFFICIENT CLEARANCE'],'planning',100);
 assert.equal(warn?.severity,'warning');
 assert.match(warn?.recovery??'',/nearby clear floor/);
 assert.equal(feed.update(['DESTINATION HAS INSUFFICIENT CLEARANCE',
  'ROOK RELOADED'],'planning',200)?.severity,'warning');
});
test('integration only renders tips in planning, no extra permanent HUD control',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(main,/resolveHudPresentation\(/);
 assert.match(main,/teaching\.offer\(/);
 assert.match(main,/tacticalFeedback\.emit\('error'/);
 assert.match(main,/document\.body\.dataset\.hudPhase=/);
 assert.match(html,/id="hint"/);
 assert.match(html,/id="feed"/);
});
