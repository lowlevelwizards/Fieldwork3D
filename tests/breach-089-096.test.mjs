import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,enemies,planMove,planReload,planFlash,
  stepSession,toggling} from '../src/breach-game.ts';
import {MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';
import {angleDifference} from '../src/breach-plan.ts';
import {activateSite} from '../src/breach-core.ts';

const advance=(s,seconds)=>{
  for(let i=0;i<seconds*60;i++)stepSession(s,1/60);
};
const quiet=s=>enemies(s).forEach(e=>e.health=0);

test('089: travel faces actual movement direction without authored aim',()=>{
  const s=newSession();quiet(s);
  const a=team(s)[0],start={...a.p};
  assert.ok(planMove(s,a.id,{x:334,y:627}));
  toggling(s);advance(s,.6);
  const dx=a.p.x-start.x,dy=a.p.y-start.y;
  assert.ok(Math.hypot(dx,dy)>4);
  const direction=Math.atan2(dy,dx);
  assert.ok(Math.abs(angleDifference(a.heading,direction))<.7);
  activateSite(null);
});

test('090–091: seekable replay is deterministic and does not resimulate',()=>{
  const s=newSession(0,3411);quiet(s);
  const recording=new MissionRecorder();
  recording.capture(s,true);
  toggling(s);
  for(let i=0;i<100;i++){
    stepSession(s,1/60);recording.capture(s);
  }
  const frame=recording.at(.6);
  assert.ok(frame&&frame.t>=.5&&frame.t<=.61);
  const again=recording.at(.6);
  assert.deepEqual(again,frame,'rewind returns the same authoritative frame');
  const receiver=newSession(0,3411);
  applyReplayFrame(receiver,frame);
  assert.equal(receiver.seconds,frame.t);
  assert.deepEqual(receiver.operators.map(a=>a.p),frame.actors.map(a=>a.p));
  receiver.operators[0].p.x+=99;
  applyReplayFrame(receiver,frame);
  assert.deepEqual(receiver.operators.map(a=>a.p),frame.actors.map(a=>a.p));
  assert.ok(recording.duration>1.5);
  activateSite(null);
});

test('092: manual reload discards magazine and refills exactly twelve rounds',()=>{
  const s=newSession();quiet(s);
  const a=team(s)[0];a.magazine=5;
  assert.ok(planReload(s,a.id));
  toggling(s);advance(s,2.3);
  assert.equal(a.magazine,12);
  assert.equal(a.reserve,24);
  assert.equal(a.reload,0);
  assert.equal(s.dropped.length,1);
  assert.deepEqual(s.dropped[0].p,a.p);
  activateSite(null);
});

test('094: flashbang spends one of two charges and disorients friendlies',()=>{
  const s=newSession(0,1521);quiet(s);
  const a=team(s)[0],target={x:a.p.x,y:a.p.y+42};
  assert.ok(planFlash(s,a.id,target));
  toggling(s);advance(s,2.1);
  assert.equal(s.flashRemaining,1);
  assert.equal(s.grenades.length,0);
  assert.ok(a.flashUntil>s.seconds,'friendly fire affects thrower if exposed');
  assert.ok(s.noise.some(n=>n.kind==='flashbang'));
  activateSite(null);
});

test('093: investigation is grounded in audible location, not magic visibility',()=>{
  const s=newSession(0,9321);
  const e=enemies(s)[0];
  const sight={...e.p};
  s.noise.push({p:{x:e.p.x+55,y:e.p.y+25},
    radius:180,time:s.seconds,kind:'gunshot'});
  s.phase='running';stepSession(s,1/60);
  assert.ok(e.heard);
  assert.ok(Math.hypot(e.heard.x-sight.x,e.heard.y-sight.y)>15);
  assert.ok(['investigating','retreat','cover','engaging'].includes(e.alert));
  activateSite(null);
});

test('091: both public pages expose replay and combat controls',()=>{
  for(const file of ['../index.html','../breach.html']){
    const html=readFileSync(new URL(file,import.meta.url),'utf8');
    for(const id of ['watchReplay','replayPanel','replaySeek','replayPlay',
      'replaySpeed','replaySight','reload','flash','rookAmmo','valeAmmo']){
      assert.ok(html.includes('id="'+id+'"'),file+' missing '+id);
    }
  }
});
