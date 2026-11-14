import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team} from '../src/breach-game.ts';
import {incomingHitFacing,hitFacingInterrupted,choosePhysicalCorrection}
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

/** Exact pre-D2.3 candidate generation and callback order. */
function priorCorrection(p,yaw,reason,canMove,canShoot){
 let tests=0;
 const lateral={x:-Math.sin(yaw),y:Math.cos(yaw)};
 const forward={x:Math.cos(yaw),y:Math.sin(yaw)};
 const lengths=reason==='friendly'?[4,7,10,12,20,28]:
  [2,3,4,7,10,14,22,30];
 for(const length of lengths){
  const offset=(side,back,kind)=>{
   const norm=Math.hypot(side,back);
   return {dx:(lateral.x*side-forward.x*back)*length/norm,
    dy:(lateral.y*side-forward.y*back)*length/norm,kind};
  };
  const candidates=reason==='friendly'?[
   offset(-1,0,'lateral-left'),offset(1,0,'lateral-right'),
   offset(-1,1,'back-left'),offset(1,1,'back-right'),offset(0,1,'back')
  ]:[
   offset(0,1,'back'),offset(-.5,1,'back-left'),
   offset(.5,1,'back-right'),offset(-1,1,'back-left'),
   offset(1,1,'back-right'),offset(-1,0,'lateral-left'),
   offset(1,0,'lateral-right')
  ];
  for(const c of candidates){
   const next={x:p.x+c.dx,y:p.y+c.dy};
   tests++;
   if(canMove(next)&&canShoot(next))
    return {point:next,kind:c.kind,distance:length,tests};
  }
 }
 return null;
}
test('D2.3 optimization preserves every candidate, swept probe order and solution',()=>{
 const from={x:23,y:-9};
 for(const reason of ['friendly','muzzle']){
  for(const yaw of [0,.33,-1.28,Math.PI]){
   for(const goal of [0,1,4,17,1000]){
    let first=0,second=0;
    const before=priorCorrection(from,yaw,reason,q=>{
     first++;return first>goal;
    },q=>q.x!==1000);
    const after=choosePhysicalCorrection(from,yaw,reason,q=>{
     second++;return second>goal;
    },q=>q.x!==1000);
    assert.deepEqual(after,before,
     'rank, result, floating point coordinate and counted attempts remain exact');
    assert.equal(second,first);
   }
  }
 }
 const src=source('breach-combat-reactions.ts');
 assert.match(src,/const FRIENDLY_PATTERNS:readonly CorrectionPattern\[\]/);
 assert.doesNotMatch(src,/const candidates=reason==='friendly'/);
});
