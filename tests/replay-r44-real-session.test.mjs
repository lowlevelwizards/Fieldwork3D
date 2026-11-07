/** R4.4 A4: real four-operator session, not a fabricated movie.
 * Reuses the established standard-open squad-flow A doorway contract,
 * capturing authoritative snapshots while live units execute actual MOVE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,stepSession,toggling}
  from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {measureReplaySquadDoorEntry,featuredReplaySquadEntries}
  from '../src/breach-replay-squad-entry.ts';

const p=(x,y)=>({x,y});
const site=()=>({
  seed:731,name:'R44 / STANDARD OPEN',layout:'corridor',
  training:true,rooms:[],roomCount:0,
  walls:[{a:p(90,260),b:p(290,260)},
    {a:p(332,260),b:p(550,260)}],
  doors:[{id:'ENTRY',a:p(290,260),b:p(332,260),
    kind:'hinged',hinge:'a',swing:-1,open:true,openedAt:0}],
  cover:[],entrance:p(311,260),
  spawn:[p(300,200),p(308,173),p(316,146),p(325,119)],
  enemies:[],windows:[],objective:p(520,450),extract:p(520,460),
  bounds:{minX:0,minY:0,maxX:640,maxY:500}
});
test('real squad MOVE produces an honest four-person crossing review',()=>{
  const s=newSession(0,undefined,'full-view','standard','hold',site());
  try{
    const actors=team(s).slice(0,4);
    assert.equal(actors.length,4);
    const ids=actors.map(a=>a.id);
    for(let i=0;i<4;i++)
      assert.equal(planMove(s,ids[i],p(296+i*10,371+i*3)),true);
    const rec=new MissionRecorder();
    rec.capture(s,true);
    toggling(s);
    for(let tick=0;tick<1080;tick++){
      stepSession(s,1/30);
      rec.capture(s);
      if(actors.every(a=>a.p.y>278))break;
    }
    rec.capture(s,true);
    assert.ok(rec.frames.length>2);
    const review=measureReplaySquadDoorEntry(
      rec.frames,'ENTRY',ids,0,rec.duration);
    assert.ok(review,'the authoritative door should exist in replay');
    assert.equal(review.approachSide,-1);
    assert.equal(review.crossings.length,4);
    assert.ok(review.crossings.every(c=>c.crossedAt!==null),
      'A source game regression prevented four real crossings');
    const ordered=review.crossings.map(c=>c.crossedAt).sort((a,b)=>a-b);
    assert.equal(review.firstCrossingAt,ordered[0]);
    assert.equal(review.lastCrossingAt,ordered[3]);
    assert.ok(review.spreadSeconds>=0);
    const featured=featuredReplaySquadEntries(
      rec.frames,ids,rec.duration,3);
    assert.equal(featured[0]?.doorId,'ENTRY');
    assert.equal(featured[0]?.crossings.filter(c=>c.crossedAt!==null).length,4);
    // A partial historical window cannot include the final arrival.
    const early=measureReplaySquadDoorEntry(
      rec.frames,'ENTRY',ids,0,review.firstCrossingAt);
    assert.ok(early.crossings.filter(c=>c.crossedAt!==null).length<=
      review.crossings.length);
    console.log('Replay R4.4 real-motor entry PASS',JSON.stringify({
      crossingTimes:ordered,spreadSeconds:review.spreadSeconds,
      frameCount:rec.frames.length
    }));
  }finally{activateSite(null);}
});
