import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,planMove,toggling,stepSession} from '../src/breach-game.ts';

const ticks=(s,secs)=>{for(let i=0;i<secs*60;i++)stepSession(s,1/60);};
const peaceful=s=>enemies(s).forEach(a=>a.health=0);

test('082: an idle ally standing in the doorway yields without losing orders',()=>{
  const s=newSession();peaceful(s);
  const [rook,moss]=team(s);
  s.doors.find(d=>d.id==='FRONT').open=true;
  rook.p={x:302,y:574};moss.p={x:302,y:555};
  const original={...moss.p};
  assert.ok(planMove(s,'rook',{x:302,y:499}),
    'rook can plan through the front entrance');
  toggling(s);ticks(s,3.5);
  assert.ok(rook.p.y<535,
    'rook actually passes the teammate and front doorway');
  assert.ok(Math.abs(moss.p.x-original.x)>8||
    Math.abs(moss.p.y-original.y)>8,
    'idle teammate cooperatively vacated the lane');
  assert.equal(moss.plan.length,0,
    'yielding is a motor action, not a permanent planning order');
  assert.ok(s.events.some(message=>message.includes('YIELDING TO ROOK')),
    'player receives comprehensible traffic feedback');
});

test('082: two planned friends can clear a narrow common passage',()=>{
  const s=newSession();peaceful(s);
  const [rook,moss]=team(s);
  s.doors.find(d=>d.id==='FRONT').open=true;
  rook.p={x:301,y:574};moss.p={x:301,y:557};
  assert.ok(planMove(s,'rook',{x:304,y:496}));
  assert.ok(planMove(s,'moss',{x:296,y:485}));
  toggling(s);ticks(s,6);
  assert.ok(rook.p.y<533,'rook crossed the entrance');
  assert.ok(moss.p.y<533,'moss also crossed without indefinite jam');
});

test('082: a four-person simulated queue can move through a single doorway',()=>{
  const s=newSession();peaceful(s);
  const [rook,moss]=team(s);
  s.doors.find(d=>d.id==='FRONT').open=true;
  const third=structuredClone(moss),fourth=structuredClone(moss);
  third.id='ash';third.name='ASH';fourth.id='vale';fourth.name='VALE';
  // Additional simulated actors use the ordinary fixed-step team pipeline.
  s.operators.splice(2,0,third,fourth);
  [rook,moss,third,fourth].forEach((a,i)=>{
    a.p={x:301+(i%2)*9,y:575+i*24};
    assert.ok(planMove(s,a.id,{x:299+i*2,y:485-i*6}));
  });
  toggling(s);ticks(s,13);
  for(const a of [rook,moss,third,fourth])
    assert.ok(a.p.y<534,a.name+' must eventually pass the choke point');
  assert.equal(team(s).length,4);
});
