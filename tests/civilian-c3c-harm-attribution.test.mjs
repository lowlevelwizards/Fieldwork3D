import test from 'node:test';
import assert from 'node:assert/strict';
import {recordCivilianHarm,attributableCivilianHarm}
 from '../src/breach-civilian-harm.ts';
import {assessOperation} from '../src/breach-operations.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
const event=(shotId,sourceSide,severity='injured')=>({
 id:shotId,shotId,at:shotId/20,victimId:'civ:1',
 actorId:sourceSide==='blue'?'rook':'hostile',
 sourceSide,before:severity==='injured'?2:1,
 after:severity==='injured'?1:0,severity,p:{x:80,y:100}
});
test('E5-C3c civilian injuries are deduplicated by physical shot identity',()=>{
 const list=[];
 assert.equal(recordCivilianHarm(list,event(7,'blue')),true);
 assert.equal(recordCivilianHarm(list,event(7,'blue')),false);
 assert.equal(list.length,1);
 recordCivilianHarm(list,event(8,'red','incapacitated'));
 assert.deepEqual(attributableCivilianHarm(list),{injured:1,down:0});
 recordCivilianHarm(list,event(9,'blue','incapacitated'));
 assert.deepEqual(attributableCivilianHarm(list),{injured:0,down:1});
});
test('E5-C3c enemy-caused civilian injury does not charge operator score',()=>{
 const base={outcome:'success',kind:'intel',elapsed:90,
 casualties:0,teamSize:4,shots:5,hits:2,objective:true,extracted:4};
 const clean=assessOperation(base);
 const enemy=assessOperation({...base,civilianInjured:1,
  civilianPlayerInjured:0,civilianPlayerDown:0});
 const blue=assessOperation({...base,civilianInjured:1,
  civilianPlayerInjured:1,civilianPlayerDown:0});
 assert.equal(enemy.score,clean.score);
 assert.ok(blue.score<clean.score);
});
test('E5-C3c rewind restores harm event identities and locations',()=>{
 const s=newSession();
 recordCivilianHarm(s.civilianHarmEvents,event(7,'blue'));
 const f=snapshot(s);
 s.civilianHarmEvents.push(event(8,'red'));
 applyReplayFrame(s,f);
 assert.equal(s.civilianHarmEvents.length,1);
 assert.equal(s.civilianHarmEvents[0].shotId,7);
 assert.deepEqual(s.civilianHarmEvents[0].p,{x:80,y:100});
});
