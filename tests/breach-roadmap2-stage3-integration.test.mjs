/** Stage 3: 2D/3D fog fingerprint, historic disclosure and camera isolation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activateSite} from '../src/breach-core.ts';
import {newSession,team,liveVisibility,observerPointVisible} from '../src/breach-game.ts';
import {fogSessionFingerprint} from '../src/breach-fog-cache.ts';
import {createBreach2DVisibilityRenderer}
  from '../src/breach-2d-visibility-renderer.ts';
import {applyReplayKnowledge,replayActorDisclosed,
  replayCivilianDisclosed,recordedObserverCanSee}
  from '../src/breach-replay-visibility.ts';
import {PersonalGroundHistory} from '../src/breach-replay-personal-ground.ts';
import {personalGroundEvidenceAt,personalCoverVisible}
  from '../src/breach-replay-personal-visibility.ts';

test('Full View is a display override, never a personal observer grant',()=>{
 try{
  const s=newSession(0,31,'full-view','small'),a=team(s)[0];
  a.heading=0;
  const back={x:a.p.x-20,y:a.p.y};
  assert.equal(liveVisibility(s,back),true);
  assert.equal(observerPointVisible(s,a,back),false);
 }finally{activateSite(null);}
});
test('same view fingerprint is used in both 2D and 3D, with no LOS caching',()=>{
 const canvas=readFileSync(new URL('../src/breach-2d-visibility-renderer.ts',import.meta.url),'utf8');
 const three=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(canvas,/fogSessionFingerprint\(state\)/);
 assert.match(three,/fogSessionFingerprint\(s\)/);
 assert.match(canvas,/paintFogMask\(fogContext!/);
 assert.match(three,/paintFogVisibility\(this\.fogContext,s\)/);
});
test('shared fog fingerprint invalidates actor, door, mode and memory changes',()=>{
 try{
  const s=newSession(0,17,'true-blind','small'),a=team(s)[0];
  const first=fogSessionFingerprint(s);
  assert.equal(first,fogSessionFingerprint(s));
  a.heading+=.34;
  assert.notEqual(first,fogSessionFingerprint(s));
  const afterHeading=fogSessionFingerprint(s);
  const door=s.doors[0];
  assert.ok(door,'seed must have a real door');
  door.openFraction=.76;
  assert.notEqual(afterHeading,fogSessionFingerprint(s));
  const afterDoor=fogSessionFingerprint(s);
  s.intel.mode='exterior-known';
  assert.notEqual(afterDoor,fogSessionFingerprint(s));
  const afterMode=fogSessionFingerprint(s);
  s.seenGroundRevision++;
  assert.notEqual(afterMode,fogSessionFingerprint(s));
 }finally{activateSite(null);}
});
test('2D fog actually refreshes paused sight/doors but respects active cadence',()=>{
 const previous=globalThis.document;
 const contexts=[];
 try{
  globalThis.document={createElement(){
   const canvas={width:320,height:370};
   const ctx={canvas,filter:'none',fillStyle:'',globalCompositeOperation:'source-over',
     paintCount:0,
     save(){},restore(){},setTransform(){},clearRect(){},rect(){},
     beginPath(){},moveTo(){},lineTo(){},closePath(){},
     quadraticCurveTo(){},clip(){},fill(){},
     fillRect(){this.paintCount++;}
   };
   canvas.getContext=()=>ctx;contexts.push(ctx);return canvas;
  }};
  const actor={id:'blue-1',side:'blue',health:2,
    p:{x:220,y:230},heading:0,posture:'stand'};
  const state={seconds:0,site:undefined,seenGround:new Set(),
    seenGroundRevision:0,objectRevision:0,operators:[actor],
    intel:{mode:'true-blind',walls:new Set(),doors:new Set(),
      cover:new Set(),rooms:new Set()},doors:[{
      id:'TEST',a:{x:300,y:200},b:{x:300,y:240},
      open:false,openedAt:-1
    }]};
  const replayKnowledge={omniscient:false,groundLensOn:false,
    observerId:null,personalGround:null};
  const renderer=createBreach2DVisibilityRenderer({
    draw:{drawImage(){}},getState:()=>state,
    isReplaying:()=>false,getViewMode:()=> 'plan2d',
    replayKnowledge,replayPlayback:{time:0},debugPalette:false
  });
  const ctx=contexts[0];
  renderer.renderFog();
  const first=ctx.paintCount;assert.ok(first>0);
  renderer.renderFog();assert.equal(ctx.paintCount,first);
  actor.heading=.7;renderer.renderFog();
  const turned=ctx.paintCount;assert.ok(turned>first,'same-time aim changes repaint');
  state.doors[0].openFraction=1;renderer.renderFog();
  const door=ctx.paintCount;assert.ok(door>turned,'same-time door changes repaint');
  state.seconds=.016;actor.heading=.9;renderer.renderFog();
  assert.equal(ctx.paintCount,door,'active simulation respects repaint budget');
  state.seconds=.08;renderer.renderFog();
  assert.ok(ctx.paintCount>door,'elapsed active time repaints');
  replayKnowledge.omniscient=true;
  renderer.renderFog();
  const omni=ctx.paintCount;
  replayKnowledge.omniscient=false;
  renderer.renderFog();
  assert.ok(ctx.paintCount>omni,'returning from full replay invalidates cache');
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
});
test('legacy replay lacking knowledge fails closed even when live sight is available',()=>{
 try{
  const s=newSession(0,7,'full-view','small');
  const hostile=s.operators.find(a=>a.side==='red');
  assert.ok(hostile);
  applyReplayKnowledge(s,null);
  assert.equal(replayActorDisclosed(s,hostile,{mode:'squad'}),false);
  assert.equal(replayActorDisclosed(s,hostile,
    {mode:'operator',observerId:team(s)[0].id}),false);
  assert.equal(replayCivilianDisclosed(s,'not-recorded',{mode:'squad'}),false);
  assert.equal(replayActorDisclosed(s,hostile,{mode:'full'}),true);
  applyReplayKnowledge(s,{visibleActorIds:[hostile.id],
    visibleCivilianIds:[],discoveredBodyIds:[]});
  assert.equal(replayActorDisclosed(s,hostile,{mode:'squad'}),true);
  assert.equal(replayActorDisclosed(s,hostile,
    {mode:'operator',observerId:team(s)[0].id}),false,
    'squad evidence never becomes personal evidence');
  assert.equal(recordedObserverCanSee({operatorVisibleActorIds:{}},
    team(s)[0].id,hostile.id),null);
 }finally{activateSite(null);}
});
test('personal discovered terrain rewinds without leaking later observations',()=>{
 const history=new PersonalGroundHistory([
  {at:.2,observerId:'rook',keys:['fine:3,3']},
  {at:1.1,observerId:'rook',keys:['micro:8,8']},
  {at:1.6,observerId:'ash',keys:['micro:20,20']}
 ]);
 const early=history.at(.3,'rook');
 assert.equal(personalGroundEvidenceAt(early,{x:65,y:65}),true);
 assert.equal(personalGroundEvidenceAt(early,{x:85,y:85}),false);
 assert.equal(personalGroundEvidenceAt(history.at(2,'rook'),{x:85,y:85}),true);
 assert.equal(personalGroundEvidenceAt(history.at(.3,'rook'),{x:85,y:85}),false,
   'seeking backward removes future ground evidence');
 assert.equal(personalGroundEvidenceAt(history.at(2,'ash'),{x:85,y:85}),false,
   'one observer cannot inherit another observer\'s discoveries');
});
test('a remembered object never reveals its moved current replay position',()=>{
 const recorded=new Set(['micro:5,5']);
 assert.equal(personalCoverVisible(true,true,recorded,{x:55,y:55}),true);
 assert.equal(personalCoverVisible(true,true,recorded,{x:155,y:55}),false);
 assert.equal(personalCoverVisible(true,true,null,{x:55,y:55}),false);
 assert.equal(personalCoverVisible(true,false,null,{x:155,y:55}),true);
});
