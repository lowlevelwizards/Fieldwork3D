import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationSightMemo} from '../src/rendering/breach-presentation-sight-memo.ts';
import {presentTransientEvidence} from '../src/rendering/breach-3d-disclosure-presenter.ts';
import {newSession} from '../src/breach-game.ts';
import {readFileSync} from 'node:fs';
test('V19 exact-point memo shares same-frame live queries across effect categories only',()=>{
 const s=newSession(0,23,'true-blind');let calls=0,seen=true;
 const memo=new PresentationSightMemo(()=>{calls++;return seen;});
 const p={x:120,y:155};
 memo.begin(s,false,true);
 assert.equal(memo.query(s,'effect','burst',p),true);
 assert.equal(memo.query(s,'impact','mark',p),true);
 assert.equal(calls,1);assert.equal(memo.stats().frameHits,1);
 memo.query(s,'effect','moved',{x:p.x+.01,y:p.y});assert.equal(calls,2);
 seen=false;memo.begin(s,false,true);
 assert.equal(memo.query(s,'effect','burst',p),false);
 assert.equal(calls,3);
 memo.begin(s,false,false);
 memo.query(s,'effect','a',p);memo.query(s,'effect','b',p);
 assert.equal(calls,5,'historical/legacy bypass');
 memo.reset();assert.equal(memo.stats().frameEntries,0);
});
test('V19 point gate fails closed for personal replay and uses exact live truth',()=>{
 let calls=0;const p={x:1,y:2},no=()=>{calls++;return false;};
 assert.equal(presentTransientEvidence(p,true,true,no),false);
 assert.equal(presentTransientEvidence(p,false,true,no),false);
 assert.equal(presentTransientEvidence(p,true,false,no),true);
 assert.equal(calls,0);
 assert.equal(presentTransientEvidence(p,false,false,no),false);
 assert.equal(calls,1);
});
test('V19 both board renderers gate point effects and suppress unrecorded personal muzzle cues',()=>{
 const two=readFileSync(new URL('../src/breach-2d-actor-renderer.ts',import.meta.url),'utf8');
 const three=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 for(const [stream,name] of [['dropped','m'],['grenades','g'],['flashBursts','b']])
  assert.ok(two.includes('for(const '+name+' of state.'+stream+'){\n    if(!effectVisible('+name+'.p))continue;'));
 assert.ok(two.includes('presentTransientEvidence(p,omni,personal'));
 assert.ok(two.includes('const firing=!(replaying&&replayKnowledge.observerId)'));
 assert.ok(three.includes('shot=>!personalDisclosure&&'));
});

import {markDoorOwner,markWindowOwner,markCoverOwnerKnown} from '../src/rendering/breach-evidence-owner.ts';
test('V19 persistent evidence resolves stable door and pane IDs, not stale array positions',()=>{
 const a={id:'a'},b={id:'b'},s={doors:[a,b],windows:[b,a]};
 assert.equal(markDoorOwner(s,{kind:'door',ownerId:'b',index:0}),b);
 assert.equal(markWindowOwner(s,{kind:'window',ownerId:'a',index:0}),a);
 assert.equal(markDoorOwner(s,{kind:'door',index:0}),undefined);
 assert.equal(markWindowOwner(s,{kind:'window',ownerId:'gone',index:0}),undefined);
});
test('V19 an unknown or replaced cover does not inherit prior damage',()=>{
 const c={id:'crate-a',fixture:'crate',x:20,y:30,w:20,h:20};
 const s={site:{cover:[c]},coverState:[{...c}],intel:{mode:'true-blind',cover:new Set()}};
 const ref={kind:'cover',ownerId:c.id,index:0};
 assert.equal(markCoverOwnerKnown(s,ref,false),false);
 s.intel.cover.add(0);
 assert.equal(markCoverOwnerKnown(s,ref,false),true);
 s.coverState[0].id='crate-b';
 assert.equal(markCoverOwnerKnown(s,ref,true),false);
 s.coverState[0]={...c,destroyed:true};
 assert.equal(markCoverOwnerKnown(s,ref,true),false);
});

