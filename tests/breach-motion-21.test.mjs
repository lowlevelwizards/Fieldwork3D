import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
function film(){
  const s=newSession(0,212),r=new MissionRecorder(),a=team(s)[0];
  const first={...a.p};
  for(let n=0;n<=180;n++){
    const t=n/60;s.seconds=t;
    a.p={x:first.x+t*37,y:first.y};
    a.velocity=37;a.heading=0;a.turning=0;
    r.capture(s,n===180);
  }
  return {r,id:a.id};
}
test('only true fixed-step foot contacts emit audio-worthy events',()=>{
  const {r,id}=film();
  const full=r.motion.footfallsBetween(0,3,[id]);
  assert.ok(full.length>2,'expected physical touchdowns');
  assert.ok(full.every(e=>e.intensity>=0&&e.intensity<=1));
  assert.ok(full.every(e=>Number.isFinite(e.position.x)));
  const chunks=[];
  for(let t=1/60;t<=3+1e-8;t+=1/60)
    chunks.push(...r.motion.footfallsBetween(t-1/60,t,[id]));
  assert.deepEqual(chunks,full,'partitioned render times never duplicate impacts');
  assert.deepEqual(r.motion.footfallsBetween(1,1,[id]),[]);
  assert.deepEqual(r.motion.footfallsBetween(2,1,[id]),[]);
});
test('footfalls are stable across replay seek order',()=>{
 const {r,id}=film();
 const reference=r.motion.footfallsBetween(.5,2.5,[id]);
 for(const t of [3,.1,2.2,.75,0,2])r.sample(t);
 assert.deepEqual(r.motion.footfallsBetween(.5,2.5,[id]),reference);
});
