import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayEventIndex} from '../src/breach-replay-event-index.ts';

test('one index preserves event order and supports binary navigation',()=>{
  const battle=[
    {id:1,t:3,kind:'shot',actor:'rook',text:'FIRED'},
    {id:2,t:3,kind:'wound',actor:'guard0',text:'HIT'},
    {id:3,t:4,kind:'shot',actor:'rook',text:'FIRED'},
    {id:4,t:5,kind:'door',actor:'rook',text:'OPEN'}
  ];
  const execution=[
    {id:7,t:2,kind:'blocked',actor:'rook',p:{x:1,y:2},
      orderId:11,reason:'door',text:'BLOCKED'},
    {id:8,t:4,kind:'waiting',actor:'rook',p:{x:1,y:2},
      orderId:11,reason:'wait',text:'WAITING'}
  ];
  const index=new ReplayEventIndex(battle,execution);
  assert.equal(index.latest(2.2)?.text,'BLOCKED');
  assert.equal(index.latest(3)?.text,'HIT');
  assert.equal(index.next(2)?.text,'HIT');
  assert.equal(index.previous(5)?.text,'HIT');
  assert.equal(index.markers.filter(e=>e.kind==='shot').length,1,
    'dense shots cluster visually without deleting event evidence');
  assert.equal(index.all.filter(e=>e.kind==='shot').length,2);
});

test('team-intel filtering removes concealed events from HUD navigation',()=>{
  const battle=[
    {id:1,t:1,kind:'shot',actor:'guard0',text:'SECRET'},
    {id:2,t:2,kind:'door',actor:'rook',text:'KNOWN'}
  ];
  const visible=new ReplayEventIndex(battle,[],e=>e.actor==='rook');
  assert.equal(visible.all.length,1);
  assert.equal(visible.latest(3)?.text,'KNOWN');
  assert.equal(visible.next(0)?.text,'KNOWN');
  assert.equal(visible.markers.length,1);
});
