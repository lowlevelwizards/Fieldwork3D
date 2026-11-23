import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixedGoalCorrectionText} from '../src/breach-authored-goal-block.ts';
import {recoveryAdviceFor} from '../src/ui/recovery-guidance.ts';
import {classifyExecutionNotice,ExecutionNoticeFeed,locateNoticeOrder} from '../src/ui/execution-feedback.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planMove} from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {knownFixedGoalBlock} from '../src/breach-authored-goal-block.ts';
import {bodyClear} from '../src/breach-navigation.ts';


test('D3.16B: motel 31149 raw toilet candidate is adjusted to an actually standable MOVE',()=>{
 const site=generateSite(31149,'small',undefined,{mission:'intel'},
   {archetype:'motel'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const session=newSession(0,31149,'full-view','small','intel',quiet,
   {enableCivilians:false});
 try{
  const requested={x:619.3,y:248},world=sessionWorldGeometry(session);
  assert.equal(knownFixedGoalBlock(session,requested),'furniture',
   'the raw room-center point lies inside immutable toilet clearance');
  assert.equal(world.passable(requested,OPERATOR_RADIUS),false);
  assert.equal(bodyClear(requested,session.doors,OPERATOR_RADIUS,world),false);
  const ash=team(session).find(actor=>actor.id==='ash');
  assert.ok(ash);
  assert.equal(planMove(session,ash.id,requested),true);
  const authored=ash.plan[0]?.p;
  assert.ok(authored);
  const delta=Math.hypot(authored.x-requested.x,authored.y-requested.y);
  assert.ok(delta>.1&&delta<=13.01,
   'a legitimate bounded player-known placement adjustment occurred');
  assert.equal(world.passable(authored,OPERATOR_RADIUS),true);
  assert.equal(bodyClear(authored,session.doors,OPERATOR_RADIUS,world),true);
  assert.ok(session.events.some(e=>e.includes('POSITION ADJUSTED')),
   'the adjustment is not silent or an invented GO-time destination');
  // The frozen 2700-tick GO checkpoint separately requires Ash to reach
  // the ACTUAL PlanNode position while Vale's lock cancellation remains real.
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
