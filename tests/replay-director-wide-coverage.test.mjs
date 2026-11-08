import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {composeReplayDirectorShot}
  from '../src/breach-replay-director-shots.ts';
import {physicalDirectorView,directorOperatorRoom}
  from '../src/breach-replay-director-physical.ts';

const actors=[
 {id:'rook',p:{x:88,y:82},side:'blue',health:3,heading:0,velocity:22},
 {id:'moss',p:{x:117,y:69},side:'blue',health:3,heading:0,velocity:20},
 {id:'ash',p:{x:136,y:93},side:'blue',health:3,heading:0,velocity:20},
 {id:'vale',p:{x:153,y:76},side:'blue',health:3,heading:0,velocity:18},
 {id:'tango',p:{x:204,y:83},side:'red',health:3,heading:3,velocity:0}
];
const room={id:'lobby',x:20,y:10,w:230,h:160};
const beat={id:'fight:8',kind:'fight',start:1.4,first:4,
 last:4.4,end:5,actorId:'rook',shooterId:'rook',targetId:'tango',
 shooter:actors[0].p,target:actors[4].p,doorId:null};
const solve=(characters,rooms,override={})=>composeReplayDirectorShot(3,
 characters,rooms,[],.75,0,1100,{
  intents:[],upcoming:null,beat,
  actionPair:{shooter:characters[0].p,target:characters.at(-1).p},
  usableWidth:.75,usableHeight:.7,maxZoom:14,...override
 });
test('gunfight coverage keeps all four friendlies, not just the shooter close-up',()=>{
 const shot=solve(actors,[room]);
 assert.ok(shot);
 assert.equal(shot.subjects.length,4);
 assert.deepEqual(new Set(shot.subjects),
  new Set(['rook','moss','ash','vale']));
 assert.equal(shot.roomId,'lobby');
 assert.ok(shot.zoom<=9,'director should zoom as far as subject coverage safely permits');
 assert.ok(shot.zoom>=.65);
 assert.ok(shot.fov>=82&&shot.fov<=116);
 assert.ok(shot.cameraAnchor.x>=room.x&&
  shot.cameraAnchor.x<=room.x+room.w);
 assert.ok(shot.cameraAnchor.y>=room.y&&
  shot.cameraAnchor.y<=room.y+room.h);
 // Match actual in-room overhead orthographic projection on portrait.
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2400);
 camera.position.set(shot.cameraAnchor.x,53,shot.cameraAnchor.y);
 camera.up.set(0,1,0);camera.lookAt(shot.focus.x,17,shot.focus.y);
 const span=1100/shot.zoom;
 camera.left=-span*.75/2;camera.right=span*.75/2;
 camera.top=span/2;camera.bottom=-span/2;
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 for(const actor of actors.slice(0,4)){
  for(const height of [4,40]){
   const screen=new THREE.Vector3(actor.p.x,height,actor.p.y)
    .project(camera);
   assert.ok(Math.abs(screen.x)<.94&&Math.abs(screen.y)<.94,
    actor.id+' must fit with padding: '+JSON.stringify(screen.toArray()));
  }
 }
});
test('first operator across a door does not move camera away from stacked majority',()=>{
 const r1={id:'entry',x:0,y:0,w:150,h:150};
 const r2={id:'room',x:150,y:0,w:150,h:150};
 const split=[
  {...actors[0],p:{x:159,y:70}},
  {...actors[1],p:{x:112,y:73}},
  {...actors[2],p:{x:126,y:88}},
  {...actors[3],p:{x:138,y:101}},
  {...actors[4],p:{x:217,y:72}}
 ];
 const shot=solve(split,[r1,r2]);
 assert.ok(shot.subjects.length>=4);
 assert.equal(shot.roomId,'entry',
  '3 operators stacking should keep the director on their room side');
 assert.equal(directorOperatorRoom(shot.cameraAnchor,[r1,r2])?.id,
  'entry');
});
test('wide audition prefers a clear multi-operator view over a backpack shot',()=>{
 const lens=physicalDirectorView({
  operator:actors[0].p,focus:{x:141,y:82},
  subjectPoints:actors.slice(0,4).map(a=>a.p),
  target:actors[4].p,preferredYaw:1.1
 },{rooms:[room],walls:[]},.75);
 assert.equal(lens.roomId,'lobby');
 assert.ok(lens.fov>=96,'wide audition must use a wide field of view');
 for(const actor of actors.slice(0,4)){
  assert.ok(Math.hypot(lens.cameraAnchor.x-actor.p.x,
   lens.cameraAnchor.y-actor.p.y)>=24,
   'do not put the lens right behind a squad member');
 }
 assert.equal(lens.occluded,0);
});
