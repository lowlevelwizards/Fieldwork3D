import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planDoorSchedule} from '../src/breach-passage-plan.ts';
import {thresholdRankMarkers,nextThresholdRank,visiblePassageSchedule}
 from '../src/breach-passage-visual-ranks.ts';
import {newSession,team,planMove,undoPlan,toggling}
 from '../src/breach-game.ts';
import {doorRangeSite} from '../src/breach-door-test-cases.ts';
import {activateSite} from '../src/breach-core.ts';
const p=(x,y)=>({x,y});
test('Q3 rank belongs to each threshold; later crossing order can reverse',()=>{
 const doors=[
  {id:'FIRST',a:p(80,100),b:p(120,100),kind:'hinged',open:true},
  {id:'SECOND',a:p(80,200),b:p(120,200),kind:'hinged',open:true}
 ];
 const a={id:'a',side:'blue',health:4,p:p(100,0),pace:'walk',
  plan:[{id:1,kind:'move',p:p(100,150)},
   {id:2,kind:'wait',p:p(100,150),duration:10},
   {id:3,kind:'move',p:p(100,250)}]};
 const b={id:'b',side:'blue',health:4,p:p(100,-20),pace:'walk',
  plan:[{id:4,kind:'move',p:p(100,250)}]};
 const schedule=planDoorSchedule([a,b],doors,(_from,to)=>[to]);
 const rank=(actor,door)=>schedule.get(actor).find(s=>s.doorId===door).rank;
 assert.equal(rank('a','FIRST'),0);
 assert.equal(rank('b','FIRST'),1);
 assert.equal(rank('a','SECOND'),1);
 assert.equal(rank('b','SECOND'),0);
 const s={phase:'running',doors,operators:[a,b]};
 assert.equal(thresholdRankMarkers(s,schedule).length,2,
  'only the pending threshold is displayed during execution');
 s.intel={doors:new Set(['FIRST'])};
 assert.equal(thresholdRankMarkers(s,schedule).length,2,
  'hidden second threshold must not leak to planning UI');
 assert.equal(nextThresholdRank(a,s,schedule),1);
 a.p=p(100,130);
 assert.equal(nextThresholdRank(a,s,schedule),null,
  'live number cannot reveal hidden upcoming door');
 s.intel.doors.add('SECOND');
 assert.equal(nextThresholdRank(a,s,schedule),2,
  'number changes after first door clears');
 a.p=p(100,230);
 assert.equal(nextThresholdRank(a,s,schedule),null);
 assert.equal(thresholdRankMarkers(s,schedule).filter(m=>m.actorId==='a').length,0);
 s.phase='planning';
 assert.equal(thresholdRankMarkers(s,schedule).length,4,
  'planning shows both successive threshold sequences');
 assert.equal(thresholdRankMarkers(s,schedule,true).length,0,
  'replay never synthesizes new rank disclosure');
});
test('Q3 planning preview caches route schedule, invalidates upon plan edits and undo',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('inward-left'),{enableCivilians:false});
 try{
  const a=team(s)[0];
  assert.ok(planMove(s,a.id,p(311,350)));
  const first=visiblePassageSchedule(s);
  assert.equal(visiblePassageSchedule(s),first,
   'rerender must not recompute known-route A*');
  assert.ok(first.get(a.id)?.length);
  assert.ok(planMove(s,a.id,p(360,375)));
  const changed=visiblePassageSchedule(s);
  assert.notEqual(changed,first,'existing preview invalidates after authoring');
  assert.equal(visiblePassageSchedule(s),changed);
  a.plan[0].paceState='run';
  const speedChanged=visiblePassageSchedule(s);
  assert.notEqual(speedChanged,changed,
   'a change to plan pacing must invalidate crossing order');
  assert.ok(undoPlan(s,a.id));
  assert.notEqual(visiblePassageSchedule(s),changed,
   'undo cannot reuse a stale crossing preview');
  toggling(s);
  const live=visiblePassageSchedule(s);
  assert.equal(visiblePassageSchedule(s),live,
   'running displays fixed GO rank, never recomputes per frame');
 }finally{activateSite(null);}
});
test('Q3 rank render wiring is shared between actual Floor Plan and iso overlays',()=>{
 const root=new URL('../src/',import.meta.url);
 const flat=readFileSync(new URL('breach-2d-route-overlays.ts',root),'utf8');
 const iso=readFileSync(new URL('breach-2d-projected-overlays.ts',root),'utf8');
 const badge=readFileSync(new URL('ui/passage-rank-badges.ts',root),'utf8');
 for(const c of [flat,iso])assert.match(c,/paintPassageRanks\(/);
 assert.match(badge,/if\(replaying\|\|/);
 assert.match(badge,/thresholdRankMarkers\(/);
 assert.match(badge,/nextThresholdRank\(/);
});
