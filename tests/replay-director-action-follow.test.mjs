import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {composeReplayDirectorShot}
  from '../src/breach-replay-director-shots.ts';
import {ReplayDirectorStoryboard}
  from '../src/breach-replay-director-storyboard.ts';
import {directorCameraLegal}
  from '../src/breach-replay-director-physical.ts';

const at=(x,y)=>({x,y});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const room={id:'hall',x:0,y:0,w:415,h:230};
const all=[{id:'rook',side:'blue',p:at(93,104),health:3,velocity:27,heading:0},
 {id:'moss',side:'blue',p:at(104,124),health:3,velocity:22,heading:0},
 {id:'ash',side:'blue',p:at(82,89),health:3,velocity:15,heading:0},
 {id:'vale',side:'blue',p:at(76,135),health:3,velocity:16,heading:0},
 {id:'hostile',side:'red',p:at(205,100),health:3,velocity:0,heading:3}];
const beat={id:'fight:x',kind:'fight',start:1,first:3,last:4,end:5,
 actorId:'rook',shooterId:'rook',targetId:'hostile',
 shooter:all[0].p,target:all[4].p,doorId:null};
const scene={rooms:[room],walls:[],cover:[]};
function shot(frame=all,context={}){
 return composeReplayDirectorShot(3,frame,[room],[],.82,0,1100,{
  intents:[],upcoming:null,beat,
  actionPair:frame[4]?{shooter:frame[0].p,target:frame[4].p}:null,
  usableWidth:.77,usableHeight:.75,maxZoom:14,...context
 });
}
test('fight shot names lead operator and preserves both actual firing endpoints',()=>{
 const result=shot();
 assert.ok(result);
 assert.deepEqual(result.operatorPoint,all[0].p);
 assert.deepEqual(result.attentionPoint,all[4].p);
 assert.ok(result.framePoints.some(p=>distance(p,all[0].p)<.001));
 assert.ok(result.framePoints.some(p=>distance(p,all[4].p)<.001),
  'a line-of-sight fight MUST pass the actual target to camera framing');
 assert.ok(result.framePoints.length>=5,
  'keep squad support and the real target as compositional points');
 assert.ok(result.zoom>.65&&result.zoom<=9.01);
 assert.ok(directorCameraLegal(result.cameraAnchor,room,scene));
 const offset=result.cameraAnchor.x-result.operatorPoint.x;
 assert.ok(offset<32,'favor an over-the-shoulder position, not a reverse shot');
});
test('upcoming physical door stays a priority while lead breacher approaches',()=>{
 const door={id:'D1',mid:at(210,105),
  a:at(210,87),b:at(210,123),normal:at(-1,0),
  distance:27,approachSide:1};
 const intent=(actor,kind,speed,distanceToDoor)=>({
  actorId:actor.id,position:actor.p,heading:0,route:[actor.p,door.mid],
  direction:at(1,0),destination:door.mid,
  door:{...door,distance:distanceToDoor},kind,speed,
  watchDirection:null,plannedAttention:null,activeRevision:1
 });
 const nearby=[
  {...all[0],p:at(175,100),velocity:25},
  {...all[1],p:at(164,120),velocity:16},
  {...all[2],p:at(124,90),velocity:3},
  {...all[3],p:at(108,140),velocity:1}
 ];
 const intents=[
  intent(nearby[0],'breach',25,35),
  intent(nearby[1],'approach',16,46),
  intent(nearby[2],'travel',3,80),
  intent(nearby[3],'hold',1,110)
 ];
 const result=shot(nearby,{beat:null,actionPair:null,intents,doors:[]});
 assert.ok(result);
 assert.equal(result.shotType,'breach');
 assert.equal(result.doorId,'D1');
 assert.deepEqual(result.operatorPoint,nearby[0].p,
  'the breacher should control the shot over idle teammates');
 assert.deepEqual(result.attentionPoint,door.mid);
 assert.ok(result.framePoints.some(p=>distance(p,door.mid)<.001),
  'the door itself is an indispensable framing endpoint');
});
test('moving follow rig dollies decisively without edits, while maintaining two-shot and optical zoom',()=>{
 const moving=t=>{
  const lead=at(74+Math.min(175,t*18),112);
  const trailing=at(lead.x-17,124);
  const target=at(348,108);
  const cameraAnchor=at(lead.x-58,138);
  const focus=at((lead.x+target.x)/2,111);
  return {
   roomId:'hall',cameraAnchor,focus,
   operatorPoint:lead,attentionPoint:target,
   framePoints:[lead,trailing,target],followDirection:at(1,0),
   zoom:3.8,fov:100,pitch:.55,yaw:0,
   subjects:['rook','moss'],motion:88,beatId:'fight:x',
   shotType:'contact',kind:'action',actorsFramed:2,
   doorId:null,score:120,occluded:0
  };
 };
 const director=new ReplayDirectorStoryboard(12,moving,{
  ...scene,step:.8,aspect:.82,baseSpan:1100,
  usableWidth:.76,usableHeight:.72
 });
 let previous=null;
 for(let t=0;t<=10;t+=.1){
  const view=director.sample(t);
  assert.equal(view.roomId,'hall');
  assert.ok(directorCameraLegal(view.cameraAnchor,room,scene));
  if(previous)assert.ok(distance(view.cameraAnchor,
    previous.cameraAnchor)<4,
   'tracking may accelerate but never jump to another camera anchor');
  previous=view;
 }
 const start=director.sample(0),later=director.sample(8.0);
 assert.ok(later.cameraAnchor.x-start.cameraAnchor.x>95,
  'camera should actually follow the moving operators, not lag behind');
 assert.ok(later.zoom>start.zoom*1.08,
  'as lead team closes on target, optical zoom should become more expressive');
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2400);
 camera.position.set(later.cameraAnchor.x,53,later.cameraAnchor.y);
 camera.up.set(0,1,0);
 camera.lookAt(later.focus.x,17,later.focus.y);
 const span=1100/later.zoom;
 camera.left=-span*.82/2;camera.right=span*.82/2;
 camera.top=span/2;camera.bottom=-span/2;
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 for(const p of moving(8).framePoints){
  const projected=new THREE.Vector3(p.x,21,p.y).project(camera);
  assert.ok(Math.abs(projected.x)<.96&&Math.abs(projected.y)<.96,
   'shooter and target must both remain in the actual moving viewport');
 }
});

