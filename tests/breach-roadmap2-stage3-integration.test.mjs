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
import {presentActor,presentCivilian}
  from '../src/rendering/breach-3d-disclosure-presenter.ts';
import {initialIntel,intelFogLevel} from '../src/breach-intel.ts';
import {exteriorBriefedAt,accessibleExteriorWall}
  from '../src/breach-site-footprint.ts';
import {inspectFogPoint} from '../src/breach-visibility-diagnostics.ts';


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
  let replaying=false;
 const replayKnowledge={omniscient:false,groundLensOn:false,
    observerId:null,personalGround:null};
  const renderer=createBreach2DVisibilityRenderer({
    draw:{drawImage(){}},getState:()=>state,
    isReplaying:()=>replaying,getViewMode:()=> 'plan2d',
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
  replaying=true;
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

test('3D live models use live team sight, not missing replay evidence',()=>{
 try{
  const s=newSession(0,9,'full-view','small');
  const hostile=s.operators.find(a=>a.side==='red');
  assert.ok(hostile);
  applyReplayKnowledge(s,null);
  assert.equal(presentActor(s,hostile,false,null),true,
    'live Full View remains visible without a replay snapshot');
  assert.equal(presentActor(s,hostile,false,{mode:'squad'}),false,
    'replay squad still fails closed without historical evidence');
  assert.equal(presentActor(s,hostile,true,{mode:'full'}),true);
 }finally{activateSite(null);}
});
test('historical civilians use recorded observations, never fresh LOS',()=>{
 try{
  const s=newSession(0,9,'full-view','small');
  const c={id:'film-civilian',replayVisible:true,p:{x:180,y:200}};
  applyReplayKnowledge(s,null);
  assert.equal(presentCivilian(s,c,false,{mode:'squad'}),true,
    'old recorded visibleAtCapture remains valid evidence');
  c.replayVisible=undefined;
  assert.equal(presentCivilian(s,c,false,{mode:'squad'}),false,
    'missing old film observations must fail closed');
  applyReplayKnowledge(s,{visibleActorIds:[],
    visibleCivilianIds:[],discoveredBodyIds:[]});
  c.replayVisible=true;
  assert.equal(presentCivilian(s,c,false,{mode:'squad'}),false,
    'explicitly unseen in current frame outranks stale model flag');
  assert.equal(presentCivilian(s,c,false,{mode:'full'}),true);
  assert.equal(presentCivilian(s,c,false,null),true,
    'live tactical Full View still displays civilians');
 }finally{activateSite(null);}
});

test('all eleven generated archetypes respect all four ground knowledge modes',()=>{
 const types=new Set();
 try{
  for(let seed=0;seed<11;seed++){
   const s=newSession(0,seed,'true-blind','small');
   const site=s.site;
   assert.ok(site?.rooms?.length,'seed '+seed+' has rooms');
   types.add(site.archetype);
   const interior=site.rooms.find(r=>r.kind==='room');
   assert.ok(interior,'seed '+seed+' has an occupiable interior');
   const inside={x:interior.x+interior.w/2,y:interior.y+interior.h/2};
   assert.equal(exteriorBriefedAt(site,inside),false);
   const outside=s.operators.find(a=>a.side==='blue')?.p;
   assert.ok(outside);
   assert.equal(exteriorBriefedAt(site,outside),true,
     'insertion is outdoors and must remain briefable');
   for(const mode of ['true-blind','exterior-known','floor-plan','full-view']){
     const intel=initialIntel(mode,site,s.doors);
     const expectedInside=mode==='full-view'?0:mode==='floor-plan'?1:2;
     const expectedOutside=mode==='full-view'?0:
       mode==='true-blind'?2:1;
     assert.equal(intelFogLevel(intel,site,inside,false,false),
       expectedInside,site.archetype+': '+mode+' interior');
     assert.equal(intelFogLevel(intel,site,outside,false,false),
       expectedOutside,site.archetype+': '+mode+' exterior');
     assert.equal(intelFogLevel(intel,site,inside,true,false),0);
     assert.equal(intelFogLevel(intel,site,inside,false,true),0===expectedInside?
       0:1);
     const partition=site.walls.findIndex(w=>!accessibleExteriorWall(site,w));
     if(partition>=0&&mode==='exterior-known')
       assert.equal(intel.walls.has(partition),false,
         site.archetype+' internal partitions are not exterior facades');
   }
  }
  assert.equal(types.size,11,'every procedural archetype is represented');
 }finally{activateSite(null);}
});
test('roof occupancy cannot promote unseen interior floor into discovered fog',()=>{
 try{
  const s=newSession(0,37,'true-blind','small');
  const room=s.site.rooms.find(r=>r.kind==='room'&&r.w>=65&&r.h>=65);
  assert.ok(room);
  const a=team(s)[0];
  a.p={x:room.x+room.w/2,y:room.y+room.h/2};
  a.heading=0;
  for(const other of team(s))if(other!==a)other.health=0;
  s.seenGround.clear();s.seenGroundRevision++;
  const behind={x:a.p.x-16,y:a.p.y};
  const report=inspectFogPoint(s,behind);
  assert.equal(report.occupied,true);
  assert.equal(report.currentlyVisible,false);
  assert.equal(report.explored,false);
  assert.equal(report.reason,'unknown',
    'camera roof cutaway is not a simulation observation');
  assert.equal(report.level,2);
 }finally{activateSite(null);}
});
