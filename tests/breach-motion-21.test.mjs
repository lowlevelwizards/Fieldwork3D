import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {ReplayMotionRecorder} from '../src/breach-replay-motion.ts';
test('touchdown sound events are unique, chronological and independent of seek order',()=>{
 const s=newSession(0,212),actor=team(s)[0],rec=new ReplayMotionRecorder();
 const initial={...actor.p};
 for(let i=0;i<=180;i++){
   const time=i/60;
   actor.p={x:initial.x+time*31,y:initial.y};
   actor.velocity=31;
   rec.record(time,s.operators,s.doors);
 }
 const id=actor.id,all=rec.touchdownsBetween(0,3,[id]);
 assert.ok(all.length>1,'walking produces audible contact events');
 assert.deepEqual(all,rec.touchdownsBetween(0,3,[id]));
 assert.deepEqual([...rec.touchdownsBetween(0,1.5,[id]),
   ...rec.touchdownsBetween(1.5,3,[id])],all);
 assert.deepEqual(rec.touchdownsBetween(1.5,1.5,[id]),[]);
 assert.ok(all.every(x=>x.at>0&&x.at<=3));
});
