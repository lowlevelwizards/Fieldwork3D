import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {knownFixedGoalBlock,holdKnownFixedAuthoredGoal}
 from '../src/breach-authored-goal-block.ts';
import {executionStatus} from '../src/breach-execution-state.ts';

function garage(){
 const seed=19285501;
 const site=generateSite(seed,'standard',undefined,
  {mission:'intel'},{archetype:'garage'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const s=newSession(0,seed,'full-view','standard',
  'intel',quiet,{enableCivilians:false});
 return s;
}
test('D3.27B: known Garage GO behind fixed tool chest holds stale nav, not original order',()=>{
 const s=garage();
 try{
  const a=team(s).find(x=>x.id==='moss')??team(s)[0];
  const goal={x:597.6,y:564.5},order={id:32701,kind:'move',p:goal};
  a.plan=[order];a.p={x:541.964869688993,y:638.7711708649048};
  a.nav=[{x:672,y:640},goal];a.blockedTime=6;
  a.lastBlocker='furniture';
  const notices=[];
  assert.equal(knownFixedGoalBlock(s,goal),'furniture',
    'reproduce original immovable, discovered invalid goal');
  assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,'597.6:564.5',
    1/60,(_s,n)=>notices.push(n)),true);
  assert.equal(a.plan[0],order,'do not move, cancel, or rewrite GO');
  assert.deepEqual(a.nav,[{x:672,y:640},goal],
    'never rewire the existing failed transient motor route');
  assert.equal(notices.length,1);
  assert.equal(executionStatus(a).kind,'blocked');
  for(let i=0;i<90;i++)
   assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,'597.6:564.5',
     1/60,(_s,n)=>notices.push(n)),true);
  assert.equal(notices.length,1,'no warning flood');
 }finally{activateSite(null);}
});
test('D3.27B: never reveal unknown fixture or hold before real stall',()=>{
 const s=garage();
 try{
  const a=team(s)[0],goal={x:597.6,y:564.5};
  a.plan=[{id:32702,kind:'move',p:goal}];
  a.p={x:541.964869688993,y:638.7711708649048};
  a.nav=[{x:672,y:640}];a.lastBlocker='furniture';
  a.blockedTime=5.4;
  assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,'goal',1/60,()=>{}),false);
  a.blockedTime=6;
  const index=s.coverState.findIndex(o=>o.fixture==='tool-chest'&&
   Math.abs(o.x-618)<.1&&Math.abs(o.y-564.5)<.1);
  assert.ok(index>=0);
  s.intel.cover.delete(index);
  assert.equal(knownFixedGoalBlock(s,goal),null);
  assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,'goal',1/60,()=>{}),false);
  assert.equal(a.orderIssue,null);
 }finally{activateSite(null);}
});
test('D3.27B: remote goals and generated ENTRY/STACK stay excluded',()=>{
 const s=garage();
 try{
  const a=team(s)[0],goal={x:597.6,y:564.5};
  a.plan=[{id:32703,kind:'move',p:goal}];
  a.p={x:400,y:638};a.nav=[{x:672,y:640}];
  a.blockedTime=9;a.lastBlocker='furniture';
  assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,'goal',1/60,()=>{}),false);
  a.p={x:542,y:638};
  for(const meta of [{entryDoorId:'D1'},{stackDoorId:'D1'}]){
   a.plan=[{id:32703,kind:'move',p:goal,...meta}];
   assert.equal(holdKnownFixedAuthoredGoal(s,a,goal,'goal',1/60,()=>{}),false);
  }
 }finally{activateSite(null);}
});
