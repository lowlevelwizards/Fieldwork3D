/** R2-C3 host-side matrix. This does not claim real-device Safari FPS. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,toggling,stepSession,team,debrief}
 from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {MissionRecorder,applyReplayFrame}
 from '../src/breach-replay.ts';

for(const count of [0,2,4,6]){
 test('R2-C3 fixed-seed session + replay survives '+count+
  ' physical civilians',()=>{
  const seed=71;
  const s=newSession(0,seed,'floor-plan','standard','clear',undefined,
   {enableCivilians:false});
  const rooms=s.site?.rooms.filter(r=>r.kind==='room')??[];
  assert.ok(rooms.length>0);
  assert.equal(s.civilians.length,0);
  const people=[];
  for(let i=0;i<count;i++){
   const r=rooms[i%rooms.length];
   const x=r.x+r.w/2+(i%2?8:-8);
   const y=r.y+r.h/2+(i%3-1)*5;
   people.push(createCivilian({
    id:'civ:r2:matrix:'+i,role:'resident',persona:
     (['steady','cautious','startled'])[i%3],
    activity:'idle',position:{x,y},heading:0,
    roomId:r.id,appearanceSeed:seed*17+i*19
   }));
  }
  s.civilians=people;
  const recorder=new MissionRecorder();
  toggling(s);recorder.capture(s,true);
  for(let tick=0;tick<32;tick++){
   stepSession(s,1/60);
   if(tick%4===0)recorder.capture(s,true);
   if(s.phase!=='running')break;
  }
  assert.equal(s.civilians.length,count);
  assert.ok(recorder.frames.length>=2);
  for(const actor of s.civilians){
   assert.ok(Number.isFinite(actor.p.x)&&Number.isFinite(actor.p.y));
   assert.ok(Number.isFinite(actor.fear));
  }
  const first=recorder.frames[0],last=recorder.frames.at(-1);
  assert.equal(first.civilians.length,count);
  assert.equal(last.civilians.length,count);
  applyReplayFrame(s,first);
  assert.deepEqual(s.civilians.map(c=>c.id),
   first.civilians.map(c=>c.id));
  assert.deepEqual(s.civilians.map(c=>c.p),
   first.civilians.map(c=>c.p));
  assert.ok(debrief(s));
 });
}
test('R2-C3 no-civilian legacy sessions preserve marker-only rescue',()=>{
 const s=newSession(0,undefined,'floor-plan','standard','rescue');
 assert.equal(s.civilians.length,0);
 assert.ok(s.rescue,'legacy marker mission still spawns');
 toggling(s);stepSession(s,1/60);
 assert.ok(['running','won','lost'].includes(s.phase));
});
