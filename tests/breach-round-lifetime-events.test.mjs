import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {activateSite} from '../src/breach-core.ts';

test('long-round recorder appends only new events after live history wraps',()=>{
  const s=newSession(0,17),rec=new MissionRecorder();
  try{
    rec.capture(s,true);
    const p={...s.operators[0].p};
    s.battleEvents=Array.from({length:500},(_,i)=>({
      id:i+1,t:i*.01,kind:'shot',actor:'rook',
      p:{...p},text:'SHOT '+i
    }));
    s.executionEvents=Array.from({length:240},(_,i)=>({
      id:i+1,t:i*.01,actor:'rook',kind:'started',
      p:{...p},label:'MOVING',reason:null
    }));
    s.seconds=1/60;
    rec.capture(s);
    assert.equal(rec.events.length,500);
    assert.equal(rec.executionEvents.length,240);
    // Most subsequent ticks have no new event. The already captured prefix
    // should not be walked, duplicated, or cleared.
    s.seconds=2/60;rec.capture(s);
    assert.equal(rec.events.length,500);
    assert.equal(rec.executionEvents.length,240);
    s.battleEvents.shift();
    s.battleEvents.push({id:501,t:s.seconds,kind:'shot',
      actor:'rook',p:{...p},text:'SHOT NEW'});
    s.executionEvents.shift();
    s.executionEvents.push({id:241,t:s.seconds,actor:'rook',
      kind:'blocked',p:{...p},label:'BLOCKED',reason:'NO ROUTE'});
    s.seconds=3/60;rec.capture(s);
    assert.equal(rec.events.length,501);
    assert.equal(rec.executionEvents.length,241);
    assert.equal(rec.events.at(-1).id,501);
    assert.equal(rec.executionEvents.at(-1).id,241);
    assert.equal(rec.events[0].id,1,'full forensic history survives live ring wrap');
    assert.equal(rec.executionEvents[0].id,1);
  }finally{activateSite(null);}
});
