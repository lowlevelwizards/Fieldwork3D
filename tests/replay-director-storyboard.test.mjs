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
 assert.ok(result.pitch<=36*Math.PI/180,
   'director is lower than tactical orbit');
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
 assert.ok(solves<=8,'cached knots should not be re-solved each render');
 assert.ok(first.zoom>6,'director bypasses ordinary tactical zoom');
 assert.ok(first.pitch<20*Math.PI/180);
});
test('camera moves smoothly between fixed planned poses without 360° yaw whip',()=>{
 const storyboard=new ReplayDirectorStoryboard(4,t=>({
  focus:{x:t*30,y:80},
  cameraAnchor:{x:24+t*30,y:64},
  zoom:12,pitch:17*Math.PI/180,
  yaw:t<.8?Math.PI*1.95:Math.PI*.03,
  roomId:'near',actorsFramed:2,
  shotType:'contact',kind:'action',
  subjects:['rook'],doorId:null,
  score:60,occluded:0,motion:12
 }),{step:.8});
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
 assert.equal(board.sample(.6).cameraAnchor.x,205);
});
