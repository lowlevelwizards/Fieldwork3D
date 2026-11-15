import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {knownFixedGoalBlock,holdKnownFixedAuthoredGoal}
 from '../src/breach-authored-goal-block.ts';
import {canRelocateCover} from '../src/breach-movable-cover.ts';
import {isFootstepObstacle} from '../src/breach-traversal-surfaces.ts';
import {executionStatus} from '../src/breach-execution-state.ts';

function fixture(){
 const seed=31149,site=generateSite(seed,'small',undefined,
  {mission:'intel'},{archetype:'motel'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const s=newSession(0,seed,'full-view',site.scale??'small',
  'intel',quiet,{enableCivilians:false});
 const index=s.coverState.findIndex(o=>
   o.fixture==='toilet'&&!canRelocateCover(o)&&isFootstepObstacle(o));
 assert.ok(index>=0,'fixture must actually contain the motel toilet');
 const prop=s.coverState[index],goal={x:prop.x,y:prop.y};
 return {s,index,goal};
}
test('B1 known unmovable authored landing parks once, preserving order',()=>{
 const {s,goal}=fixture();
 try{
  const a=team(s)[0],node={id:9081,kind:'move',p:goal};
  a.plan=[node];a.p={x:goal.x+22,y:goal.y};
  a.blockedTime=4;a.lastBlocker='route';a.nav=[];
  const notices=[],note=(_s,text)=>notices.push(text);
  const key=goal.x+':'+goal.y;
  assert.equal(knownFixedGoalBlock(s,goal),'furniture');
  assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,key,1/60,note),true);
  assert.equal(notices.length,1);
  assert.equal(a.plan[0],node,'do not change authored goal');
  assert.equal(a.orderIssue.nodeId,node.id);
  assert.equal(a.orderIssue.reason,
   'MOVE BLOCKED · GO INSIDE FURNITURE · DRAG WAYPOINT TO CLEAR FLOOR');
  assert.equal(executionStatus(a).kind,'blocked');
  for(let i=0;i<300;i++)
   assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,key,1/60,note),true);
  assert.equal(notices.length,1,'no repeated HUD/event spam');
  assert.equal(a.plan[0],node);
 }finally{activateSite(null);}
});
test('B1 cover change clears held status and resumes route evaluation',()=>{
 const {s,index,goal}=fixture();
 try{
  const a=team(s)[0],node={id:8082,kind:'move',p:goal};
  a.plan=[node];a.p={x:goal.x+22,y:goal.y};
  a.blockedTime=4;a.lastBlocker='route';a.nav=[];
  const note=()=>{};
  const key=goal.x+':'+goal.y;
  assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,key,1/60,note),true);
  s.coverState[index]={...s.coverState[index],x:goal.x+250};
  s.objectRevision++;
  assert.equal(knownFixedGoalBlock(s,goal),null);
  assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,key,1/60,note),false);
  assert.equal(a.orderIssue,null);
  assert.equal(a.recoveryAttempts,0);
 }finally{activateSite(null);}
});
test('B1 hidden props are not reported as known impossible destinations',()=>{
 const {s,index,goal}=fixture();
 try{
  s.intel.cover.delete(index);
  assert.equal(knownFixedGoalBlock(s,goal),null);
  const a=team(s)[0],node={id:8031,kind:'move',p:goal};
  a.plan=[node];a.p={x:goal.x+22,y:goal.y};
  a.blockedTime=5;a.lastBlocker='route';a.nav=[];
  assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,'goal',1/60,()=>{}),false);
  assert.equal(a.orderIssue,null);
 }finally{activateSite(null);}
});
test('B1 entry/stack and temporary door maneuvers never enter authored hold',()=>{
 const {s,goal}=fixture();
 try{
  const a=team(s)[0];a.p={x:goal.x+22,y:goal.y};
  a.blockedTime=5;a.lastBlocker='route';a.nav=[];
  for(const meta of [{entryDoorId:'FRONT'},{stackDoorId:'FRONT'}]){
   a.plan=[{id:199,kind:'move',p:goal,...meta}];
   assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,'goal',1/60,()=>{}),false);
  }
 }finally{activateSite(null);}
});
test('B1 live route owns one obstruction guard, no duplicate recovery motor',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/breach-motor-route.ts',import.meta.url),'utf8');
 const guard=source.indexOf('holdKnownFixedAuthoredGoal(s,a,p,goalKey,dt,hooks.notify)');
 const door=source.indexOf('pressDoorOnBodyAttempt(a.p,probe');
 const route=source.indexOf('routeWithSqueezeIntel(s.intel,a.p,p)');
 assert.ok(guard>=0&&guard<door&&guard<route);
});
