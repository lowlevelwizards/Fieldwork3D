import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team} from '../src/breach-game.ts';
import {incomingHitFacing,hitFacingInterrupted}
 from '../src/breach-combat-reactions.ts';
import {fireCorrectionStopReason,cancelFireCorrection,
 correctionContactChanged} from '../src/breach-fire-recovery-policy.ts';

const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const actor=()=>{
 const a=team(newSession())[0];
 a.health=4;a.surrendered=false;a.pace='walk';a.reload=0;
 a.firePolicy='engage';a.targetId=null;a.magazine=12;
 a.flashUntil=-1;a.traversal=null;a.traversalPending=null;
 a.squeeze=false;a.motorPause=null;a.fireRetreatTarget={x:a.p.x+8,y:a.p.y};
 a.fireRetreatUntil=10;
 a.plan=[{id:42,kind:'move',p:{x:a.p.x+80,y:a.p.y}}];
 a.fireRetreatPlanId=42;a.fireRetreatPlanKind='move';
 a.fireRetreatPlanPoint={...a.plan[0].p};
 a.fireRetreatContactId='red/1';
 return a;
};

test('D2.3: bounded existing correction persists only without higher intent',()=>{
 const a=actor();
 assert.equal(fireCorrectionStopReason(a,2),null);
 assert.equal(fireCorrectionStopReason(a,10.01),'expired');
 a.reload=.5;
 assert.equal(fireCorrectionStopReason(a,2),'physical-action');
 a.reload=0;a.pace='run';
 assert.equal(fireCorrectionStopReason(a,2),'physical-action');
 a.pace='walk';a.firePolicy='hold';
 assert.equal(fireCorrectionStopReason(a,2),'fire-policy');
 a.firePolicy='return';a.suppression=0;a.lastHitAt=-100;
 assert.equal(fireCorrectionStopReason(a,2),'fire-policy');
 a.firePolicy='engage';a.health=0;
 assert.equal(fireCorrectionStopReason(a,2),'incapacitated');
});
test('D2.3: plan editing/dragging immediately interrupts without hashing or rescanning',()=>{
 const a=actor();
 assert.equal(fireCorrectionStopReason(a,2),null);
 a.plan[0].p.x+=10;
 assert.equal(fireCorrectionStopReason(a,2),'plan-changed');
 a.plan[0].p.x-=10;a.plan[0].kind='look';
 assert.equal(fireCorrectionStopReason(a,2),'plan-changed');
 a.plan[0].kind='move';a.plan[0].id=43;
 assert.equal(fireCorrectionStopReason(a,2),'plan-changed');
 a.plan[0].id=42;a.plan[0].kind='tool';
 assert.equal(fireCorrectionStopReason(a,2),'plan-changed');
 a.plan[0].kind='move';a.plan[0].moveMode='sprint';
 assert.equal(fireCorrectionStopReason(a,2),'authored-action');
});
test('D2.3: cancellation clears only transient recovery, never authored orders',()=>{
 const a=actor();
 a.nav=[{x:a.p.x+3,y:a.p.y}];
 const planned=structuredClone(a.plan);
 cancelFireCorrection(a);
 assert.equal(a.fireRetreatTarget,null);
 assert.equal(a.fireRetreatReason,null);
 assert.equal(a.fireRetreatContactId,null);
 assert.equal(a.fireRetreatPlanPoint,null);
 assert.equal(a.fireRetreatPlanKind,null);
 assert.equal(a.fireRetreatPlanId,null);
 assert.deepEqual(a.nav,[]);
 assert.deepEqual(a.plan,planned);
 assert.equal(correctionContactChanged(a,'red/2'),false);
});
test('D2.3: different confirmed contact interrupts, same contact commits',()=>{
 const a=actor();
 assert.equal(correctionContactChanged(a,'red/1'),false);
 assert.equal(correctionContactChanged(a,'red/2'),true);
 assert.equal(correctionContactChanged(a,null),true);
 a.fireRetreatContactId=null;
 assert.equal(correctionContactChanged(a,null),false,
  'older replay without provenance only uses its bounded lease');
 a.side='red';a.alert='retreat';
 assert.equal(fireCorrectionStopReason(a,2),'defensive-alarm');
 a.alert='engaging';
 assert.equal(fireCorrectionStopReason(a,2,true),'defensive-alarm');
});
test('D2.3: hit-facing yields to physical/hard actions and ongoing contact',()=>{
 const a=actor();
 a.fireRetreatTarget=null;
 a.plan=[{id:8,kind:'look',p:{x:40,y:50}}];
 a.lastShotAt=-100;
 assert.equal(hitFacingInterrupted(a,2),false);
 assert.notEqual(incomingHitFacing(0,0,.4,
  {busy:hitFacingInterrupted(a,2)}),null);
 a.plan[0].kind='tool';
 assert.equal(hitFacingInterrupted(a,2),true);
 a.plan[0].kind='look';a.motorPause='contact';
 assert.equal(hitFacingInterrupted(a,2),true);
 a.motorPause=null;a.targetId='red/1';a.lastShotAt=1.9;
 assert.equal(hitFacingInterrupted(a,2),true);
 a.lastShotAt=0;
 assert.equal(hitFacingInterrupted(a,2),false);
});
test('D2.3: ownership and no quiet-tick reactive work in fixed-tick sources',()=>{
 const orders=source('breach-order-executor.ts');
 const actorPhase=source('breach-simulation-actor-phase.ts');
 const enemy=source('breach-enemy-decision-controller.ts');
 const firing=source('breach-firing-pipeline.ts');
 assert.match(orders,/fireCorrectionStopReason\(a,s.seconds\)/);
 assert.match(orders,/cancelFireCorrection\(a\)/);
 assert.match(enemy,/fireCorrectionStopReason\(a,s.seconds,!!freshAlarm\)/);
 assert.match(actorPhase,/a.plan.length&&hitAge>=.16&&hitAge<=1.20/);
 assert.match(orders,/recentHit\?\?aimHeading\(a\)/);
 assert.match(firing,/correctionContactChanged\(a,target.id\)/);
 assert.match(firing,/if\(a.fireRetreatTarget\)cancelFireCorrection\(a\)/);
 assert.doesNotMatch(source('breach-fire-recovery-policy.ts'),
  /requestAnimationFrame\(|setInterval\(|Math.random\(|weaponClearance\(/);
});
