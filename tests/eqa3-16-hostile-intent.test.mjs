import test from 'node:test';
import assert from 'node:assert/strict';
import {hostilePhysicalityAt}
 from '../src/breach-hostile-physicality.ts';
import {newSession,enemies} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
const p=(x,y)=>({x,y});
const host=()=>({side:'red',p:p(0,0),heading:0,
 health:2,surrendered:false,alert:'investigating',
 aim:0,velocity:0,reload:0,lastNoiseAt:2,
 heard:p(0,60),contact:p(-200,0)});
test('EQA3.16D hostile investigating a HEARD point only glances when eligible',()=>{
 const a=host();const active=hostilePhysicalityAt(a,2.4);
 assert.equal(active.investigating,true);
 assert.ok(active.headYaw>.02&&active.headYaw<.3);
 assert.equal(hostilePhysicalityAt(a,1.9).headYaw,0,
  'never react before evidence was actually heard');
 assert.equal(hostilePhysicalityAt(a,9).headYaw,0,
  'old noise is not a live hostile target');
 a.alert='engaging';
 assert.equal(hostilePhysicalityAt(a,2.5).headYaw,0,
  'combat weapon ownership outranks idle head motion');
 a.alert='investigating';a.aim=.5;
 assert.equal(hostilePhysicalityAt(a,2.5).headYaw,0,
  'weapon aim prevents decorative attention overrides');
 a.aim=0;a.heard=null;
 assert.equal(hostilePhysicalityAt(a,2.5).headYaw,0,
  'stored contact cannot substitute for confirmed acoustic evidence');
 a.heard=p(0,60);a.side='blue';
 assert.equal(hostilePhysicalityAt(a,2.5).headYaw,0,
  'never modify player-authored operator LOOK/WATCH');
});
test('EQA3.16D film rewind restores historic hostile attention point and old films clear it',()=>{
 const s=newSession(),a=enemies(s)[0];
 assert.ok(a);
 a.alert='investigating';a.heading=0;a.p=p(50,50);
 a.lastNoiseAt=2;a.heard=p(50,100);a.contact=p(10,50);
 s.seconds=2.5;
 const earlier=snapshot(s);
 a.lastNoiseAt=7;a.heard=p(50,0);a.contact=p(100,50);
 s.seconds=7.2;
 const later=snapshot(s);
 applyReplayFrame(s,earlier);
 assert.deepEqual(a.heard,p(50,100));
 const yaw=hostilePhysicalityAt(a,earlier.t).headYaw;
 assert.ok(yaw>.02);
 applyReplayFrame(s,later);
 assert.deepEqual(a.heard,p(50,0));
 assert.ok(hostilePhysicalityAt(a,later.t).headYaw<-.02);
 applyReplayFrame(s,earlier);
 assert.equal(hostilePhysicalityAt(a,earlier.t).headYaw,yaw);
 const old=snapshot(s);
 for(const actor of old.actors){
  delete actor.heard;delete actor.contact;delete actor.lastNoiseAt;
 }
 applyReplayFrame(s,old);
 assert.equal(a.heard,null);
 assert.equal(a.contact,null);
 assert.equal(hostilePhysicalityAt(a,old.t).headYaw,0);
});
