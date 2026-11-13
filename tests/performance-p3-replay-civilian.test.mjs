import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newSession,liveVisibility} from '../src/breach-game.ts';
import {createCivilianRig} from '../src/breach-civilian-visuals.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {snapshot} from '../src/breach-replay.ts';
import {applyReplayKnowledge} from '../src/breach-replay-visibility.ts';
import {presentCivilian} from '../src/rendering/breach-3d-disclosure-presenter.ts';
import {reconcileSceneActorLifetimes} from '../src/rendering/breach-actor-frame-presenter.ts';

const makeCivil=()=>createCivilian({id:'p3-civil',role:'resident',
 persona:'steady',activity:'idle',position:{x:120,y:80},
 heading:0,roomId:'a',appearanceSeed:6});

test('20Hz replay civilian frame inherits exactly the observer-knowledge truth',()=>{
 const s=newSession(0,3411,'true-blind','small');
 const c=makeCivil();s.civilians.push(c);
 for(const mode of ['true-blind','full-view']){
  s.intel.mode=mode;
  const expected=liveVisibility(s,c.p);
  const frame=snapshot(s);
  const civil=frame.civilians.find(item=>item.id===c.id);
  assert.equal(civil?.visibleAtCapture,expected,mode);
  assert.equal(frame.knowledge?.visibleCivilianIds.includes(c.id),expected,mode);
  assert.equal(typeof civil?.visibleAtCapture,'boolean',mode);
 }
});

test('omniscient civilian disclosure does not evaluate live sight',()=>{
 const s=newSession(0,3411);
 const sentinel={id:'no-los',get p(){
  throw Error('omniscient disclosure evaluated an unnecessary LOS point');
 }};
 assert.equal(presentCivilian(s,sentinel,true,null),true);
});

test('concealed civilian rig retains pose until reveal, then catches up exactly',()=>{
 const s=newSession(0,3411);
 const c=makeCivil();s.civilians.push(c);s.seconds=12.5;
 const rig=createCivilianRig(c);
 rig.root.position.set(999,0,999);
 const scene=new THREE.Scene();scene.add(rig.root);
 const host={scene,actors:new Map(),civilianRigs:new Map([[c.id,rig]]),
  actorIds:new Set(),civilianIds:new Set()};
 applyReplayKnowledge(s,null);
 reconcileSceneActorLifetimes(s,host,false,{mode:'squad'});
 assert.equal(rig.root.visible,false);
 assert.equal(rig.root.position.x,999);
 applyReplayKnowledge(s,{visibleActorIds:[],visibleCivilianIds:[c.id],
  discoveredBodyIds:[]});
 reconcileSceneActorLifetimes(s,host,false,{mode:'squad'});
 assert.equal(rig.root.visible,true);
 assert.equal(rig.root.position.x,c.p.x);
 assert.equal(rig.root.position.z,c.p.y);
 assert.ok(Number.isFinite(rig.head.rotation.y));
});
