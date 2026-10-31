import test from 'node:test';
import assert from 'node:assert/strict';
import {crossingDoor,passageOwner,passageWait,doorContactImpulse}
  from '../src/breach-passage.ts';
import {initDoor,advanceDoor,pushDoor} from '../src/breach-door.ts';
import {activateSite} from '../src/breach-core.ts';
import {newSession,team,enemies,planMove,toggling,stepSession}
  from '../src/breach-game.ts';
const door={id:'TEST',a:{x:200,y:300},b:{x:248,y:300},
  open:true,openedAt:0};
const a=(id,x,y,gy=270)=>({id,p:{x,y},goal:{x:224,y:gy},
  health:4,blockedTime:0,active:true});
test('147: one stable owner, then following operators may enter',()=>{
  const squad=[a('rook',217,324),a('moss',232,331),
    a('ash',208,344),a('vale',237,353)];
  assert.ok(crossingDoor(squad[0],door));
  assert.equal(passageOwner(door,squad),'rook');
  assert.equal(passageWait(squad[0],[door],squad),false);
  assert.equal(passageWait(squad[1],[door],squad),true);
  squad[0].p.y=269;
  assert.equal(passageOwner(door,squad),'moss');
  assert.equal(passageWait(squad[1],[door],squad),false);
});
test('147: stalled leader relinquishes priority and never deadlocks queue',()=>{
  const squad=[a('rook',217,324),a('moss',232,331)];
  squad[0].blockedTime=1.7;
  assert.equal(passageOwner(door,squad),'moss');
});
test('147: door contact near latch delivers greater leverage',()=>{
  const leaf=initDoor(door,0);leaf.openFraction=.3;
  const from=leaf.a;
  const v={x:leaf.b.x-leaf.a.x,y:leaf.b.y-leaf.a.y};
  const near={x:from.x+v.x*.2,y:from.y+v.y*.2};
  const far={x:from.x+v.x*.85,y:from.y+v.y*.85};
  assert.ok(doorContactImpulse(leaf,far)>doorContactImpulse(leaf,near));
  const before=leaf.openFraction;
  pushDoor(leaf,doorContactImpulse(leaf,far)*3.5);
  for(let i=0;i<25;i++)advanceDoor(leaf,1/60);
  assert.ok(leaf.openFraction>before);
});
test('147: four-person traffic does not corrupt authored plans',()=>{
  const s=newSession(0,100);
  enemies(s).forEach(x=>x.health=0);
  const squad=team(s),goals=squad.map((_,i)=>({
    x:s.site.entrance.x+(i%2?8:-8),y:s.site.entrance.y-48,
  }));
  for(const [i,o] of squad.entries()){
    const g=goals[i];
    if(planMove(s,o.id,g))assert.equal(o.plan.at(-1).kind,'move');
  }
  const snapshots=squad.map(x=>x.plan.map(n=>n.id));
  toggling(s);
  for(let i=0;i<150;i++)stepSession(s,1/60);
  for(let i=0;i<squad.length;i++){
    assert.ok(Number.isFinite(squad[i].p.x));
    assert.ok(Number.isFinite(squad[i].p.y));
    assert.ok(squad[i].plan.every(n=>snapshots[i].includes(n.id)));
  }
  activateSite(null);
});