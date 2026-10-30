import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,toggling,stepSession} from '../src/breach-game.ts';
import {activateSite,doorLeafSegment,pointToSegment} from '../src/breach-core.ts';
import {initDoor,advanceDoor,pushDoor} from '../src/breach-door.ts';

test('143A: two crossing friendlies retain independent plans',()=>{
  const s=newSession(0,100);
  const [a,b]=team(s);
  a.p={x:298,y:615};b.p={x:314,y:615};
  assert.ok(planMove(s,a.id,{x:353,y:618}));
  assert.ok(planMove(s,b.id,{x:272,y:618}));
  toggling(s);
  for(let i=0;i<180;i++)stepSession(s,1/60);
  assert.ok(a.p.x>320,'first operator makes progress');
  assert.ok(b.p.x<295,'second operator makes progress');
  assert.ok(!a.yieldTarget&&!b.yieldTarget);
  activateSite(null);
});
test('143A: open leaf moves under repeated contact impulse',()=>{
  activateSite(null);
  const d=initDoor({id:'ISOLATED',a:{x:60,y:100},
    b:{x:108,y:100},open:true,openedAt:0},0);
  d.openFraction=.25;
  assert.ok(Number.isFinite(pointToSegment({x:95,y:110},doorLeafSegment(d))));
  for(let i=0;i<35;i++){pushDoor(d,.9);advanceDoor(d,1/60);}
  assert.ok((d.openFraction??0)>.75);
});