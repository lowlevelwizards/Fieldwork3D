import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPivotFootClearance,selectPivotEpisode,committedPivotDelta}
 from '../src/breach-pivot-episode.ts';
import {rotate} from '../src/breach-order-lifecycle.ts';
import {createA3Session,DEFAULT_A3_CONFIG}
 from '../src/a3-physicality-scenarios.ts';
import {team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

test('A3.8-T unambiguous 45, 90, 135 and 160-degree turns never take long route',()=>{
 for(const deg of [-160,-135,-90,-45,45,90,135,160]){
  const goal=deg*Math.PI/180;
  const episode=selectPivotEpisode(0,goal,{left:0,right:6});
  const delta=committedPivotDelta(0,goal,episode);
  assert.ok(Math.abs(delta-goal)<1e-8,deg+' must be shortest');
 }
});
test('A3.8-T near-180 tie selects physically clear arc and preserves episode',()=>{
 const angle=179*Math.PI/180;
 const episode=selectPivotEpisode(0,-angle,{left:6,right:0});
 assert.equal(episode.side,1);
 assert.ok(committedPivotDelta(0,-angle,episode)>Math.PI,
  'positive clearance path may be two degrees longer');
 const progress=selectPivotEpisode(.1,-angle,{left:0,right:6},episode);
 assert.equal(progress.side,1,'do not reverse in the middle of a pivot');
 assert.ok(committedPivotDelta(.1,-angle,progress)>0);
 const changed=selectPivotEpisode(.1,Math.PI/2,{left:6,right:0},progress);
 assert.equal(changed.side,1,'major retarget discards prior episode');
 assert.ok(committedPivotDelta(.1,Math.PI/2,changed)<Math.PI);
});
test('A3.8-T exact opposite and wrapped boundary remain finite',()=>{
 for(const target of [-Math.PI,Math.PI,-181*Math.PI/180,
  181*Math.PI/180]){
  const episode=selectPivotEpisode(0,target,{left:5,right:0});
  const delta=committedPivotDelta(0,target,episode);
  assert.ok(Number.isFinite(delta));
  assert.ok(Math.abs(delta)<=Math.PI+.04);
 }
 assert.equal(selectPivotEpisode(0,0),null);
 assert.equal(selectPivotEpisode(NaN,Math.PI),null);
});
test('A3.8-T geometric boot corridors distinguish walls on opposite sides',()=>{
 const start={x:0,y:0};
 const l=assessPivotFootClearance(start,0,p=>p.x<0);
 const r=assessPivotFootClearance(start,0,p=>p.x>0);
 assert.equal(l.left,r.right);
 assert.equal(l.right,r.left);
 assert.notEqual(l.left,l.right);
 const choice=selectPivotEpisode(0,Math.PI,l);
 assert.equal(choice.side,l.left>l.right?1:-1);
});
test('A3.8-T real fixed-step operator turn episode reaches opposite without zigzag',()=>{
 const s=createA3Session({...DEFAULT_A3_CONFIG,scenario:'clear',
   operators:1,intent:'hold'}),a=team(s)[0];
 try{
  const first=a.heading;
  const goal=first+Math.PI;
  const initial=rotate(a,goal,1/60,s);
  assert.equal(initial,false);
  const sign=Math.sign(a.heading-first);
  assert.ok(sign===1||sign===-1);
  for(let i=0;i<90;i++){
    const old=a.heading;
    rotate(a,goal,1/60,s);
    assert.ok(Math.abs(a.heading-old)<=.101);
    assert.ok((a.heading-old)*sign>=-.00001,
      'fixed-turn direction must not reverse');
  }
  assert.ok(Math.abs(Math.atan2(Math.sin(goal-a.heading),
    Math.cos(goal-a.heading)))<.075);
  assert.equal(a.pivotEpisode,null,'releases the commitment on arrival');
 }finally{activateSite(null);}
});
