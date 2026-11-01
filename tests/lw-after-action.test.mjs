import test from 'node:test';import assert from 'node:assert/strict';
import {afterActionEvents,formatAfterAction} from '../src/breach-after-action.ts';
test('retrospective timeline is bounded, sorted and selects real events',()=>{
 const events=[
  {id:4,t:20,kind:'intel',text:'ROOK SPOTTED HOSTILE'},
  {id:1,t:2,kind:'shot',text:'FIRED'},
  {id:3,t:12,kind:'door',text:'DOOR FORCED'},
  {id:2,t:8,kind:'impact',text:'WINDOW SHATTERED'}];
 assert.deepEqual(afterActionEvents(events).map(e=>e.id),[2,3,4]);
 assert.match(formatAfterAction(events),/00:08  WINDOW SHATTERED/);
 assert.doesNotMatch(formatAfterAction(events),/FIRED/);
 assert.equal(afterActionEvents(events,1).length,1);
});
