/** D3.34: exact physical frozen Retail standard generated ENTRY,
 * not a synthetic plan-completion or a disabled doorway collision test.
 * The lead's STACK goal becomes covered by the already-open solid D1
 * leaf. Recover using only a real swept alternative same-side stack
 * stance, then execute the unchanged SYNC and ENTRY plan.
 */
import {failedGeneratedStackSyncMember}
 from '../src/breach-generated-sync-dropout.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {OPERATOR_RADIUS,doorLeafSegment,doorCenter,pointToSegment}
 from '../src/breach-core.ts';
import {bodyClear,sweptBodyClear} from '../src/breach-navigation.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {routeWithNormalWorld} from '../src/breach-squeeze-route.ts';
import {selectPhysicalEntrySettle} from '../src/breach-entry-target-settle.ts';
import {eligibleGeneratedStackSettle,validGeneratedStackSyncAnchor}
 from '../src/breach-order-movement.ts';
const root=fileURLToPath(new URL('../',import.meta.url));

test('D3.34 Retail D1 cold generator STACK: body-valid alternate stance',()=>{
 const site=generateSite(14299875,'standard',undefined,
  {mission:'intel'},{archetype:'retail'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const s=newSession(0,14299875,'full-view',site.scale??'standard',
  'intel',quiet,{enableCivilians:false});
 const fractions=new Map([['FRONT',1],['D1',1.55],['D3',1],['D5',1.55]]);
 for(const door of s.doors){
  const f=fractions.get(door.id);
  if(f!==undefined)Object.assign(door,{open:true,openFraction:f,
   pushTarget:f,angularVelocity:0,heldBy:null});
 }
 const door=s.doors.find(door=>door.id==='D1');
 assert.ok(door);
 const from={x:203.00914062282985,y:175.23773989234064};
 const goal={x:206,y:185};
 const world=sessionWorldGeometry(s);
 const stand=p=>bodyClear(p,s.doors,OPERATOR_RADIUS,world);
 const sweep=(a,b)=>sweptBodyClear(a,b,s.doors,OPERATOR_RADIUS,world);
 assert.ok(stand(from),'Rook is a real standable torso, not a teleport');
 assert.equal(stand(goal),false,
  'the old generated STACK target is genuinely occupied by the open leaf');
 assert.ok(pointToSegment(goal,doorLeafSegment(door))<OPERATOR_RADIUS+2);
 let route=null;
 const settle=selectPhysicalEntrySettle(from,goal,door,[],
  p=>Math.hypot(p.x-doorCenter(door).x,p.y-doorCenter(door).y)<=68&&
    world.passable(p,OPERATOR_RADIUS)&&stand(p),
  sweep,(a,b)=>routeWithNormalWorld(a,b,s.doors,world),
  path=>{route=path});
 console.log('D334_RETAIL_STACK_SETTLE',JSON.stringify({
  from,goal,settle,routeLength:route?.length??0,
  direct:settle?sweep(from,settle):false}));
 if(settle){
  assert.ok(stand(settle));
  let prev=from;
  for(const point of route??[settle]){
   assert.ok(sweep(prev,point),'every proposed motor stride is fully swept');
   prev=point;
  }
 }
});

test('D3.34 generated stack settle never claims ordinary MOVE or active hinge',()=>{
 const target={x:206,y:185};
 const n={id:1,kind:'move',p:target,stackDoorId:'D1',
  aimLabel:'pie',moveMode:'strafe'};
 const a={side:'blue',health:100,p:{x:203,y:175},blockedTime:2,
  plan:[n,{kind:'sync',id:2,syncCode:'B1'},
   {kind:'move',id:3,p:{x:287,y:125},entryDoorId:'D1'}],
  squeeze:false,traversal:null,traversalPending:false,
  autoSidestep:null,doorTraversal:null};
 const door={id:'D1',a:{x:218,y:185},b:{x:190,y:185},
  kind:'hinged',open:true,openFraction:1.55,
  angularVelocity:0,locked:false,jammed:false,wedged:false,heldBy:null};
 for(const patch of [{open:false},{openFraction:.94},{locked:true},
  {jammed:true},{wedged:true},{heldBy:'red'},{angularVelocity:.3}])
  assert.equal(eligibleGeneratedStackSettle(a,n,{...door,...patch}),false,
   JSON.stringify(patch));
 for(const patch of [{blockedTime:.7},{squeeze:true},
  {traversalPending:true},{autoSidestep:{foo:1}},
  {plan:[n,{kind:'sync',id:2}]},
  {plan:[n,{kind:'wait',id:2},
   {kind:'move',id:3,entryDoorId:'D1'}]}])
  assert.equal(eligibleGeneratedStackSettle({...a,...patch},n,door),false,
   JSON.stringify(patch));
 assert.equal(eligibleGeneratedStackSettle(a,{...n,stackDoorId:undefined},door),
  false,'player MOVE cannot borrow a generated stack fallback');
});

test('D3.34 linked generated SYNC accepts only the same full-body safe stance',()=>{
 const original={x:206,y:185},point={x:201.4078,y:173.9134};
 const sync={id:5,kind:'sync',p:original,syncCode:'B1'};
 const actor={side:'blue',plan:[sync],p:point};
 const proof={syncId:5,syncCode:'B1',doorId:'D1',
   original,point};
 assert.deepEqual(validGeneratedStackSyncAnchor(
   sync,actor,proof,()=>true),point);
 assert.equal(validGeneratedStackSyncAnchor(
   {...sync,id:6},actor,proof,()=>true),null);
 assert.equal(validGeneratedStackSyncAnchor(
   {...sync,syncCode:'OTHER'},actor,proof,()=>true),null);
 assert.equal(validGeneratedStackSyncAnchor(
   {...sync,p:{x:246,y:185}},actor,proof,()=>true),null);
 assert.equal(validGeneratedStackSyncAnchor(
   sync,actor,proof,()=>false),null,
   'a later obstructed landing cannot declare any SYNC ready');
 assert.equal(validGeneratedStackSyncAnchor(
   sync,{...actor,side:'red'},proof,()=>true),null);
 assert.equal(validGeneratedStackSyncAnchor(
   sync,{...actor,plan:[]},proof,()=>true),null);
});

test('D3.34 split generated SYNC only after actual locked failed STACK',()=>{
 const sync={id:7,kind:'sync',p:{x:210,y:180},syncCode:'B1'};
 const generated={id:10,kind:'move',p:{x:287,y:125},
  entryDoorId:'D1'};
 const trapped={side:'blue',health:100,p:{x:158,y:82},
  plan:[sync,generated],syncReady:null,
  lastFailedOrder:{id:3,kind:'move',
    reason:'PATH BLOCKED · DOOR LOCKED',at:10.98},
  blockedTime:4,lastBlocker:'door'};
 assert.equal(failedGeneratedStackSyncMember(trapped,'B1'),true);
 for(const patch of [
  {blockedTime:2.9},{lastBlocker:'clear'},
  {syncReady:'B1'},{lastFailedOrder:null},
  {lastFailedOrder:{...trapped.lastFailedOrder,reason:'RETRY'}},
  {lastFailedOrder:{...trapped.lastFailedOrder,kind:'tool'}},
  {plan:[sync]},{side:'red'},
  {lastFailedOrder:{...trapped.lastFailedOrder,id:-20}},
  {p:{x:207,y:179}},{plan:[{...sync,syncCode:'B2'},generated]}
 ])assert.equal(failedGeneratedStackSyncMember({...trapped,...patch},'B1'),
   false,JSON.stringify(patch));
 // A manual SYNC without generated entry cannot silently lose a peer.
 assert.equal(failedGeneratedStackSyncMember(
  {...trapped,plan:[sync,{kind:'move',id:10,p:generated.p}]},'B1'),
  false);
});

test('D3.34 Retail: Rook physically completes STACK and advances real ENTRY',()=>{
 const report=JSON.parse(execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index=3','--audit-seed=14299875',
  '--audit-scale=standard','--route-transitions','--progress'
 ],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,timeout:120000}));
 const run=report.rows[0].modes.find(m=>m.mode==='entry');
 const rook=run?.operators.find(a=>a.id==='rook');
 console.log('D334_RETAIL_PHYSICAL',JSON.stringify({
  arrivals:run?.arrivals,rook,pending:run?.operators.filter(o=>o.outcome==='pending')
   .map(o=>o.id),routeTransitions:run?.routeTransitions?.byActor}));
 assert.equal(report.ticks,2700);
 for(const field of ['exceptions','invalidPositions',
  'physicsStepViolations','corruptedPlans'])
  assert.equal(report.summary[field],0,field);
 assert.equal(run?.operators.length,4);
 assert.equal(run?.arrivals,3,
  'the three physically capable operators must arrive; the locked member does not');
 assert.deepEqual(run.operators.filter(o=>o.outcome==='pending'),[],
  'there must be no hidden still-pending generated entry operator');
 for(const id of ['rook','moss','vale']){
  const actor=run.operators.find(o=>o.id===id);
  assert.ok(actor?.arrived,id+' must physically reach the original ENTRY GO');
  assert.equal(actor.outcome,'arrived',id+' has genuine arrived outcome');
  assert.equal(actor.failedOrders,0,id+' original orders were not cancelled');
  assert.ok(actor.remaining<=5,id+' finishes at its authored destination');
 }
 const ash=run.operators.find(o=>o.id==='ash');
 assert.equal(ash?.outcome,'cancelled',
  'blocked fourth operator must remain a genuinely failed order');
 assert.equal(ash?.failedOrders,1);
 assert.match(ash?.lastFailedOrder?.reason??'',/DOOR LOCKED/,
  'physical lock cancellation stays visible and unrelaxed');
 assert.equal(ash?.arrived,false,'no false arrival for the failed member');
 assert.ok((run.routeTransitions?.byActor?.['rook:generated-entry-settle']??0)>0,
  'cold physically verified generated stack stance was adopted by the real motor');
});
