import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {takeCivilianCustody,dropCivilianCustody} from '../src/breach-civilian-transport.ts';
import {newSession,team,toggling,stepSession,addNode,debrief}
 from '../src/breach-game.ts';
import {MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';
function scenario(){
 const s=newSession(),op=team(s)[0];
 op.heading=0;op.weaponYaw=0;
 const c=createCivilian({id:'civ:r2:replay',role:'rescue',persona:'steady',
  activity:'waiting',position:{x:op.p.x+14,y:op.p.y},
  heading:0,roomId:'r',appearanceSeed:9,isRescueTarget:true});
 c.health=0;c.injuryStage=3;c.state='incapacitated';
 s.civilians.push(c);s.missionType='rescue';s.mission='extract';
 s.rescue={p:{...c.p},following:null,trail:[]};
 return {s,op,c};
}
test('R2-A3 drag/carry mode is replayed with one authoritative civilian',()=>{
 const {s,op,c}=scenario(),film=new MissionRecorder();
 assert.equal(takeCivilianCustody(c,op,'carry'),true);
 film.capture(s,true);
 const frame=film.frames[0];
 assert.equal(frame.civilians[0].carriedById,op.id);
 assert.equal(frame.civilians[0].transportMode,'carry');
 const where={...c.p};
 dropCivilianCustody(c,op);c.p.x+=80;
 applyReplayFrame(s,frame);
 assert.equal(s.operators.find(a=>a.id===op.id).carryingId,c.id);
 assert.equal(s.civilians.find(x=>x.id===c.id).carriedById,op.id);
 assert.equal(s.civilians.find(x=>x.id===c.id).transportMode,'carry');
 assert.deepEqual(s.civilians[0].p,where);
 assert.equal(s.civilians.length,1);
});
test('R2-A3 old civilian film safely restores transport as null',()=>{
 const {s,op,c}=scenario(),film=new MissionRecorder();
 film.capture(s,true);
 const old={...film.frames[0],civilians:film.frames[0].civilians.map(x=>({...x}))};
 delete old.civilians[0].carriedById;
 delete old.civilians[0].transportMode;
 c.carriedById=op.id;c.transportMode='drag';
 applyReplayFrame(s,old);
 assert.equal(s.civilians[0].carriedById,null);
 assert.equal(s.civilians[0].transportMode,null);
});
test('R2-A3 valid extraction while physically carrying downed rescue succeeds',()=>{
 const {s,op,c}=scenario();
 s.scenario.extract={...op.p};
 assert.equal(addNode(s,op.id,'evacuate',{...op.p},
  {patientId:c.id,transportMode:'carry'}),true);
 assert.equal(takeCivilianCustody(c,op,'carry'),true);
 toggling(s);stepSession(s,1/60);
 assert.equal(s.phase,'won');
 assert.equal(s.mission,'done');
 assert.equal(debrief(s).rescueStatus,'incapacitated');
});