import {ShotFrameDisclosure,presentShotEvidence} from '../src/rendering/breach-shot-disclosure.ts';
import {shotVisibility} from '../src/breach-presentation.ts';
import {createBreach2DActorRenderer} from '../src/breach-2d-actor-renderer.ts';
test('V19 shared flash/trace/impact decisions reuse exact live event once per frame',()=>{
 const s=newSession(0,23,'true-blind');
 const shot={id:3,side:'red',start:{x:100,y:100},end:{x:200,y:100}};
 let calls=0,seenEnd=false;
 const visible=p=>{calls++;return p.x===100||seenEnd;};
 const frame=new ShotFrameDisclosure();
 assert.deepEqual(frame.forShot(s,shot,false,false,visible),{flash:true,trace:false,impact:false});
 assert.equal(frame.forShot(s,shot,false,false,visible).flash,true);
 assert.equal(calls,2);
 assert.deepEqual(frame.forShot(s,shot,true,true,visible),{flash:false,trace:false,impact:false});
 assert.equal(calls,2);
 seenEnd=true;frame.clear();
 assert.deepEqual(frame.forShot(s,shot,false,false,visible),{flash:true,trace:true,impact:true});
 assert.equal(calls,4);
 const blue={...shot,side:'blue'};
 assert.deepEqual(presentShotEvidence(s,blue,false,false,()=>false),
  shotVisibility(s,blue,()=>false));
 assert.deepEqual(presentShotEvidence(s,shot,true,false,()=>{throw Error('unexpected ray');}),
  {flash:true,trace:true,impact:true});
});
test('V19 real Floor Plan contacts never draw unrecorded personal point effects',()=>{
 const state=newSession(0,23,'full-view');
 state.shots=[];state.droppedFirearms=[];
 state.dropped=[{id:1,p:{x:123,y:234}}];
 state.grenades=[{id:2,p:{x:124,y:235}}];
 state.flashBursts=[{id:3,p:{x:125,y:236},age:0}];
 const knowledge={omniscient:true,observerId:'rook'};
 const calls=[],draw={globalAlpha:1};
 const r=createBreach2DActorRenderer({draw,rect:(...a)=>calls.push(a),circle:(...a)=>calls.push(a),
 line:()=>{},colorFor:()=>'',worldToScreen:p=>p,replayKnowledge:knowledge,
 getFrame:()=>({state,replaying:true,replayAnalysis:false,replayContactMarkers:false,viewMode:'plan2d'}),
 executionProblemStatus:()=>null,executionMarkerPoint:a=>a.p});
 r.contacts();assert.equal(calls.length,0);
 knowledge.observerId=null;r.contacts();assert.equal(calls.length,3);
});

import {captureEffectEvidence,effectSampleAllows,recordedEffectAllows,shotEffectRow,groundEffectRow,EFFECT_SAMPLE_POINT_LIMIT,EFFECT_SAMPLE_OBSERVER_LIMIT} from '../src/breach-replay-effect-evidence.ts';
import {applyReplayKnowledge} from '../src/breach-replay-visibility.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
test('V19 historical optical evidence is bounded, exact, independent by observer and fail closed',()=>{
 const s=newSession(0,23,'full-view');
 s.seconds=1;s.shots=Array.from({length:20},(_,id)=>({id,side:'red',shooterId:'red',start:{x:20+id,y:10},end:{x:40+id,y:10},age:.05}));
 s.impactMarks=Array.from({length:20},(_,id)=>({id,p:{x:id,y:5},surface:'blood',bloodAmount:1,age:1}));
 const blue=s.operators.filter(a=>a.side==='blue');
 let calls=0;
 const capture=captureEffectEvidence(s,undefined,(_s,a,p)=>{calls++;return a.id===blue[0].id&&p.x<60;});
 assert.equal(capture.rows.length,EFFECT_SAMPLE_POINT_LIMIT);
 assert.ok(capture.observers.length<=EFFECT_SAMPLE_OBSERVER_LIMIT);
 assert.ok(calls<=EFFECT_SAMPLE_POINT_LIMIT*EFFECT_SAMPLE_OBSERVER_LIMIT);
 const row=shotEffectRow(s.shots.at(-1),'impact');
 assert.equal(effectSampleAllows(capture,1,blue[0].id,row),true);
 assert.equal(effectSampleAllows(capture,1,blue[1].id,row),false);
 assert.equal(effectSampleAllows(capture,.9,blue[0].id,row),false);
 assert.equal(effectSampleAllows(capture,1.1,blue[0].id,row),false);
 assert.equal(effectSampleAllows(capture,1,blue[0].id,[...row.slice(0,2),999,...row.slice(3)]),false);
 assert.equal(effectSampleAllows(undefined,1,blue[0].id,row),false);
 const mark=s.impactMarks.at(-1),markRow=groundEffectRow(mark);
 assert.ok(effectSampleAllows(capture,1,blue[0].id,markRow));
 mark.bloodAmount=2;
 assert.equal(effectSampleAllows(capture,1,blue[0].id,groundEffectRow(mark)),false);
 const knowledge={visibleActorIds:[],visibleCivilianIds:[],discoveredBodyIds:[],effectEvidence:capture};
 applyReplayKnowledge(s,knowledge);assert.ok(recordedEffectAllows(s,blue[0].id,row));
 applyReplayKnowledge(s,null);assert.equal(recordedEffectAllows(s,blue[0].id,row),false);
 applyReplayKnowledge(s,knowledge);assert.ok(recordedEffectAllows(s,blue[0].id,row));
});
test('V19 actual recorder snapshots own effect evidence and legacy playback clears it',()=>{
 const s=newSession(0,23,'full-view');
 const a=s.operators.find(a=>a.side==='blue');
 s.impactMarks=[{id:99,p:{x:a.p.x+Math.cos(a.heading)*20,y:a.p.y+Math.sin(a.heading)*20},surface:'blood',bloodAmount:1,age:0}];
 const frame=snapshot(s);assert.ok(frame.knowledge.effectEvidence);
 const original=JSON.stringify(frame.knowledge.effectEvidence);
 s.impactMarks[0].p.x+=100;
 assert.equal(JSON.stringify(frame.knowledge.effectEvidence),original);
 applyReplayFrame(s,frame);assert.equal(JSON.stringify(frame.knowledge.effectEvidence),original);
 applyReplayFrame(s,{...frame,knowledge:undefined});
 assert.equal(recordedEffectAllows(s,a.id,groundEffectRow(s.impactMarks[0])),false);
});

