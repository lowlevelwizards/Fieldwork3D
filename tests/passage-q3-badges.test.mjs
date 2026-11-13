import test from 'node:test';
import assert from 'node:assert/strict';
import {badgesForActor} from '../src/breach-passage-badges.ts';
const p=(x,y)=>({x,y});
const doors=[
 {id:'D1',a:p(80,100),b:p(120,100)},
 {id:'D2',a:p(80,220),b:p(120,220)}];
const schedule=new Map([
 ['a',[
  {actorId:'a',doorId:'D1',fromSide:1,rank:2,eta:2},
  {actorId:'a',doorId:'D2',fromSide:-1,rank:0,eta:4}
 ]],
 ['b',[{actorId:'b',doorId:'D1',fromSide:1,rank:0,eta:1}]]
]);
test('Q3 per threshold numbers are independent, not permanent operator IDs',()=>{
 const a=badgesForActor('a',p(100,125),doors,schedule,true,false);
 assert.deepEqual(a.map(m=>[m.doorId,m.rank]),[['D1',3],['D2',1]]);
 assert.ok(a[0].point.y>100);
 assert.ok(a[1].point.y<220);
});
test('Q3 only crossing plans can have badges and replay never has badges',()=>{
 assert.deepEqual(badgesForActor('none',p(100,120),doors,schedule,true,false),[]);
 assert.deepEqual(badgesForActor('a',p(100,120),doors,schedule,true,true),[]);
});
test('Q3 completed first threshold hides but next one retains its rank',()=>{
 const out=badgesForActor('a',p(100,78),doors,schedule,false,false);
 assert.deepEqual(out.map(b=>[b.doorId,b.rank]),[['D2',1]]);
});
test('Q3 all badges use a visually separate location and numeric rank',()=>{
 const a=badgesForActor('a',p(100,125),doors,schedule,true,false);
 const b=badgesForActor('b',p(100,125),doors,schedule,true,false);
 assert.ok(Math.hypot(a[0].point.x-b[0].point.x,
  a[0].point.y-b[0].point.y)>15);
 assert.deepEqual(b.map(q=>q.rank),[1]);
});
test('Q3 planning preview memoizes routes and changes only with authored intent',async()=>{
 const {newSession,team,passageScheduleForDisplay,toggling}
   =await import('../src/breach-game.ts');
 const {doorRangeSite}=await import('../src/breach-door-test-cases.ts');
 const {activateSite}=await import('../src/breach-core.ts');
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('inward-left'),{enableCivilians:false});
 try{
  const a=team(s)[0];
  const before=passageScheduleForDisplay(s);
  assert.equal(passageScheduleForDisplay(s),before,
   'identical planning frames must never launch another known-route search');
  a.plan=[{id:1,kind:'move',p:p(311,360)}];
  const next=passageScheduleForDisplay(s);
  assert.notEqual(next,before,'authored MOVE invalidates prediction');
  assert.equal(passageScheduleForDisplay(s),next);
  toggling(s);
  const running=passageScheduleForDisplay(s);
  assert.equal(passageScheduleForDisplay(s),running,
   'live marker uses the exact engine GO-time schedule');
 }finally{activateSite(null);}
});
