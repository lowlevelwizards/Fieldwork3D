/** Stage 8: actual order state lifecycle + extraction boundaries.
 * The extended Stage 8 suite also replays real deterministic full sessions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {beginOrder,completeOrder,failCurrentOrder,clearCurrentOrderIssue}
 from '../src/breach-order-lifecycle.ts';
import {executionStatus} from '../src/breach-execution-state.ts';

const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('activation resets only transient execution state, not authored node identity',()=>{
 const s=newSession(),a=team(s)[0];
 try{
  const command={id:9941,kind:'move',p:{x:a.p.x+20,y:a.p.y+6}};
  a.plan=[command];a.activeNode=-1;a.actionTimer=.9;
  a.waitRemaining=.5;a.pieIndex=4;a.autoSidestep=null;
  a.orderIssue={nodeId:9941,reason:'BLOCKED',since:0};
  const preserved=structuredClone(a.plan);
  beginOrder(a,command,s.doors);
  assert.equal(a.activeNode,command.id);
  assert.equal(a.actionTimer,0);assert.equal(a.waitRemaining,0);
  assert.equal(a.pieIndex,0);assert.equal(a.orderIssue,null);
  assert.deepEqual(a.plan,preserved,'activation cannot edit authored plan');
  a.actionTimer=.25;beginOrder(a,command,s.doors);
  assert.equal(a.actionTimer,.25,'same order must not restart each tick');
 }finally{activateSite(null);}
});
test('a failed order is preserved and warns only on actual issue transitions',()=>{
 const s=newSession(),a=team(s)[0],messages=[];
 try{
  const order={id:9942,kind:'door',p:{...a.p},doorId:'MISSING',method:'open'};
  a.plan=[order];a.activeNode=order.id;
  const notify=(_s,message)=>messages.push(message);
  failCurrentOrder(s,a,order,'DOOR MISSING',notify);
  failCurrentOrder(s,a,order,'DOOR MISSING',notify);
  assert.equal(messages.length,1);
  assert.equal(a.plan[0].id,order.id);
  assert.equal(executionStatus(a).reason,'order-failed');
  failCurrentOrder(s,a,order,'DOOR HELD',notify);
  assert.equal(messages.length,2,'new reason should be observable');
  assert.equal(a.plan.length,1);
  clearCurrentOrderIssue(a);
  assert.equal(a.orderIssue,null);
 }finally{activateSite(null);}
});
test('real completion consumes exactly one order and clears temporary motor state',()=>{
 const s=newSession(),a=team(s)[0];
 try{
  const first={id:9943,kind:'wait',p:{...a.p},duration:.5};
  const second={id:9944,kind:'move',p:{x:a.p.x+15,y:a.p.y}};
  a.plan=[first,second];a.activeNode=first.id;
  a.completedOrders=0;a.actionTimer=.4;a.waitRemaining=.3;
  a.orderIssue={nodeId:first.id,reason:'RETRY',since:0};
  a.motorPause='contact';a.syncReady='A';a.pieIndex=2;
  completeOrder(a);
  assert.equal(a.plan.length,1);
  assert.equal(a.plan[0].id,second.id);
  assert.equal(a.completedOrders,1);
  assert.equal(a.activeNode,-1);
  assert.equal(a.waitRemaining,0);assert.equal(a.actionTimer,0);
  assert.equal(a.orderIssue,null);assert.equal(a.motorPause,null);
  assert.equal(a.syncReady,null);
 }finally{activateSite(null);}
});
test('a single game-owned dispatcher delegates every order family without a second fixed clock',()=>{
 const game=source('breach-game.ts');
 const exec=source('breach-order-executor.ts');
 const port=source('breach-order-execution-port.ts');
 assert.match(game,/const runOrders=createOrderExecutor\(/);
 assert.match(exec,/createEntryOrderHandler/);
 assert.match(exec,/createMedicalOrderHandler/);
 assert.match(exec,/createInteractionOrderHandler/);
 assert.match(exec,/createMovementOrderHandler/);
 assert.match(exec,/createDoorOrderHandler/);
 assert.match(exec,/advanceWaitOrder/);
 assert.match(exec,/executeTacticalUtilityOrder/);
 assert.match(exec,/if\(executeEntryOrder\(s,a,n,dt\)\)return;/);
 assert.match(exec,/if\(executeMedicalOrder\(s,a,n,dt\)\)return;/);
 assert.match(exec,/if\(executeInteractionOrder\(s,a,n,dt\)\)return;/);
 assert.match(exec,/if\(executeMovementOrder\(s,a,n,dt,visibleThreat\)\)return;/);
 assert.doesNotMatch(game,/function runOrders\(/);
 assert.doesNotMatch(game,/function failCurrentOrder\(/);
 assert.doesNotMatch(game,/function pop\(/);
 assert.doesNotMatch(port,/requestAnimationFrame|WebGL|performance\.now/);
 for(const f of ['breach-order-entry.ts','breach-order-medical.ts',
  'breach-order-interactions.ts','breach-order-movement.ts',
  'breach-order-door.ts','breach-order-lifecycle.ts','breach-order-executor.ts']){
  const sourceText=source(f);
  assert.doesNotMatch(sourceText,/from ['"]three(?:\/|['"])/);
  assert.doesNotMatch(sourceText,/\b(?:document|globalThis)\.|requestAnimationFrame\(/);
  assert.doesNotMatch(sourceText,/stepSession\(/);
 }
});
