import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {ReplaySoundTimeline} from '../src/breach-replay-audio.ts';

test('replay audio records historical weapon identity and is event-sourced',()=>{
  const s=newSession(0),rec=new MissionRecorder();
  const actor=s.operators.find(a=>a.side==='blue');
  assert.ok(actor);actor.weapon='shotgun';
  rec.capture(s,true);
  s.seconds=.1;s.shots.push({
    id:3,shooterId:actor.id,targetId:null,side:'blue',
    start:{x:10,y:10},end:{x:60,y:20},age:0,
    hit:false,healthBefore:4,healthAfter:4,down:false
  });
  rec.capture(s);
  const index=new ReplaySoundTimeline(rec.ballistics.shots,[]);
  assert.equal(index.events.length,1);
  assert.equal(index.events[0].weapon,'shotgun');
  actor.weapon='smg';
  assert.equal(index.events[0].weapon,'shotgun','future loadout changes cannot rewrite audio');
  assert.equal(index.between(0,.1).length,1);
  assert.equal(index.between(.1,.2).length,0,'same sound never recurs in the next interval');
  assert.deepEqual(index.between(.2,.1),[]);
});

test('sound feed excludes duplicate generic shot events, keeps semantic actions',()=>{
  const index=new ReplaySoundTimeline([],[
    {id:1,t:1,kind:'shot',text:'FIRED',actor:'rook'},
    {id:2,t:1,kind:'door',text:'OPENED',actor:'rook',p:{x:5,y:5}},
    {id:3,t:2,kind:'flash',text:'FLASH',actor:'rook'},
    {id:4,t:2,kind:'wound',text:'HIT',actor:'rook'}
  ]);
  assert.deepEqual(index.events.map(x=>x.kind),['door','flash']);
  assert.equal(index.between(0,2).length,2);
});
