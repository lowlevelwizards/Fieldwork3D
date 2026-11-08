import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDirectorFilmBeats,directorFilmBeatAt,directorFilmPair}
  from '../src/breach-replay-director-film.ts';
import {ReplayDirectorStoryboard}
  from '../src/breach-replay-director-storyboard.ts';
import {composeReplayDirectorShot}
  from '../src/breach-replay-director-shots.ts';

const friendly=new Set(['rook','moss']);
const doors=[{id:'door-a',a:{x:190,y:40},b:{x:190,y:120}}];
const actors=[
 {id:'rook',p:{x:90,y:74},heading:0,health:3,velocity:17},
 {id:'moss',p:{x:105,y:83},heading:0,health:3,velocity:15},
 {id:'hostile',p:{x:286,y:72},heading:Math.PI,health:3,velocity:0}
];
const frame=t=>({t,actors});
const shot=(id,t,shooterId='rook',targetId='hostile')=>({
 id,recordedAt:t,shooterId,targetId,
 start:{x:90,y:74},end:{x:290,y:73},side:'blue',hit:false
});
const event=(id,t,kind='door',actor='rook')=>({
 key:id,t,kind,actor,p:{x:190,y:80}
});
const scenes=[
 {id:'near',x:35,y:32,w:150,h:100},
 {id:'far',x:190,y:32,w:165,h:100}
];
const take=(beat,frameAt=4.2)=>{
 const pair=directorFilmPair(beat,frame(frameAt));
 return composeReplayDirectorShot(frameAt,
  actors.map(a=>({...a,side:friendly.has(a.id)?'blue':'red'})),
  scenes,[],1.1,0,1100,
  {intents:[],upcoming:null,beat,actionPair:pair,
   usableWidth:.85,usableHeight:.78,maxZoom:14});
};
test('camera pre-roll discovers a known upcoming gunfight and keeps firing pair',()=>{
 const beats=buildDirectorFilmBeats([shot(1,5),shot(2,5.2)],
  [],frame,doors,friendly,()=>true);
 assert.equal(beats.length,1,'burst is one established shot, not two cuts');
 assert.equal(directorFilmBeatAt(2.3,beats),null);
 assert.equal(directorFilmBeatAt(2.5,beats)?.kind,'fight');
 assert.equal(directorFilmBeatAt(5.12,beats)?.kind,'fight');
 const beat=directorFilmBeatAt(4.2,beats);
 assert.equal(beat?.targetId,'hostile');
 const pair=directorFilmPair(beat,frame(4.2));
 assert.deepEqual(pair.shooter,actors[0].p);
 assert.deepEqual(pair.target,actors[2].p);
});
test('recorded gunfight wins over approaching breach and keeps both in view',()=>{
 const beats=buildDirectorFilmBeats([shot(1,5)],
  [event('a',4.8)],frame,doors,friendly,()=>true);
 const fight=directorFilmBeatAt(4.1,beats);
 assert.equal(fight?.kind,'fight');
 const result=take(fight);
 assert.equal(result.shotType,'contact');
 assert.ok(result.subjects.includes('rook'));
 assert.equal(result.roomId,'near');
 assert.ok(result.cameraAnchor.x>scenes[0].x+1&&
   result.cameraAnchor.x<scenes[0].x+scenes[0].w-1);
 assert.ok(result.cameraAnchor.y>scenes[0].y+1&&
   result.cameraAnchor.y<scenes[0].y+scenes[0].h-1);
 const cameraElevation=Math.atan2(53-17,Math.hypot(
   result.focus.x-result.cameraAnchor.x,
   result.focus.y-result.cameraAnchor.y));
 assert.ok(Math.abs(result.pitch-cameraElevation)<1e-7,
   'ortho projection and fit should match the actual in-room camera elevation');
 assert.ok(result.zoom<=6,
   'wide director composition must not crop back into an operator close-up');
 // Use the same center-aware ortho geometry as shot selection. Both
 // shooter and target must fit regardless of ordinary 6x camera cap.
 const c=Math.cos(result.yaw),s=Math.sin(result.yaw);
 const w=.85*1.1*1100/result.zoom/2;
 const h=.78*1100/result.zoom/2;
 for(const p of [actors[0].p,actors[2].p]){
   const dx=p.x-result.focus.x,dy=p.y-result.focus.y;
   assert.ok(Math.abs(dx*c-dy*s)+16<w,
     'shooter AND target need visible horizontal safety margin');
   assert.ok(Math.abs((dx*s+dy*c)*Math.sin(result.pitch))+27<h,
     'shooter AND target need visible vertical safety margin');
 }
});
test('disclosure gating cannot insert a hidden shot into the storyboard',()=>{
 const hidden=shot(1,5,'hostile','rook');hidden.side='red';
 const beats=buildDirectorFilmBeats([hidden],[],
  frame,doors,friendly,s=>s.side==='blue');
 assert.deepEqual(beats,[]);
});
test('door staging starts before a recorded breach and releases after entry',()=>{
 const beats=buildDirectorFilmBeats([],
  [event('a',8)],frame,doors,friendly,()=>true);
 assert.equal(beats.length,1);
 assert.equal(directorFilmBeatAt(5.1,beats)?.kind,'door');
 assert.equal(directorFilmBeatAt(8.2,beats)?.doorId,'door-a');
 assert.equal(directorFilmBeatAt(8.9,beats),null);
 const pose=take(beats[0],7.8);
 assert.equal(pose.shotType,'breach');
 assert.equal(pose.doorId,'door-a');
 assert.ok(pose.cameraAnchor.x>=scenes[0].x);
});
test('director camera film path is deterministic across seek order and rate',()=>{
 let solves=0;
 const storyboard=new ReplayDirectorStoryboard(25,time=>{
  solves++;
  return {
   focus:{x:60+time*5,y:72+Math.sin(time)*4},
   cameraAnchor:{x:32+time*5,y:56},
   zoom:12-time*.15,
   pitch:16*Math.PI/180,
   yaw:(Math.PI*1.92+time*.08)%(2*Math.PI),
   roomId:'near',actorsFramed:2,
   shotType:'travel',kind:'squad',
   subjects:['rook','moss'],doorId:null,
   score:40,occluded:0,motion:30
  };
 },{step:.8,maxCache:8});
 const first=storyboard.sample(11.31);
 storyboard.sample(3.2);
 storyboard.sample(8.9);
 storyboard.sample(11.31);
 assert.deepEqual(storyboard.sample(11.31),first);
 assert.ok(storyboard.cachedKnots<=8);
 assert.ok(solves<45,'deterministic checkpoints keep random seeks bounded');
 const cached=solves;
 storyboard.sample(11.31);
 assert.equal(solves,cached,'an unchanged playback timestamp reuses its pose');
 assert.ok(first.zoom>6,'director bypasses ordinary tactical zoom');
 assert.ok(first.pitch<20*Math.PI/180);
});
test('camera moves smoothly between fixed planned poses without 360° yaw whip',()=>{
 const storyboard=new ReplayDirectorStoryboard(4,t=>{
  const focus={x:t*30,y:80};
  const yaw=t<.8?Math.PI*1.95:Math.PI*.03;
  return {
  focus,
  cameraAnchor:{x:focus.x+Math.sin(yaw)*45,
    y:focus.y+Math.cos(yaw)*45},
  zoom:12,pitch:17*Math.PI/180,
  yaw,
  roomId:'near',actorsFramed:2,
  shotType:'contact',kind:'action',
  subjects:['rook'],doorId:null,
  score:60,occluded:0,motion:12
 };},{step:.8});
 const before=storyboard.sample(.35);
 const after=storyboard.sample(.45);
 const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 assert.ok(Math.abs(angle(after.yaw,before.yaw))<.15,
  'yaw delta='+angle(after.yaw,before.yaw)+
  ' poses='+JSON.stringify({before,after}));
 assert.ok(Math.abs(after.focus.x-before.focus.x)<10);
});
test('cross-room cut keeps camera inside a room, never halfway into a wall',()=>{
 const board=new ReplayDirectorStoryboard(5,t=>({
  focus:{x:t<.8?100:225,y:75},
  cameraAnchor:{x:t<.8?70:205,y:60},
  zoom:9,pitch:.3,yaw:0,roomId:t<.8?'near':'far',
  actorsFramed:2,shotType:'entry',kind:'squad',
  subjects:['rook'],doorId:'door-a',score:50,occluded:0,motion:20
 }),{step:.8});
 assert.equal(board.sample(.2).cameraAnchor.x,70);
 assert.equal(board.sample(.6).cameraAnchor.x,70,
  'first room change proposal cannot trigger an instant cut');
 assert.equal(board.sample(3.2).cameraAnchor.x,205,
  'confirmed room transition is a single purposeful scene change');
});

