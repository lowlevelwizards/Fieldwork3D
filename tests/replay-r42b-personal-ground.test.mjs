import test from 'node:test';
import assert from 'node:assert/strict';
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
