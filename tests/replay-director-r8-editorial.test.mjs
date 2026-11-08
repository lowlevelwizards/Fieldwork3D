import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDirectorEntryEvents,directorFirstEntryAt}
 from '../src/breach-replay-director-crossings.ts';
import {selectDirectorEditorialShot}
 from '../src/breach-replay-director-edit.ts';
import {composeReplayDirectorShot}
 from '../src/breach-replay-director-shots.ts';
import {ReplayDirectorStoryboard}
 from '../src/breach-replay-director-storyboard.ts';
import {directorOrthoFittingZoom,directorPerspectiveCovers}
 from '../src/breach-replay-director-projection.ts';

const pt=(x,y)=>({x,y});
const actor=(id,x,y,v=0)=>({id,p:pt(x,y),side:'blue',
 health:4,heading:0,velocity:v});
const door={id:'D',a:pt(100,40),b:pt(100,80),open:true};
const friendlies=new Set(['rook','moss','vale','ash']);
const evidence={intents:[],upcoming:null};
const event=(t,x,y=60)=>({t,actors:[{
 ...actor('rook',x,y,25),plan:[]
 }]});
test('crossings: first actual entry, not intent or aperture jitter',()=>{
 const frames=[
  event(0,78),event(.1,87),event(.2,96),event(.3,102),
  event(.4,112),event(.5,115),
  {t:.6,actors:[actor('rook',116,60),
   actor('moss',85,60)]},
  {t:.7,actors:[actor('rook',122,60),
   actor('moss',96,60)]},
  {t:.8,actors:[actor('rook',127,60),
   actor('moss',113,60)]}
 ];
 const entries=buildDirectorEntryEvents(frames,[door],friendlies);
 assert.equal(entries.length,2);
 assert.equal(entries[0].actorId,'rook');
 assert.equal(entries[0].first,true);
 assert.equal(entries[1].first,false);
 assert.equal(entries[0].sequenceId,entries[1].sequenceId);
 assert.equal(directorFirstEntryAt(.45,entries)?.actorId,'rook');
 assert.equal(directorFirstEntryAt(.75,entries)?.actorId,'rook');
});
test('crossings: moving across an extended wall, not aperture, is rejected',()=>{
 const frames=[
  event(0,88,15),event(.1,95,15),event(.2,102,15),
  event(.3,112,15)
 ];
 assert.equal(buildDirectorEntryEvents(frames,[door],friendlies).length,0);
});
test('editorial priority: real firefight selects shooter and target, not support',()=>{
 const actors=[
  actor('rook',80,50,20),actor('moss',90,55,28),
  actor('ash',78,70,0),
  {...actor('hostile',185,50),side:'red'}
 ];
 const beat={id:'fight:22',kind:'fight',first:3,start:1,
  last:3.2,end:4,actorId:'rook',shooterId:'rook',
  targetId:'hostile',shooter:pt(80,50),target:pt(185,50),
  doorId:null};
 const selected=selectDirectorEditorialShot(3.1,actors,{
  ...evidence,beat,actionPair:{shooter:pt(80,50),
   target:pt(185,50)}});
 assert.equal(selected.kind,'engage');
 assert.equal(selected.primaryActorId,'rook');
 assert.equal(selected.required.length,2);
 assert.equal(selected.required[1].x,185);
 assert.ok(selected.secondaryActorIds.includes('moss'));
});
test('editorial priority: the first entrant controls transition, not majority',()=>{
 const entry={id:'D:rook:1',doorId:'D',actorId:'rook',t:1,
  fromSide:1,toSide:-1,first:true,sequenceId:'D:1:1'};
 const selected=selectDirectorEditorialShot(1.1,[
  actor('rook',115,60,23),actor('moss',78,58,25),
  actor('ash',80,70,14),actor('vale',75,82,8)
 ],{...evidence,entry});
 assert.equal(selected.kind,'entry');
 assert.equal(selected.primaryActorId,'rook');
 assert.equal(selected.firstEntry,true);
});
test('editorial: future action never invents undisclosed target point',()=>{
 const selected=selectDirectorEditorialShot(4.2,
  [actor('rook',55,60,19)],{...evidence,
   upcoming:{t:5,actorId:'rook',kind:'contact',lead:1,weight:6}});
 assert.equal(selected.kind,'engage');
 assert.equal(selected.required.length,1);
 assert.equal(selected.target,null);
});
test('composer prefers mandatory shooter and target to extra teammates',()=>{
 const squad=[actor('rook',95,84,12),actor('moss',72,109,8),
  actor('ash',61,70,0),actor('vale',45,100,0)];
 const room={id:'r',x:0,y:0,w:320,h:180};
 const beat={id:'fight:9',kind:'fight',start:1,first:2,
  last:2.3,end:3,actorId:'rook',shooterId:'rook',
  targetId:'guard',shooter:squad[0].p,target:pt(239,84),
  doorId:null};
 const shot=composeReplayDirectorShot(2.1,
  [...squad,{...actor('guard',239,84),side:'red'}],[room],[],
  .77,0,1100,{...evidence,beat,actionPair:{
   shooter:squad[0].p,target:pt(239,84)
  },usableWidth:.75,usableHeight:.72});
 assert.ok(shot);
 assert.deepEqual(shot.requiredPoints[0],squad[0].p);
 assert.ok(shot.requiredPoints.some(p=>p.x===239));
 assert.ok(shot.zoom<=8.0);
 assert.ok(shot.editorialId?.startsWith('fight:'));
});
test('a new action already covered by the existing camera keeps its setup',()=>{
 const room={id:'r',x:0,y:0,w:280,h:180};
 const raw=(t)=>({
  cameraAnchor:pt(t<.8?45:205,78),focus:pt(110,78),
  zoom:2.5,yaw:0,pitch:.6,fov:105,
  roomId:'r',kind:'action',actorsFramed:2,
  shotType:t<.8?'travel':'contact',
  subjects:['rook','moss'],doorId:null,score:80,occluded:0,
  motion:t<.8?18:0,framePoints:[pt(98,78),pt(130,78)],
  requiredPoints:[pt(98,78),pt(130,78)],
  editorialId:t<.8?'travel:rook':'fight:3',
  editorialPriority:t<.8?2.6:6,
  primaryActorId:'rook',operatorPoint:pt(98,78)
 });
 const rail=new ReplayDirectorStoryboard(4,raw,{
  step:.8,rooms:[room],walls:[],aspect:.82,baseSpan:1100
 });
 const first=rail.sample(0),after=rail.sample(1.6);
 assert.deepEqual(after.cameraAnchor,first.cameraAnchor);
 assert.equal(after.cameraDecision,'hold:action-covered');
 assert.equal(after.editorialId,'fight:3');
});
test('a serious action out of prior coverage earns a motivated same-room cut',()=>{
 const room={id:'r',x:0,y:0,w:500,h:220};
 const raw=t=>({
  cameraAnchor:t<.8?pt(50,90):pt(333,90),
  focus:t<.8?pt(120,90):pt(390,90),
  roomId:'r',zoom:4,yaw:0,pitch:.6,fov:106,
  kind:'action',shotType:t<.8?'travel':'contact',
  subjects:['rook'],actorsFramed:1,doorId:null,
  score:50,occluded:0,motion:40,
  subjectReadable:true,
  editorialId:t<.8?'travel:rook':'fight:22',
  editorialPriority:t<.8?2.6:6,
  requiredPoints:t<.8?[pt(130,90)]:
    [pt(380,90),pt(430,90)],
  framePoints:t<.8?[pt(130,90)]:
    [pt(380,90),pt(430,90)]
 });
 const rail=new ReplayDirectorStoryboard(4,raw,{
  step:.8,rooms:[room],walls:[],aspect:.8,baseSpan:1100
 });
 assert.ok(!rail.sample(.8).cameraDecision.startsWith('cut:'),
  'a new contact candidate must not interrupt the shot immediately');
 assert.equal(rail.sample(3.2).cameraDecision,
  'cut:action-out-of-frame');
 assert.equal(rail.sample(1.6).roomId,'r');
});
test('real camera projection distinguishes zoom fit and impossible wide two-shot',()=>{
 const anchor=pt(55,80),focus=pt(145,80);
 const points=[pt(90,80),pt(200,80)];
 const zoom=directorOrthoFittingZoom(anchor,focus,points,.75,1100,
  .75,.72,8,.8);
 assert.ok(zoom>=.65&&zoom<=8);
 assert.equal(directorPerspectiveCovers(anchor,focus,
  [pt(95,80),pt(10,80)],.75,116),false);
});

