import test from 'node:test';
import assert from 'node:assert/strict';
import {
  physicalDirectorView,directorCameraLegal,directorOperatorRoom,
  directorLineBlocked
} from '../src/breach-replay-director-physical.ts';
import {ReplayDirectorStoryboard}
  from '../src/breach-replay-director-storyboard.ts';

const entry={id:'entry',x:0,y:0,w:140,h:120};
const inner={id:'inner',x:140,y:0,w:160,h:120};
const walls=[
 {a:{x:0,y:0},b:{x:140,y:0}},
 {a:{x:0,y:0},b:{x:0,y:120}},
 {a:{x:0,y:120},b:{x:140,y:120}},
 {a:{x:140,y:0},b:{x:140,y:45}},
 {a:{x:140,y:75},b:{x:140,y:120}},
 {a:{x:140,y:0},b:{x:300,y:0}},
 {a:{x:300,y:0},b:{x:300,y:120}},
 {a:{x:140,y:120},b:{x:300,y:120}}
];
const door={a:{x:140,y:45},b:{x:140,y:75},
  open:true,openFraction:1,style:'wood'};
const scene={rooms:[entry,inner],walls,doors:[door],
  cover:[{x:42,y:69,w:28,h:28}]};
const request={
 operator:{x:97,y:65},focus:{x:160,y:65},
 subjectPoints:[{x:97,y:65},{x:104,y:79}],
 target:{x:220,y:60},preferredYaw:Math.PI*1.45
};
const pointIn=(p,r)=>p.x>r.x&&p.x<r.x+r.w&&
  p.y>r.y&&p.y<r.y+r.h;
test('Director physically remains inside same room as friendly actors',()=>{
 const film=physicalDirectorView(request,scene,1.2);
 assert.equal(film.roomId,'entry');
 assert.ok(pointIn(film.cameraAnchor,entry),
  'camera anchor MUST be within the occupied room');
 assert.ok(directorCameraLegal(film.cameraAnchor,entry,scene));
 assert.equal(directorLineBlocked(film.cameraAnchor,request.operator,scene),
  false,'operator must be optically reachable without X-ray walls');
 assert.ok(film.fov>=96&&film.fov<=116,
  'wide perspective audition can use a genuinely broad interior lens');
});
test('solid partition and closed doors cannot be made transparent by framing',()=>{
 assert.equal(directorLineBlocked({x:80,y:24},{x:235,y:24},scene),true);
 const closed={...scene,doors:[{...door,open:false,openFraction:0}]};
 const shot=physicalDirectorView(request,closed,1.1);
 assert.equal(shot.targetVisible,false,
  'shoot-through-wall or shut-door targets are not valid two-shots');
 assert.ok(pointIn(shot.cameraAnchor,entry));
 assert.equal(directorLineBlocked(shot.cameraAnchor,shot.focus,closed),false,
  'if target is hidden, compose toward the operator instead');
});
test('open doorway permits a real interior sightline to the target',()=>{
 const shot=physicalDirectorView(request,scene,1.2);
 assert.ok(shot.targetVisible,
  'camera may include target when the open doorway permits a line');
 assert.equal(directorLineBlocked(shot.cameraAnchor,
  request.target,scene),false);
 assert.ok(pointIn(shot.cameraAnchor,entry),
  'a visible opponent across a doorway must not pull camera outside');
});
test('furniture, walls, door leaf and standing actors exclude physical positions',()=>{
 const obstructed=[
  {x:42,y:69},  // inside center-based fixture
  {x:4,y:30},   // inside wall thickness
  {x:140,y:64}, // on doorway threshold
 ];
 for(const p of obstructed)
  assert.equal(directorCameraLegal(p,entry,scene),false,
   'the camera operator cannot stand inside solid physical geometry');
 const shot=physicalDirectorView(request,scene);
 assert.ok(Math.abs(shot.cameraAnchor.x-42)>14||
   Math.abs(shot.cameraAnchor.y-69)>14);
});
test('threshold assignment and outdoors are derived from operator, not target',()=>{
 assert.equal(directorOperatorRoom({x:136,y:60},scene.rooms)?.id,'entry');
 assert.equal(directorOperatorRoom({x:145,y:61},scene.rooms)?.id,'inner');
 assert.equal(directorOperatorRoom({x:-30,y:40},scene.rooms),null);
 const outside=physicalDirectorView({...request,
  operator:{x:-35,y:65},focus:{x:20,y:60},
  subjectPoints:[{x:-35,y:65}],target:null
 },scene);
 assert.equal(outside.roomId,null);
 assert.equal(scene.rooms.some(r=>pointIn(outside.cameraAnchor,r)),false);
});
test('an obstructed new camera position must cut rather than pass through wall',()=>{
 const plan=new ReplayDirectorStoryboard(3,t=>({
  focus:{x:t<.8?70:209,y:60},cameraAnchor:{
   x:t<.8?95:238,y:90},
  roomId:t<.8?'entry':'inner',fov:76,
  zoom:9,yaw:0,pitch:.27,actorsFramed:1,
  kind:'squad',shotType:'entry',subjects:['rook'],
  doorId:null,beatId:null,score:1,occluded:0,motion:20,
  operatorPoint:{x:t<.8?80:215,y:65}
 }),{rooms:scene.rooms,walls,step:.8});
 const p=plan.sample(.2),q=plan.sample(.6);
 assert.ok(pointIn(p.cameraAnchor,entry));
 assert.ok(pointIn(q.cameraAnchor,inner));
 assert.equal(plan.sample(.2).roomId,'entry');
 assert.equal(plan.sample(.6).roomId,'inner');
});
