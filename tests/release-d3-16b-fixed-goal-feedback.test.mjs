import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixedGoalCorrectionText} from '../src/breach-authored-goal-block.ts';
import {recoveryAdviceFor} from '../src/ui/recovery-guidance.ts';
import {classifyExecutionNotice,ExecutionNoticeFeed,locateNoticeOrder} from '../src/ui/execution-feedback.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {knownFixedGoalBlock} from '../src/breach-authored-goal-block.ts';
import {bodyClear} from '../src/breach-navigation.ts';


test('D3.16B: motel 31149 toilet GO remains physically invalid at all arrival tolerances',()=>{
 const site=generateSite(31149,'small',undefined,{mission:'intel'},
   {archetype:'motel'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const session=newSession(0,31149,'full-view','small','intel',quiet,
   {enableCivilians:false});
 try{
  const goal={x:619.3,y:248},world=sessionWorldGeometry(session);
  assert.equal(knownFixedGoalBlock(session,goal),'furniture',
   'the authored goal is in the known immutable toilet clearance');
  assert.equal(world.passable(goal,OPERATOR_RADIUS),false);
  assert.equal(bodyClear(goal,session.doors,OPERATOR_RADIUS,world),false);
  const orderSource=readFileSync(new URL(
   '../src/breach-order-movement.ts',import.meta.url),'utf8');
  assert.match(orderSource,/authoredGoalUnstandable/);
  assert.match(orderSource,/!sessionWorldGeometry\(s\)\.passable\(n\.p,OPERATOR_RADIUS\)/);
  assert.match(orderSource,/const at=!authoredGoalUnstandable/);
  // This test freezes the spatial premise; the workflow's 2700-tick
  // actual motor run must keep the goal pending, not pretend arrival.
 }finally{activateSite(null);}
});

test('D3.16B: known fixture at physical GO identifies action without inventing a new destination',()=>{
 const text=fixedGoalCorrectionText('furniture');
 assert.match(text,/MOVE BLOCKED.*GO INSIDE FURNITURE.*DRAG WAYPOINT/);
 const advice=recoveryAdviceFor(text);
 assert.equal(advice?.title,'GO INSIDE FURNITURE');
 assert.equal(advice?.marker,'MOVE');
 assert.match(advice?.next??'',/select.*MOVE waypoint.*clear floor/);
 assert.equal(classifyExecutionNotice('ASH '+text+' · ORDER RETAINED').severity,'warning');
 assert.doesNotMatch(text,/x=|y=|\d{2,}/,
  'no invented clearance coordinates or unsupported exact correction');
});
test('D3.16B: discovered solid wall is distinct from furniture',()=>{
 const text=fixedGoalCorrectionText('wall'),advice=recoveryAdviceFor(text);
 assert.match(text,/GO INSIDE WALL/);
 assert.match(advice?.next??'',/on your side of the wall/);
 assert.notEqual(text,fixedGoalCorrectionText('furniture'));
});
test('D3.16B: physical hold retains authored goal; only known solid fixtures qualify',()=>{
 const src=readFileSync(new URL('../src/breach-authored-goal-block.ts',import.meta.url),'utf8');
 assert.match(src,/s\.intel\.cover\.has\(i\)/);
 assert.match(src,/s\.intel\.walls\.has\(i\)/);
 assert.match(src,/!canRelocateCover\(cover\)/);
 assert.match(src,/a\.blockedTime<3\.5/);
 assert.match(src,/node\.kind==='move'/);
 assert.match(src,/!node\.entryDoorId&&!node\.stackDoorId/);
 assert.match(src,/a\.orderIssue=\{nodeId:node!\.id,reason,since:s\.seconds\}/);
 assert.match(src,/a\.orderIssue\.reason===previous\.reason/);
 assert.doesNotMatch(src,/a\.plan\.(?:shift|splice|push)\(|n\.p\s*=|node\.p\s*=/);
});

test('D3.16B: typed mobile warning preserves actionable fixture diagnosis and locates original GO',()=>{
 const move={id:3,kind:'move',p:{x:619.3,y:248}};
 const actor={id:'ash',plan:[move]};
 const text='ASH NEEDS ATTENTION · '+fixedGoalCorrectionText('furniture');
 const feed=new ExecutionNoticeFeed();
 const notice=feed.update([],'running',1000,[{
  id:1,t:10,actor:'ash',p:{x:585.6,y:248.91},
  orderId:3,kind:'blocked',reason:'order-failed',text
 }]);
 assert.equal(notice?.severity,'warning');
 assert.equal(notice?.actorId,'ash');
 assert.equal(notice?.orderId,3);
 assert.match(notice?.recovery??'',/blocked MOVE waypoint/);
 assert.deepEqual(locateNoticeOrder(notice,[actor]),{actorId:'ash',orderId:3});
 assert.deepEqual(actor.plan,[move],'feedback cannot edit the existing GO');
});