test('future first-entry evidence chooses the lead breacher without prematurely cutting',()=>{
 const actors=[actor('rook',88,62,19),actor('moss',81,57,26)];
 const a=actors[0],b=actors[1];
 const makeIntent=(x,role,distance)=>({
  actorId:x.id,position:x.p,heading:0,
  route:[x.p,pt(110,60)],direction:pt(1,0),
  destination:pt(110,60),door:{
   id:'D',mid:pt(100,60),a:door.a,b:door.b,
   normal:pt(-1,0),approachSide:1,distance
  },kind:role,speed:x.velocity,
  watchDirection:null,plannedAttention:null,
  activeRevision:1
 });
 const entry={id:'D:rook:9',doorId:'D',actorId:'rook',t:9,
  fromSide:1,toSide:-1,first:true,sequenceId:'D:1:9'};
 const context={...evidence,entry,
  intents:[makeIntent(a,'approach',25),
   makeIntent(b,'breach',13)]};
 const before=selectDirectorEditorialShot(7.3,actors,context);
 assert.equal(before.kind,'door');
 assert.equal(before.primaryActorId,'rook',
  'recorded first entrant should lead the setup, not the closer kicker');
 assert.equal(before.firstEntry,false,
  'knowing the future lead is never permission for an early room cut');
 const crossing=selectDirectorEditorialShot(9.08,actors,context);
 assert.equal(crossing.kind,'entry');
 assert.equal(crossing.firstEntry,true);
});
test('pre-roll firefight does not steal a door setup 2 seconds early',()=>{
 const actors=[actor('rook',84,60,25),actor('moss',72,70,10)];
 const intent={actorId:'rook',position:actors[0].p,heading:0,
  route:[actors[0].p,pt(112,60)],direction:pt(1,0),
  destination:pt(112,60),door:{
   id:'D',a:door.a,b:door.b,mid:pt(100,60),
   normal:pt(-1,0),approachSide:1,distance:16
  },kind:'approach',speed:25,
  watchDirection:null,plannedAttention:null,activeRevision:1};
 const beat={id:'fight:120',kind:'fight',first:10,last:10.4,
  start:7.4,end:11.5,actorId:'rook',shooterId:'rook',
  targetId:'red-1',shooter:actors[0].p,target:pt(220,60),
  doorId:null};
 const far=selectDirectorEditorialShot(8,actors,{
  ...evidence,intents:[intent],beat});
 assert.equal(far.kind,'door',
  'door setup remains the shot until contact genuinely approaches');
 assert.equal(far.target,null,
  'future undisclosed enemy is never a framing anchor');
 const close=selectDirectorEditorialShot(9.3,actors,{
  ...evidence,intents:[intent],beat});
 assert.equal(close.kind,'engage');
 assert.equal(close.target,null,
  'anticipated friendly action must not disclose target');
 const actual=selectDirectorEditorialShot(10.1,actors,{
  ...evidence,intents:[intent],beat,actionPair:{
   shooter:actors[0].p,target:pt(220,60)
  }});
 assert.equal(actual.kind,'engage');
 assert.equal(actual.required.length,2);
});
