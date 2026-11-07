import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,stepSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {enablePersonalGroundCapture,notePersonalGround,
  drainPersonalGround,PersonalGroundHistory}
  from '../src/breach-replay-personal-ground.ts';
test('capture opt-in, unique per observer, coalesced by observed tick',()=>{
  const session={};
  assert.equal(notePersonalGround(session,'rook',1,'fine:2,3'),false);
  enablePersonalGroundCapture(session);
  assert.equal(notePersonalGround(session,'rook',1,'fine:2,3'),true);
  assert.equal(notePersonalGround(session,'rook',1,'fine:2,3'),false);
  notePersonalGround(session,'rook',1,'micro:4,6');
  notePersonalGround(session,'moss',1,'fine:2,3');
  assert.deepEqual(drainPersonalGround(session),[
    {at:1,observerId:'rook',keys:['fine:2,3','micro:4,6']},
    {at:1,observerId:'moss',keys:['fine:2,3']}
  ]);
  assert.deepEqual(drainPersonalGround(session),[]);
});
test('personal exploration never borrows a teammates revealed tiles',()=>{
  const session={};enablePersonalGroundCapture(session);
  notePersonalGround(session,'rook',0,'fine:1,1');
  notePersonalGround(session,'moss',.5,'fine:8,8');
  notePersonalGround(session,'rook',1,'fine:9,9');
  const history=new PersonalGroundHistory(drainPersonalGround(session));
  assert.deepEqual([...history.at(0,'rook')],['fine:1,1']);
  assert.deepEqual([...history.at(0,'moss')],[]);
  assert.deepEqual([...history.at(.5,'moss')],['fine:8,8']);
  assert.deepEqual([...history.at(1,'rook')],['fine:1,1','fine:9,9']);
  assert.deepEqual([...history.at(.5,'rook')],['fine:1,1'],
    'rewind must never retain later tile memories');
});
test('no personal ground evidence appears for unseen or invalid requests',()=>{
  const s={};enablePersonalGroundCapture(s);
  assert.equal(notePersonalGround(s,'',1,'fine:1,1'),false);
  assert.equal(notePersonalGround(s,'rook',NaN,'fine:1,1'),false);
  assert.equal(notePersonalGround(s,'rook',1,''),false);
  const h=new PersonalGroundHistory(drainPersonalGround(s));
  assert.equal(h.at(-1,'rook'),null);
  assert.deepEqual([...h.at(1,'rook')],[]);
});

test('authoritative simulation records per-operator ground as it is actually seen',()=>{
  const session=newSession(0,3411);
  const recorder=new MissionRecorder();
  recorder.capture(session,true); // arms the opt-in journal before GO
  session.phase='running';
  for(let step=0;step<20;step++){
    stepSession(session,1/60);
    recorder.capture(session);
  }
  assert.ok(recorder.personalGround.length>0,
    'A 20-tick simulation should reach a real ground visibility update');
  const knownFriendlies=new Set(session.operators.filter(a=>a.side==='blue')
    .map(a=>a.id));
  let fineOrMicro=0;
  for(const batch of recorder.personalGround){
    assert.ok(knownFriendlies.has(batch.observerId));
    assert.ok(batch.at>=0&&batch.at<=session.seconds);
    for(const key of batch.keys){
      assert.ok(session.seenGround.has(key),
        'Personal evidence must be a subset of simulation-observed terrain');
      if(key.startsWith('fine:')||key.startsWith('micro:'))
        fineOrMicro++;
    }
  }
  assert.ok(fineOrMicro>0,'Expected actual precise ground reveal cells');
});
