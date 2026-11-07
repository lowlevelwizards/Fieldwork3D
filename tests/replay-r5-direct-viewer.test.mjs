import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cinematicReplayShot,easeCinematicReplayShot}
  from '../src/breach-replay-cinematic-director.ts';
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
test('cinematic director favors a coherent room group with disclosed action',()=>{
  const cues=[{t:5,p:{x:60,y:65},weight:9,kind:'wound'}];
  const shot=cinematicReplayShot(6,members,rooms,[],cues,1.4,0);
  assert.equal(shot.roomId,'A');
  assert.equal(shot.actorsFramed,3);
  assert.equal(shot.kind,'action');
  assert.ok(shot.focus.x>40&&shot.focus.x<72);
  assert.ok(shot.zoom>1&&shot.zoom<=3.6);
  assert.ok(shot.pitch>0.8&&shot.pitch<1.1);
  const withoutEnemy=cinematicReplayShot(6,members.filter(a=>a.side==='blue'),
    rooms,[],cues,1.4,0);
  assert.deepEqual(shot,withoutEnemy,'unseen hostiles must never steer the camera');
  assert.deepEqual(shot,cinematicReplayShot(6,members,rooms,[],cues,1.4,0),
    'same recorded frame and context must produce deterministic framing');
});
test('director eases perspective without rotating the long way round',()=>{
  const current={focus:{x:0,y:0},zoom:1,yaw:Math.PI*1.98,
    pitch:1,roomId:null,actorsFramed:3,kind:'squad'};
  const target={...current,focus:{x:100,y:20},zoom:3,yaw:.03,pitch:.9};
  const eased=easeCinematicReplayShot(current,target,1/60);
  assert.ok(eased.focus.x>0&&eased.focus.x<100);
  assert.ok(eased.zoom>1&&eased.zoom<3);
  assert.ok(Math.abs(eased.yaw-current.yaw)<.1);
  const cut=easeCinematicReplayShot(current,target,0,true);
  assert.deepEqual(cut.focus,target.focus);
  assert.equal(cut.zoom,target.zoom);
  assert.ok(Math.abs(cut.yaw-target.yaw)<1e-12);
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
