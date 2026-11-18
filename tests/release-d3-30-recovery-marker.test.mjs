import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {doorCenter} from '../src/breach-core.ts';
import {interruptedEntryPoint} from '../src/ui/interrupted-entry-marker.ts';
test('D3.30G: only the recorded failed physical door receives an entry marker',()=>{
 const s=newSession(0,undefined,'full-view'),a=team(s)[0],door=s.doors[0];
 assert.equal(interruptedEntryPoint(s,a),null);
 a.interruptedDoorPlan={sourceOrderId:7,doorId:door.id,
  at:12,reason:'locked',original:[{id:7,kind:'move',p:{...a.p}}]};
 assert.deepEqual(interruptedEntryPoint(s,a),doorCenter(door));
 a.interruptedDoorPlan.doorId='MISSING';
 assert.equal(interruptedEntryPoint(s,a),null);
});
test('D3.30G: current hidden door state does not move marker or expose a lock',()=>{
 const s=newSession(0,undefined,'full-view'),a=team(s)[0],door=s.doors[0];
 a.interruptedDoorPlan={sourceOrderId:7,doorId:door.id,
  at:12,reason:'coordinated',original:[{id:7,kind:'move',p:{...a.p}}]};
 const point=interruptedEntryPoint(s,a);
 door.locked=!door.locked;door.jammed=!door.jammed;
 door.open=!door.open;door.openFraction=door.open?1:0;
 assert.deepEqual(interruptedEntryPoint(s,a),point);
 a.interruptedDoorPlan=null;
 assert.equal(interruptedEntryPoint(s,a),null);
});
