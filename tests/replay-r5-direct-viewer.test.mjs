import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {composeReplayDirectorShot}
  from '../src/breach-replay-director-shots.ts';
import {smoothBodycamSample} from '../src/breach-replay-bodycam.ts';
import {indexReplayIncidents,featuredReplayIncidents}
  from '../src/breach-replay-incidents.ts';
import {featuredReplaySquadEntries}
  from '../src/breach-replay-squad-entry.ts';

const members=[
  {id:'rook',side:'blue',health:4,heading:0,p:{x:42,y:64}},
  {id:'moss',side:'blue',health:4,heading:0,p:{x:52,y:66}},
  {id:'ash',side:'blue',health:4,heading:0,p:{x:66,y:67}},
  {id:'vale',side:'blue',health:4,heading:0,p:{x:395,y:350}},
  {id:'unknown',side:'red',health:3,heading:0,p:{x:80,y:80}}
];
const rooms=[{id:'A',x:0,y:0,w:150,h:150},
  {id:'B',x:330,y:300,w:140,h:130}];
const direct=(actors)=>composeReplayDirectorShot(6,actors,rooms,[],
  1.4,0,1200,{intents:[],upcoming:null});
test('R8 chooses a coherent local element instead of an unrelated distant fourth',()=>{
  const result=direct(members);
  assert.ok(result);
  assert.equal(result.roomId,'A');
  assert.equal(result.editorialKind,'establish');
  assert.ok(result.subjects.includes('rook'));
  assert.ok(result.subjects.includes('ash'));
  assert.ok(!result.subjects.includes('vale'),
    'a distant fourth operator cannot force the shot to span two rooms');
  assert.ok(result.focus.x<160,
    'keep the visual focus within the main tactical element');
  assert.deepEqual(result,direct(members.filter(a=>a.side==='blue')),
    'undisclosed enemy coordinates never steer the shot');
  assert.deepEqual(result,direct(members),
    'the same evidence produces the same composition');
});
test('R8 favors medium-wide local squad framing rather than compulsory closeups',()=>{
  const grouped=members.filter(m=>m.side==='blue').map((m,i)=>({
    ...m,p:{x:48+i*9,y:54+(i%2)*12}
  }));
  const shot=direct(grouped);
  assert.equal(shot.actorsFramed,4);
  assert.ok(shot.zoom>=.65&&shot.zoom<=7.4,
    'establishing shot leaves air around all four nearby operators');
  assert.ok(shot.requiredPoints.length>=1);
});
test('bodycam smoothing is bounded, normalized and supports explicit cuts',()=>{
  const p={position:new THREE.Vector3(0,2,0),forward:new THREE.Vector3(1,0,0),
    up:new THREE.Vector3(0,1,0)};
  const next={position:new THREE.Vector3(10,2,0),
    forward:new THREE.Vector3(0,0,1),up:new THREE.Vector3(0,1,0)};
  const smooth=smoothBodycamSample(p,next,1/60);
  assert.ok(smooth.position.distanceTo(next.position)<=6.001);
  assert.ok(smooth.position.x<10);
  assert.ok(Math.abs(smooth.forward.length()-1)<1e-6);
  assert.ok(Math.abs(smooth.forward.dot(smooth.up))<1e-5);
  assert.deepEqual(smoothBodycamSample(p,next,1/60,true).position,next.position);
  assert.deepEqual(smoothBodycamSample(null,next,1/60).position,next.position);
});
const ev=(i,t,kind)=>({
  key:'e'+i,source:'battle',t,kind,actor:'rook',order:i,
  p:{x:i*300,y:i*300},text:kind
});
test('highlights contain significant incidents, never routine door clicks',()=>{
  const events=[ev(1,1,'door'),ev(2,10,'completed'),ev(3,20,'shot'),
    ev(4,33,'down'),ev(5,45,'objective')];
  const highlights=featuredReplayIncidents(indexReplayIncidents(events,60),5);
  assert.deepEqual(highlights.map(i=>i.kind),
    ['engagement','casualty','objective']);
});
test('featured threshold crossings require a real coordinated entry',()=>{
  const door={id:'THRESHOLD',a:{x:0,y:-20},b:{x:0,y:20}};
  const ids=['rook','moss','ash','vale'];
  const frame=(t,xs)=>({t,doors:[door],actors:ids.map((id,i)=>({
    id,health:3,p:{x:xs[i],y:0}
  }))});
  const solitary=[frame(0,[-30,-30,-30,-30]),frame(1,[20,-30,-30,-30])];
  assert.equal(featuredReplaySquadEntries(solitary,ids,1).length,0);
  const staggered=[frame(0,[-30,-30,-30,-30]),
    frame(1,[20,-30,-30,-30]),frame(8,[20,20,-30,-30])];
  assert.equal(featuredReplaySquadEntries(staggered,ids,8).length,0);
  const coordinated=[frame(0,[-30,-30,-30,-30]),
    frame(1,[20,-30,-30,-30]),frame(2,[20,20,-30,-30]),
    frame(3,[20,20,20,-30])];
  assert.equal(featuredReplaySquadEntries(coordinated,ids,3).length,1);
});
