import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayDirectorStoryboard}
  from '../src/breach-replay-director-storyboard.ts';
import {directorCameraLegal,directorLineBlocked}
  from '../src/breach-replay-director-physical.ts';

const at=(x,y)=>({x,y});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const room={id:'main',x:0,y:0,w:245,h:160};
const nextRoom={id:'inner',x:245,y:0,w:220,h:160};
const scene={rooms:[room,nextRoom],walls:[
 {a:at(0,0),b:at(245,0)}, {a:at(0,0),b:at(0,160)},
 {a:at(0,160),b:at(245,160)},
 {a:at(245,0),b:at(245,56)},
 {a:at(245,99),b:at(245,160)}
],cover:[{x:120,y:80,w:42,h:42}]};
function pose(t,position,focus,roomId='main',zoom=3){
 return {
  roomId,focus,cameraAnchor:position,
  operatorPoint:roomId==='inner'?at(310,80):at(110,45),
  yaw:(Math.atan2(position.x-focus.x,position.y-focus.y)+2*Math.PI)%
    (2*Math.PI),
  zoom,pitch:.75,fov:t%2<1?98:115,
  beatId:Math.floor(t/.8)%2?'fight:A':'fight:B',
  kind:'action',shotType:'contact',subjects:['rook','moss','ash','vale'],
  doorId:null,actorsFramed:4,score:100,occluded:0,motion:48
 };
}
test('every-half-second optimal angle changes NEVER create same-room camera cuts',()=>{
 const board=new ReplayDirectorStoryboard(20,t=>{
  const n=Math.floor(t/.8);
  const position=n%2?at(196,121):at(38,40);
  // Reverse-scored poses must not whip the camera. Later, a lasting
  // change of action direction should still produce a gradual turn.
  const focus=t>12?at(190,28):n%2?at(32,34):at(204,113);
  return pose(t,position,focus,'main',n%2?5.5:1.2);
 },{step:.8,maxCache:16,...scene});
 let previous=null;
 let moved=false,rotated=false,zoomed=false;
 for(let i=0;i<=200;i++){
  const frame=board.sample(i*.1);
  assert.equal(frame.roomId,'main');
  assert.ok(directorCameraLegal(frame.cameraAnchor,room,scene),
   'camera must remain inside physical room without intersecting furniture');
  if(previous){
   const travel=d(previous.cameraAnchor,frame.cameraAnchor);
   assert.ok(travel<2.1,'no camera teleports in the same room: '+travel);
   const spin=Math.abs(delta(frame.yaw,previous.yaw));
   assert.ok(spin<.14,'no sudden pan/jump cut in same room: '+spin);
   const zoomRatio=frame.zoom/previous.zoom;
   assert.ok(zoomRatio>.92&&zoomRatio<1.09,
    'zoom changes continuously rather than punching in/out: '+zoomRatio);
   moved ||=travel>.01;
   rotated ||=spin>.0001;
   zoomed ||=Math.abs(zoomRatio-1)>.0001;
  }
  previous=frame;
 }
 assert.ok(moved,'director should gently move, not freeze every shot');
 assert.ok(rotated,'director should turn without cutting');
 assert.ok(zoomed,'director should smoothly reframe without cutting');
});
test('unreachable camera candidate HOLDS without jumping through furniture',()=>{
 const cover={x:120,y:80,w:54,h:68};
 const area={rooms:[room],walls:[],cover:[cover]};
 const board=new ReplayDirectorStoryboard(15,t=>
  pose(t,t<.8?at(65,80):at(183,80),at(120,42)),
  {step:.8,...area});
 let prev=null;
 for(let i=0;i<=150;i++){
  const shot=board.sample(i*.1);
  assert.ok(directorCameraLegal(shot.cameraAnchor,room,area));
  if(prev){
   assert.ok(d(shot.cameraAnchor,prev.cameraAnchor)<2,
    'obstacle may stop dolly, but never trigger an instant relocation');
   assert.equal(directorLineBlocked(prev.cameraAnchor,
    shot.cameraAnchor,area,false),false);
  }
  prev=shot;
 }
});
test('doorway room jitter cannot manufacture frequent editorial cuts',()=>{
 const board=new ReplayDirectorStoryboard(18,t=>{
  const n=Math.floor(t/.8);
  return pose(t,n%2?at(318,70):at(55,70),at(138,70),
   n%2?'inner':'main',3);
 },{step:.8,...scene});
 let previous=null,changes=0;
 for(let i=0;i<=180;i++){
  const shot=board.sample(i*.1);
  if(previous&&shot.roomId!==previous.roomId)changes++;
  previous=shot;
 }
 assert.equal(changes,0,
  'alternating raw room picks are score jitter, not real room transitions');
});
test('a sustained room entry produces ONE edit, with no phantom interim cuts',()=>{
 const board=new ReplayDirectorStoryboard(14,t=>{
  const inSecond=t>=2.4;
  return pose(t,inSecond?at(316,76):at(54,70),
    inSecond?at(365,83):at(112,74),
    inSecond?'inner':'main',inSecond?2.3:3.1);
 },{step:.8,...scene});
 const edits=[];
 let previous=null;
 for(let i=0;i<=140;i++){
  const shot=board.sample(i*.1);
  if(previous&&shot.roomId!==previous.roomId)edits.push(i*.1);
  previous=shot;
 }
 assert.equal(edits.length,1,'one actual room transition yields one cut');
 assert.ok(edits[0]>3&&edits[0]<6,
  'transition waits for sustained group entry, not first doorway crossing');
 assert.equal(board.sample(0).roomId,'main');
 assert.equal(board.sample(13).roomId,'inner');
});
test('smoothing is independent of seek order and playback speed',()=>{
 const solve=t=>pose(t,t<4?at(44+t*8,60):at(200,110),
   at(160+20*Math.sin(t*.5),70), 'main',2.7);
 const board=new ReplayDirectorStoryboard(18,solve,{step:.8,...scene,
  maxCache:12});
 const reference=[.43,2.57,4.21,8.33,12.67,16.4]
  .map(t=>board.sample(t));
 for(const t of [17.3,12.67,1.1,8.33,4.21,2.57,.43,15.9])
  board.sample(t);
 assert.deepEqual(
  [.43,2.57,4.21,8.33,12.67,16.4].map(t=>board.sample(t)),
  reference);
});
