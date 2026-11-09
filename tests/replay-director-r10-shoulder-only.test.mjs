import test from 'node:test';
import assert from 'node:assert/strict';
import {physicalDirectorCandidates}
  from '../src/breach-replay-director-physical.ts';
import {composeReplayDirectorShots}
  from '../src/breach-replay-director-shots.ts';
const pt=(x,y)=>({x,y});
const room={id:'room',x:0,y:0,w:400,h:320};
const scene={rooms:[room],walls:[],doors:[],cover:[]};
const hero={id:'rook',side:'blue',health:4,p:pt(140,150),
  velocity:12,heading:0};
const context={intents:[{actorId:'rook',position:hero.p,
  heading:0,direction:pt(1,0),speed:12,kind:'travel',
  route:[hero.p,pt(260,150)],watchDirection:null,
  plannedAttention:null,destination:pt(260,150),
  door:null,activeRevision:null}],upcoming:null,beat:null,
  contact:null,discovery:null,entry:null,doors:[],cover:[]};
const request={
  operator:hero.p,focus:pt(205,150),subjectPoints:[hero.p],
  requiredPoints:[hero.p],target:null,preferredYaw:0,
  followDirection:pt(1,0),motionSpeed:12,
  composition:{treatment:'follow',baseSpan:1100,
    usableWidth:.78,usableHeight:.76}
};
function assertShoulder(anchor){
  const back=hero.p.x-anchor.x;
  const lateral=Math.abs(anchor.y-hero.p.y);
  assert.ok(back>=18,'camera must stay behind the action');
  assert.ok(lateral>=32,'camera must be meaningfully offset');
  assert.ok(lateral>=back*.42,'no centered-backpack rig');
}
test('R10: approved physical camera views are far-offset rear shoulders',()=>{
  const candidates=physicalDirectorCandidates(request,scene,.6,6);
  assert.ok(candidates.length>0);
  for(const view of candidates)assertShoulder(view.cameraAnchor);
});
test('R10: composed shots use only the approved rig',()=>{
  const shots=composeReplayDirectorShots(1,[hero],[room],[],.6,
    0,1100,context);
  assert.ok(shots.length>0);
  for(const shot of shots)assertShoulder(shot.cameraAnchor);
});
test('R10: no legal shoulder returns no bid, never an arbitrary orbit',()=>{
  const blocked={...scene,rooms:[{...room,x:120,y:125,w:45,h:45}]};
  const views=physicalDirectorCandidates(request,blocked,.6,4);
  assert.deepEqual(views,[]);
});
