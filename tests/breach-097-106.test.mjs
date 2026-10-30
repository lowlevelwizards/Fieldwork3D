import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,cycleWeapon,planFlash,moveFlashTarget,
  flashTrajectory,undoPlan} from '../src/breach-game.ts';
import {WEAPONS,injuryOf,injurySpeed,injuryReload,
  woundSeverity,exposure} from '../src/breach-combat.ts';
import {validateThrow,sampleThrow} from '../src/breach-flash.ts';
import {chooseDefense} from '../src/breach-defense.ts';
import {MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';
import {activateSite} from '../src/breach-core.ts';

test('097: planned door opening validates an otherwise blocked doorway throw',()=>{
  const s=newSession();
  const from={x:300,y:565},target={x:300,y:490};
  const blocked=validateThrow(from,target,s.doors);
  const after=validateThrow(from,target,s.doors,['FRONT']);
  assert.equal(blocked.valid,false);
  assert.equal(after.valid,true);
  assert.deepEqual(sampleThrow(after,1).p,target);
  activateSite(null);
});
test('097: move flash landing marker without moving launch position',()=>{
  const s=newSession();
  assert.ok(planFlash(s,'rook',{x:300,y:601}));
  const a=team(s)[0],node=a.plan.at(-1);
  assert.equal(node.kind,'flash');
  const release={...node.p};
  const before={...node.aimPoint};
  assert.ok(moveFlashTarget(s,'rook',node.id,{x:315,y:600}));
  assert.deepEqual(node.p,release);
  assert.notDeepEqual(node.aimPoint,before);
  assert.ok(flashTrajectory(s,a,node).valid);
  assert.ok(undoPlan(s,'rook'));
  assert.deepEqual(a.plan[0].aimPoint,before);
  activateSite(null);
});
test('099: four injury states have monotonic movement and reload consequences',()=>{
  assert.deepEqual([0,1,2,3].map(injuryOf),
    ['healthy','injured','heavy','incapacitated']);
  assert.ok(injurySpeed(0)>injurySpeed(1));
  assert.ok(injurySpeed(1)>injurySpeed(2));
  assert.equal(injurySpeed(3),0);
  assert.ok(injuryReload(2)>injuryReload(1));
  assert.equal(woundSeverity(WEAPONS.carbine,20,false,0),1);
  assert.equal(woundSeverity(WEAPONS.shotgun,20,false,.1),2);
});
test('101: generated squad has four real weapon families and editable loadouts',()=>{
  const s=newSession(0,819);
  assert.deepEqual(team(s).map(a=>a.weapon),['carbine','smg','rifle','shotgun']);
  assert.deepEqual(team(s).map(a=>a.magazine),[12,18,10,6]);
  assert.ok(team(s).every(a=>a.health===4&&a.injuryStage===0));
  assert.ok(cycleWeapon(s,'rook'));
  assert.equal(team(s)[0].weapon,'smg');
  assert.equal(team(s)[0].magazine,18);
  activateSite(null);
});
test('100: obstruction is directional and does not confuse an open door with a wall',()=>{
  const s=newSession();
  const from={x:300,y:566},other={x:300,y:498};
  assert.equal(exposure(from,other,s.doors).blocked,true);
  const open=s.doors.map(d=>({...d,open:true}));
  assert.equal(exposure(from,other,open).blocked,false);
  activateSite(null);
});
test('098: defensive scoring avoids locations already reserved by an ally',()=>{
  const s=newSession();
  const from={x:257,y:287},threat={x:286,y:573};
  const a=chooseDefense(from,threat,s.doors,[],'guard-a');
  assert.ok(a);
  const b=chooseDefense(from,threat,s.doors,
    [{id:'guard-a',p:a,defense:a,health:4}],'guard-b');
  assert.ok(b);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>25);
  activateSite(null);
});
test('104: deterministic mission archetypes include intel, rescue, hold, capture',()=>{
  for(const [seed,kind] of [[1,'intel'],[2,'rescue'],[3,'hold'],[4,'capture']]){
    const s=newSession(0,seed);
    assert.equal(s.missionType,kind);
    assert.equal(s.mission,kind==='capture'?'clear':'secure');
  }
  activateSite(null);
});
test('106: replay captures weapon, wounds and durable combat events',()=>{
  const s=newSession(0,194);
  s.operators[0].injuryStage=2;s.operators[0].health=2;
  s.battleEvents.push({id:1,t:0,kind:'wound',actor:'rook',
    p:{...s.operators[0].p},text:'ROOK HEAVY'});
  const recorder=new MissionRecorder();
  recorder.capture(s,true);
  assert.equal(recorder.events.length,1);
  const f=recorder.at(0);
  assert.equal(f.actors[0].injuryStage,2);
  const replay=newSession(0,194);
  applyReplayFrame(replay,f);
  assert.equal(replay.operators[0].injuryStage,2);
  assert.equal(replay.operators[0].weapon,'carbine');
  activateSite(null);
});
test('097–106: public pages expose weapon controls and event-driven replay',()=>{
  for(const page of ['../index.html','../breach.html']){
    const html=readFileSync(new URL(page,import.meta.url),'utf8');
    for(const id of ['loadout','replayPrevEvent','replayNextEvent',
      'replayFollow','replayAnalysis','replayEventText'])
      assert.match(html,new RegExp('id="'+id+'"'));
  }
});
