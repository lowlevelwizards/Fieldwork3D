import test from 'node:test';
import assert from 'node:assert/strict';
import {kickFootChoice,selectActualKickFoot} from '../src/breach-kick-foot-choice.ts';
import {createA3Session,DEFAULT_A3_CONFIG}
 from '../src/a3-physicality-scenarios.ts';
import {team} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {activateSite} from '../src/breach-core.ts';

test('A3.9-K foot can choose either leg without changing authoritative contact',()=>{
 const at={x:0,y:0},clear=()=>true;
 assert.equal(kickFootChoice(at,0,{x:15,y:5},clear),1);
 assert.equal(kickFootChoice(at,0,{x:15,y:-5},clear),0);
 assert.equal(kickFootChoice(at,0,{x:60,y:0},clear),null);
 assert.equal(kickFootChoice(at,0,{x:15,y:5},()=>false),null);
});
test('A3.9-K actual session chooses a real support plant beside the door',()=>{
 const s=createA3Session({...DEFAULT_A3_CONFIG,
   scenario:'doorway',operators:1,intent:'hold'});
 const a=team(s)[0],door=s.doors[0];
 try{
  a.heading=0;a.p={x:256,y:236};a.pace='walk';
  const first=selectActualKickFoot(s,a,door);
  a.p={x:256,y:247};
  const second=selectActualKickFoot(s,a,door);
  assert.ok(first===0||first===1);
  assert.ok(second===0||second===1);
  assert.notEqual(first,second,'nearby approach should permit other leg');
 }finally{activateSite(null);}
});
test('A3.9-K recorded leg selection seeks, older film defaults safely',()=>{
 const s=createA3Session({...DEFAULT_A3_CONFIG,
   scenario:'doorway',operators:1,intent:'hold'});
 try{
  const a=team(s)[0];
  a.kickFoot=0;const f=snapshot(s);
  assert.equal(f.actors.find(p=>p.id===a.id)?.kickFoot,0);
  a.kickFoot=1;
  applyReplayFrame(s,f);
  assert.equal(a.kickFoot,0);
  for(const op of f.actors)delete op.kickFoot;
  applyReplayFrame(s,f);
  assert.equal(a.kickFoot,null,'old film cannot inherit later kick foot');
 }finally{activateSite(null);}
});
