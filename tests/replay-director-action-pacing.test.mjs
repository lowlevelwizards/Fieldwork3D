import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ReplayDirectorStoryboard}
 from '../src/breach-replay-director-storyboard.ts';
import {composeReplayDirectorShot}
 from '../src/breach-replay-director-shots.ts';
import {physicalDirectorView,directorCameraLegal,directorOperatorRoom}
 from '../src/breach-replay-director-physical.ts';

const p=(x,y)=>({x,y});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const a=(id,x,y,v=0)=>({id,side:'blue',p:p(x,y),
 health:4,velocity:v,heading:0});
const main={id:'entry',x:0,y:0,w:150,h:160};
const inner={id:'inside',x:150,y:0,w:180,h:160};
const walls=[{a:p(150,0),b:p(150,60)},
 {a:p(150,104),b:p(150,160)}];
const door={id:'ENTRY',a:p(150,60),b:p(150,104),
 mid:p(150,82),normal:p(-1,0),approachSide:1,distance:22};
const intent=(actor,kind='entry',v=25)=>({
 actorId:actor.id,position:actor.p,heading:0,
 route:[actor.p,p(230,82)],direction:p(1,0),
 destination:p(230,82),door:{...door,distance:d(actor.p,door.mid),
  normal:actor.p.x>150?p(1,0):p(-1,0),
  approachSide:actor.p.x>150?-1:1},kind,speed:v,
 watchDirection:null,plannedAttention:null,activeRevision:1
});
const view=(raw,options={})=>new ReplayDirectorStoryboard(12,raw,{
 rooms:[main,inner],walls,step:.8,aspect:.78,baseSpan:1100,
 usableWidth:.75,usableHeight:.72,...options
});
const pose=(t,position,focus,kind='reorientation',motion=0,room='entry')=>({
 roomId:room,cameraAnchor:position,focus,
 operatorPoint:p(80,80),attentionPoint:null,
 framePoints:[p(80,80),p(110,80)],
 yaw:0,pitch:.65,zoom:3.4,fov:102,
 shotType:kind,kind:kind==='contact'?'action':'squad',
 subjects:['rook','moss'],beatId:null,doorId:null,
 score:100,occluded:0,motion,actorsFramed:2
});
test('quiet WATCH or idle composition holds perfectly still instead of orbiting',()=>{
 const storyboard=view(t=>pose(t,
  Math.floor(t/.8)%2?p(110,115):p(42,42),
  Math.floor(t/.8)%2?p(60,110):p(118,80)));
 const first=storyboard.sample(0);
 for(let time=.1;time<11;time+=.1){
  const frame=storyboard.sample(time);
  assert.deepEqual(frame.cameraAnchor,first.cameraAnchor);
  assert.deepEqual(frame.focus,first.focus);
  assert.equal(frame.zoom,first.zoom);
 }
});
test('one recorded lead entry changes the scene before the fourth teammate',()=>{
 const lead=a('rook',160,82,30);
 const friends=[lead,a('moss',128,76,20),a('ash',109,92,16),
  a('vale',82,70,14)];
 const shot=composeReplayDirectorShot(2.4,friends,[main,inner],
  walls,.78,0,1100,{
   intents:friends.map(actor=>intent(actor)),
   upcoming:null,beat:null,actionPair:null,
   doors:[{a:door.a,b:door.b,open:true,openFraction:1}],
   usableWidth:.75,usableHeight:.72
  });
 assert.ok(shot);
 assert.equal(shot.shotType,'entry');
 assert.equal(shot.roomId,'inside',
  'the first explicitly entering operator owns the new scene');
 assert.equal(shot.firstEntry,true);
 assert.ok(directorOperatorRoom(shot.cameraAnchor,[main,inner])?.id===
  'inside','lens moves into the new room rather than waiting for four people');
 const rail=view(t=>pose(t,t<.8?p(105,80):p(215,83),
  t<.8?p(110,82):p(250,82),'entry',42,t<.8?'entry':'inside'),
  {walls});
 // Treat the entry like an explicit known crossing; do not wait for
 // three additional .8s knots of room-majority confirmation.
 const follow=view(t=>({
  ...pose(t,t<.8?p(105,80):p(215,83),
   t<.8?p(110,82):p(250,82),'entry',42,
   t<.8?'entry':'inside'),
  firstEntry:t>=.8,doorId:'ENTRY'
 }),{walls});
 assert.equal(follow.sample(.2).roomId,'entry');
 assert.equal(follow.sample(1.3).roomId,'inside',
  'scene edit should happen promptly when FIRST breacher enters');
 assert.equal(follow.sample(4).roomId,'inside');
});
test('the physical door camera faces the doorway from its FRONT and behind lead',()=>{
 const operator=p(104,81),target=p(150,82);
 const scene={rooms:[main],walls:[]};
 const shot=physicalDirectorView({
  operator,focus:p(129,81),
  subjectPoints:[operator,p(85,95),p(79,69)],
  target,preferredYaw:-Math.PI/2,
  followDirection:p(1,0),doorPoint:target,
  doorNormal:p(-1,0),targetWeight:190
 },scene,.8);
 assert.equal(shot.targetVisible,true);
 assert.ok(shot.cameraAnchor.x<operator.x-15,
  'follow shot must be physically behind the breacher, not on their face');
 const frontal=(target.x-shot.cameraAnchor.x)/
  Math.max(1,d(target,shot.cameraAnchor));
 assert.ok(frontal>.65,
  'camera should face the door nearly square-on, not film the jamb sideways');
 assert.ok(d(operator,shot.cameraAnchor)>=40,
  'never plant the lens right against a backpack');
});
test('portrait firefight keeps SHOOTER AND TARGET on screen with breathing room',()=>{
 const actors=[
  a('rook',92,84,18),a('moss',87,104,16),
  a('ash',69,70,14),a('vale',64,105,12),
  {...a('hostile',220,82,0),side:'red'}
 ];
 const room={id:'hall',x:0,y:0,w:290,h:180};
 const shot=composeReplayDirectorShot(3,actors,[room],[],
  .75,0,1100,{
   intents:[],upcoming:null,
   beat:{id:'fight:1',kind:'fight',start:1,first:2.8,last:3.2,
    end:4,actorId:'rook',shooterId:'rook',targetId:'hostile',
    shooter:actors[0].p,target:actors[4].p,doorId:null},
   actionPair:{shooter:actors[0].p,target:actors[4].p},
   usableWidth:.73,usableHeight:.7
  });
 assert.ok(shot);
 assert.deepEqual(shot.attentionPoint,actors[4].p);
 assert.ok(shot.framePoints.some(x=>d(x,actors[0].p)<.01));
 assert.ok(shot.framePoints.some(x=>d(x,actors[4].p)<.01),
  'not just the operator: target must be a compulsory framing anchor');
 assert.ok(shot.zoom<=7.4);
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2400);
 camera.position.set(shot.cameraAnchor.x,53,shot.cameraAnchor.y);
 camera.up.set(0,1,0);camera.lookAt(shot.focus.x,17,shot.focus.y);
 const span=1100/shot.zoom;
 camera.left=-span*.75/2;camera.right=span*.75/2;
 camera.top=span/2;camera.bottom=-span/2;
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 for(const point of [actors[0].p,actors[4].p]){
  for(const height of [5,38]){
   const v=new THREE.Vector3(point.x,height,point.y).project(camera);
   assert.ok(Math.abs(v.x)<.88&&Math.abs(v.y)<.88,
    'two-shot must include both silhouettes with breathing room '+v.toArray());
  }
 }
});
test('actual recorded action tracks farther than quiet rig without cuts',()=>{
 const room={id:'big',x:0,y:0,w:450,h:180};
 const physical={rooms:[room],walls:[],cover:[]};
 const rail=new ReplayDirectorStoryboard(10,t=>{
  const x=90+Math.min(170,t*30);
  return {...pose(t,p(x-52,98),p(x+90,92),'contact',80,'big'),
   operatorPoint:p(x,85),attentionPoint:p(x+110,85),
   framePoints:[p(x,85),p(x+110,85)],
   firstEntry:false};
 },{...physical,step:.8,aspect:.8,baseSpan:1100});
 let previous=null;
 for(let t=0;t<=8;t+=.1){
  const frame=rail.sample(t);
  assert.ok(directorCameraLegal(frame.cameraAnchor,room,physical));
  if(previous)assert.ok(d(frame.cameraAnchor,previous.cameraAnchor)<8.2,
   'follow dolly is continuous, never a jump cut');
  previous=frame;
 }
 assert.ok(rail.sample(8).cameraAnchor.x-
  rail.sample(0).cameraAnchor.x>130,
  'camera should actually follow the moving main operator at speed');
});
