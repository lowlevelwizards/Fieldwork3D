import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,doorLeafSegment,pointToSegment} from '../src/breach-core.ts';
import {initDoor} from '../src/breach-door.ts';
import {bodyClear,sweptBodyClear} from '../src/breach-navigation.ts';
import {newSession,team,enemies,planMove,toggling,stepSession}
  from '../src/breach-game.ts';
test('144A: an open leaf cannot trap an operator or block the doorway',()=>{
  activateSite(null);
  const d=initDoor({id:'SOFT',a:{x:60,y:100},b:{x:108,y:100},
    open:true,openedAt:0},0);
  d.openFraction=.34;
  const start={x:91,y:110},exit={x:91,y:126};
  assert.ok(pointToSegment(start,doorLeafSegment(d))<25);
  assert.equal(bodyClear(start,[d]),true);
  assert.equal(sweptBodyClear(start,exit,[d]),true);
});
test('144A: closed doors block entering, but an overlapping body can escape',()=>{
  activateSite(null);
  const d=initDoor({id:'HARD',a:{x:60,y:100},b:{x:108,y:100},
    open:false,openedAt:-1},0);
  assert.equal(sweptBodyClear({x:85,y:85},{x:85,y:105},[d]),false);
  assert.equal(sweptBodyClear({x:85,y:102},{x:85,y:121},[d]),true);
});
test('144A: operator crossing an open leaf continues along authored route',()=>{
  const s=newSession(),a=team(s)[0];
  enemies(s).forEach(e=>e.health=0);
  const door=s.doors.find(x=>x.id==='FRONT');
  door.open=true;door.openFraction=.32;
  a.p={x:301,y:561};a.nav=[];
  assert.ok(planMove(s,a.id,{x:303,y:489}));
  toggling(s);
  for(let i=0;i<280;i++)stepSession(s,1/60);
  assert.ok(a.p.y<520,'operator should cross without a door deadlock');
  activateSite(null);
});