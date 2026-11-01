import test from 'node:test';import assert from 'node:assert/strict';
import {casualtyTrailingPosition,transportIsClear} from '../src/breach-casualty-transport.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot} from '../src/breach-replay.ts';
test('22.07 drag and carry follow travel direction without teleporting',()=>{
 const start={x:30,y:40},end={x:34,y:40};
 assert.deepEqual(casualtyTrailingPosition(start,end,0,'drag'),{x:18,y:40});
 assert.deepEqual(casualtyTrailingPosition(start,end,0,'carry'),{x:25,y:40});
});
test('22.07 walls and live teammates can veto paired movement',()=>{
 const start={x:0,y:0},dest={x:5,y:0};
 assert.equal(transportIsClear(start,dest,()=>true,[]),true);
 assert.equal(transportIsClear(start,dest,()=>false,[]),false);
 assert.equal(transportIsClear(start,dest,()=>true,[{x:8,y:0}]),false);
});
test('22.07 replay stores the actual carrier and casualty relationship',()=>{
 const s=newSession();s.operators[0].carryingId='moss';
 s.operators[1].carriedById='rook';
 const f=snapshot(s);
 assert.equal(f.actors[0].carryingId,'moss');
 assert.equal(f.actors[1].carriedById,'rook');
});
