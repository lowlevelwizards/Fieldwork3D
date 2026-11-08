import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directorCompositionQuality,directorOrthoFittingZoom}
  from '../src/breach-replay-director-projection.ts';
import {physicalDirectorView,directorCameraLegal,directorLineBlocked}
  from '../src/breach-replay-director-physical.ts';
import {composeReplayDirectorShot}
  from '../src/breach-replay-director-shots.ts';

const p=(x,y)=>({x,y});
const room={id:'warehouse',x:0,y:0,w:410,h:330};
const safe={left:-.79,right:.79,top:.70,bottom:-.43};
const scene={rooms:[room],walls:[],doors:[],cover:[]};
const shooter=p(124,160),target=p(235,160),teammate=p(142,198);
const quality=(camera,focus,primary,enemy,zoom=3,others=[])=>
 directorCompositionQuality(camera,focus,primary,enemy,p(1,0),
   'engage','ortho',.46,1100,zoom,108,.79,.7,safe,others);
const request=(targetPoint=target)=>({
 operator:shooter,focus:p((shooter.x+targetPoint.x)/2,
  (shooter.y+targetPoint.y)/2),
 subjectPoints:[shooter,teammate],
 requiredPoints:[shooter,targetPoint],target:targetPoint,
 preferredYaw:-Math.PI/2,followDirection:p(1,0),
 targetWeight:270,
 composition:{treatment:'engage',baseSpan:1100,
  usableWidth:.79,usableHeight:.7,safeFrame:safe}
});
test('R9.3 centered-backpack framing FAILS even though target is in lens',()=>{
 const behind=quality(p(32,160),p(180,160),shooter,target);
 assert.equal(behind.targetReadable,false);
 assert.ok(behind.targetHorizontalGap<.04);
 assert.ok(Math.abs(behind.primaryScreenX)<.1);
});
test('R9.3 true lateral angle separates complete head/torso silhouettes',()=>{
 const side=quality(p(77,84),p(180,160),shooter,target);
 assert.equal(side.targetReadable,true,
  'lateral composition should create a real empty horizontal interval');
 assert.ok(side.targetHorizontalGap>.05);
 assert.ok(Math.abs(side.primaryScreenX)>.15);
});
test('R9.3 physical camera selects a readable, legal offset contact two-shot',()=>{
 const view=physicalDirectorView(request(),scene,.46);
 assert.ok(directorCameraLegal(view.cameraAnchor,room,scene));
 assert.equal(directorLineBlocked(view.cameraAnchor,target,scene),false);
 assert.equal(view.targetVisible,true);
 assert.equal(view.compositionQuality?.targetReadable,true);
 assert.ok(view.compositionQuality.targetHorizontalGap>.04,
  'two silhouettes need actual daylight between them');
 const a=p(view.cameraAnchor.x-shooter.x,view.cameraAnchor.y-shooter.y);
 assert.ok(Math.abs(a.y)>24,
  'camera cannot remain directly behind shooter on action axis');
});
test('R9.3 candidate is revalidated at the exact finished composition and zoom',()=>{
 const plan={id:'contact:rook',kind:'engage',priority:6,
  primaryActorId:'rook',secondaryActorIds:['moss'],target,door:null,
  interest:null,doorId:null,actionDirection:p(1,0),
  required:[shooter,target],optional:[],firstEntry:false,reason:'test'};
 const actors=[
  {id:'rook',side:'blue',health:4,p:shooter,velocity:0,heading:0},
  {id:'moss',side:'blue',health:4,p:teammate,velocity:0,heading:0},
  {id:'guard',side:'red',health:4,p:target,velocity:0,heading:0}
 ];
 const result=composeReplayDirectorShot(1,actors,[room],[],.46,
  0,1100,{intents:[],upcoming:null,editorial:plan,
  safeFrame:safe,usableWidth:.79,usableHeight:.7,
  maxZoom:14,cover:[],doors:[]});
 assert.ok(result);
 assert.equal(result.compositionQuality?.targetReadable,true,
  'the actual returned lens, not a draft candidate, is a clear two-shot');
 assert.ok(Math.abs(result.compositionQuality.primaryScreenX)>.12);
 const verified=quality(result.cameraAnchor,result.focus,
  shooter,target,result.zoom,[shooter,teammate]);
 assert.equal(verified.targetReadable,true);
 assert.ok(Math.abs(result.cameraAnchor.y-shooter.y)>20);
 assert.deepEqual(result.contactTargetPoint,target);
});
test('R9.3 camera staging honors inaccessible opposite rooms, not X-ray',()=>{
 // A physical dividing wall also divides camera-occupied rooms.
 // Declaring both sides as one room would permit a lens to teleport to
 // the target side, which is not a realistic generated site footprint.
 const left={id:'left',x:0,y:0,w:180,h:330};
 const right={id:'right',x:180,y:0,w:230,h:330};
 const split={rooms:[left,right],walls:[{a:p(180,0),b:p(180,330)}],
  cover:[],doors:[]};
 const shot=physicalDirectorView(request(),split,.46);
 assert.equal(shot.roomId,'left');
 assert.equal(shot.targetVisible,false);
 assert.equal(directorCameraLegal(shot.cameraAnchor,left,split),true);
});
test('R9.3 keep recorded target identity separate from unknown impact points',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const story=readFileSync(new URL('../src/breach-replay-director-storyboard.ts',
   import.meta.url),'utf8');
 assert.ok(main.includes('!!opposite&&frame.actors.some'));
 assert.ok(story.includes('raw.contactTargetPoint'));
 assert.ok(story.includes('hold:protect-contact-pair'));
});