import {presentDroppedFirearm} from '../src/rendering/breach-3d-disclosure-presenter.ts';
test('V19 firearm evidence requires the location itself, not just a visible owner',()=>{
 const owner={id:'rook',side:'blue',health:100},s={operators:[owner]};
 const item={ownerId:'rook',p:{x:50,y:60}};
 let calls=0;const sight=()=>{calls++;return false;};
 assert.equal(presentDroppedFirearm(s,item,true,{mode:'operator',observerId:'rook'},sight),false);
 assert.equal(calls,0);
 assert.equal(presentDroppedFirearm(s,item,false,{mode:'squad'},sight),false);
 assert.equal(calls,1);
 assert.equal(presentDroppedFirearm(s,item,false,null,()=>true),true);
 assert.equal(presentDroppedFirearm(s,item,false,{mode:'full'},sight),true);
});
test('V19 sampled duplicate points share one exact optical probe per observer',()=>{
 const s=newSession(0,23,'full-view');s.seconds=1;
 const p={x:40,y:40};
 s.shots=Array.from({length:4},(_,id)=>({id,side:'red',shooterId:'guard',start:p,end:p,age:.05}));
 s.impactMarks=Array.from({length:4},(_,id)=>({id,p,surface:'blood',age:0}));
 let calls=0;const sample=captureEffectEvidence(s,undefined,()=>{calls++;return true;});
 assert.equal(calls,sample.observers.length);
 assert.equal(sample.rows.length,8);
 assert.ok(sample.observers.every(o=>o[1]===255));
 const row=shotEffectRow(s.shots[0],'impact'),id=sample.observers[0][0];
 assert.equal(effectSampleAllows(sample,1,id,row),true);
 const changed=shotEffectRow({...s.shots[0],surface:'glass'},'impact');
 assert.equal(effectSampleAllows(sample,1,id,changed),false);
 assert.equal(effectSampleAllows({...sample,rows:[Array(5)],observers:[[id,1]]},1,id,row),false);
});

import * as THREE from 'three';
import {BreachCombatEffectsPresenter} from '../src/rendering/breach-combat-effects-presenter.ts';
test('V19 hidden retained flash is not a visible replay effect',()=>{
 const root=new THREE.Group(),presenter=new BreachCombatEffectsPresenter(root,[],false);
 const s={seconds:1,casings:[],dropped:[],grenades:[],flashBursts:[{id:1,p:{x:50,y:60},age:.1}]};
 presenter.update(s,true,false,()=>true);
 assert.equal(presenter.stats().flashes,1);
 assert.equal(presenter.detonations.get(1).visible,true);
 presenter.update(s,true,true,()=>{throw Error('personal LOS query');});
 assert.equal(presenter.stats().flashes,1,'retained active-ID allocation is not a visible count');
 assert.equal(presenter.detonations.get(1).visible,false);
 presenter.reset();
 assert.equal(presenter.stats().flashes,0);
});