test('following dolly takes a legal furniture detour rather than freezing or teleporting',()=>{
 const furniture={x:150,y:110,w:56,h:78};
 const setting={rooms:[room],walls:[],cover:[furniture]};
 const director=new ReplayDirectorStoryboard(14,t=>({
   roomId:'hall',cameraAnchor:t<.8?at(70,110):at(231,110),
   focus:at(280,112),operatorPoint:at(270,112),
   attentionPoint:at(340,112),followDirection:at(1,0),
   framePoints:[at(270,112),at(340,112)],
   zoom:3.4,fov:105,pitch:.6,yaw:0,
   subjects:['rook','moss'],motion:72,beatId:'fight:couch',
   shotType:'contact',kind:'action',actorsFramed:2,
   doorId:null,score:99,occluded:0
 }),{...setting,step:.8,aspect:.82,baseSpan:1100});
 let prev=null;
 for(let t=0;t<=13;t+=.1){
   const shot=director.sample(t);
   assert.ok(directorCameraLegal(shot.cameraAnchor,room,setting),
     'camera cannot intersect or pass through the table');
   if(prev)assert.ok(distance(shot.cameraAnchor,prev.cameraAnchor)<4,
     'detour must be an actual dolly, not a teleport');
   prev=shot;
 }
 assert.ok(director.sample(13).cameraAnchor.x>188,
   'camera must find a real walkable route around the obstacle');
});