const signedAngle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const room={id:'lab',x:0,y:0,w:250,h:190};
const stablePose=(t,yaw,beatId=null,roomId='lab')=>({
 focus:{x:114+t*1.3,y:94},
 cameraAnchor:{x:114+t*1.3+Math.sin(yaw)*50,
   y:94+Math.cos(yaw)*50},
 zoom:11,pitch:17*Math.PI/180,yaw,roomId,beatId,
 actorsFramed:2,shotType:beatId?'contact':'travel',
 kind:beatId?'action':'squad',subjects:['rook'],
 doorId:null,score:60,occluded:0,motion:24
});
test('frequent 180-degree raw solver reversals no longer whip the camera',()=>{
 const director=new ReplayDirectorStoryboard(16,
  t=>stablePose(t,Math.floor(t/.8)%2?Math.PI:0),{
   step:.8,maxCache:12,rooms:[room]});
 let previous=null;
 for(let i=0;i<18;i++){
   const p=director.sample(i*.8);
   if(previous)assert.ok(Math.abs(signedAngle(p.yaw,previous.yaw))<
      9*Math.PI/180,
     'one recorded knot may not whip around on a score reversal');
   assert.ok(p.cameraAnchor.x>room.x&&
     p.cameraAnchor.x<room.x+room.w&&
     p.cameraAnchor.y>room.y&&
     p.cameraAnchor.y<room.y+room.h,
     'real camera must remain inside the occupied room');
   const physical=Math.atan2(
     p.cameraAnchor.x-p.focus.x,p.cameraAnchor.y-p.focus.y);
   assert.ok(Math.abs(signedAngle(physical,p.yaw))<.001,
     'rendered camera position must agree with the planned yaw');
   previous=p;
 }
});
test('one firefight keeps its established camera side throughout the exchange',()=>{
 const director=new ReplayDirectorStoryboard(6,t=>stablePose(
  t,Math.floor(t/.8)%2?Math.PI:0,'fight:17'),
  {step:.8,rooms:[room]});
 const first=director.sample(0);
 for(let t=.8;t<5;t+=.8){
   const shot=director.sample(t);
   assert.ok(Math.abs(signedAngle(shot.yaw,first.yaw))<.13,
    'same filmed combat beat allows only tiny physical lens pans, not orbits');
 }
});
test('new action in same room does not cause a jump cut or fast spin',()=>{
 const director=new ReplayDirectorStoryboard(4,
  t=>stablePose(t,t<.8?0:Math.PI,t<.8?null:'fight:19'),{
   step:.8,rooms:[room]});
 const early=director.sample(.2),late=director.sample(.6);
 assert.ok(Math.abs(signedAngle(late.yaw,early.yaw))<.35,
  'a new combat beat must retain a stable camera side, not jump 180 degrees');
 assert.ok(Math.hypot(late.cameraAnchor.x-early.cameraAnchor.x,
   late.cameraAnchor.y-early.cameraAnchor.y)<18,
  'do not teleport the camera within an occupied room');
});
test('a one-knot room boundary flicker cannot force two camera cuts',()=>{
 const rooms=[room,{id:'next',x:250,y:0,w:220,h:190}];
 const director=new ReplayDirectorStoryboard(4,t=>
  stablePose(t,0, null,Math.floor(t/.8)===1?'next':'lab'),{
   step:.8,rooms});
 assert.equal(director.sample(0).roomId,'lab');
 assert.equal(director.sample(.8).roomId,'lab');
 assert.equal(director.sample(1.6).roomId,'lab');
});
test('gunshots against different nearby targets stay in one cinematic fight',()=>{
 const mixed=[
  shot(1,5,'rook','hostile'),
  shot(2,5.45,'rook','enemy-2'),
  shot(3,5.8,'hostile','rook')
 ];
 const episodes=buildDirectorFilmBeats(mixed,[],
  frame,doors,friendly,()=>true);
 assert.equal(episodes.length,1,
  'one fight should not trigger a new camera setup for every target');
 assert.equal(episodes[0].last,5.8);
});
