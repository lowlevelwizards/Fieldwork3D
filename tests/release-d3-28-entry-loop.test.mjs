import test from 'node:test';
import assert from 'node:assert/strict';
import {observeD328EntryRoute,claimD328EntryLoopProbe,
 d328DistinctFullBodyAlternative} from '../src/breach-d328-entry-loop.ts';
const goal={x:426,y:608},first={x:464,y:592};
const actor=()=>({id:'ash',side:'blue',p:{x:456.2,y:601.6},
 plan:[{id:42,kind:'move',p:{...goal},stackDoorId:'FRONT'}]});
const note=(a,source,t,p,point=first)=>{
 a.p={...p};observeD328EntryRoute(a,source,point,t);
};
test('D3.28B: across 4 real distinct source adoptions, same anchor qualifies once',()=>{
 const a=actor();
 note(a,'full-body-lane',.87,{x:456.19,y:608});
 note(a,'full-body-lane',1.78,{x:456.2,y:601.6});
 note(a,'lane-cycle-world',2.57,{x:456.25,y:601.53},
  {x:464,y:601.53});
 note(a,'blocked-leg-connector',3.58,{x:456.08,y:606.2});
 assert.equal(claimD328EntryLoopProbe(a,goal,first,3.6),true);
 assert.equal(claimD328EntryLoopProbe(a,goal,first,4),false);
 assert.equal(claimD328EntryLoopProbe(a,goal,first,8.6),true);
 assert.equal(claimD328EntryLoopProbe(a,goal,first,14),false);
});
test('D3.28B: two ordinary corner edits, fresh GO and physical progress do not qualify',()=>{
 const a=actor();
 note(a,'full-body-lane',1,{x:456,y:601});
 note(a,'blocked-leg-connector',2,{x:456,y:604});
 assert.equal(claimD328EntryLoopProbe(a,goal,first,3),false);
 note(a,'full-body-lane',3,{x:456,y:601});
 note(a,'full-body-lane',4,{x:456,y:606});
 a.p={x:424,y:608};
 assert.equal(claimD328EntryLoopProbe(a,goal,first,4.1),false);
 a.p={x:456,y:606};
 a.plan=[{id:43,kind:'move',stackDoorId:'FRONT',p:{x:410,y:600}}];
 assert.equal(claimD328EntryLoopProbe(a,goal,first,5),false);
});
test('D3.28B: no cross-source witness on authored MOVE, ENTRY, other team, active hinge or squeeze',()=>{
 for(const mutate of [
  a=>{a.plan[0].stackDoorId=undefined;},
  a=>{a.plan[0].entryDoorId='FRONT';},
  a=>{a.side='red';},
  a=>{a.doorTraversal={doorId:'FRONT'};},
  a=>{a.squeeze=true;},
 ]){
  const a=actor();mutate(a);
  for(let t=1;t<=6;t++)note(a,'full-body-lane',t,{x:456,y:601});
  assert.equal(claimD328EntryLoopProbe(a,goal,first,7),false);
 }
});
test('D3.28C: candidate must be different, exact-GO and fully swept',()=>{
 const from={x:456,y:602},old={x:464,y:592};
 const alternative=[{x:448,y:610},{...goal}];
 const good=()=>true,bad=(a,b)=>!(a.x===448&&b.x===426);
 assert.deepEqual(d328DistinctFullBodyAlternative(from,goal,old,alternative,good),alternative);
 assert.deepEqual(d328DistinctFullBodyAlternative(from,goal,old,
   [{x:464,y:592},{...goal}],good),[]);
 assert.deepEqual(d328DistinctFullBodyAlternative(from,goal,old,
   [{x:448,y:610},{x:427,y:608}],good),[]);
 assert.deepEqual(d328DistinctFullBodyAlternative(from,goal,old,alternative,bad),[]);
 assert.deepEqual(d328DistinctFullBodyAlternative(from,goal,old,[],good),[]);
});
