import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directorLineBlocked,directorSubjectVisibility,
  directorCameraLegal,physicalDirectorView}
  from '../src/breach-replay-director-physical.ts';
import {directorOrthoFittingZoom,directorReplaySafeFrame,
  directorForegroundOccupancy}
  from '../src/breach-replay-director-projection.ts';
import {ReplayDirectorStoryboard}
  from '../src/breach-replay-director-storyboard.ts';

const p=(x,y)=>({x,y});
const swung={
 a:p(80,80),b:p(120,80),open:true,openFraction:1,
 hinge:'a',swing:-1,kind:'hinged',style:'wood'
};
const empty={rooms:[],walls:[],cover:[],doors:[]};

test('R9.1 open opaque leaf blocks rays at its rotated position',()=>{
 const scene={...empty,doors:[swung]};
 assert.equal(directorLineBlocked(p(60,100),p(108,100),scene),true,
  'the leaf, not its original closed threshold, occludes a filming ray');
 assert.equal(directorLineBlocked(p(65,69),p(110,69),scene),false,
  'a ray through open air is clear');
 const behind=directorSubjectVisibility(p(60,99),p(109,99),scene);
 const clear=directorSubjectVisibility(p(140,133),p(109,99),scene);
 assert.ok(behind.fraction<clear.fraction,
  'a wall of opaque door should conceal body samples');
 assert.ok(clear.readable);
 assert.equal(directorCameraLegal(p(80,104),null,scene),false,
  'a camera cannot physically occupy the swept-open door');
});

test('R9.1 glazed leaf stays optically transparent while still solid',()=>{
 const scene={...empty,doors:[{...swung,style:'glazed'}]};
 assert.equal(directorLineBlocked(p(60,100),p(108,100),scene),false);
 assert.equal(directorCameraLegal(p(80,104),null,scene),false);
});

test('R9.1 projection measures foreground surfaces and asymmetric safe stage',()=>{
 const safe=directorReplaySafeFrame(390,844,98,195);
 assert.ok(safe.bottom>-.65&&safe.bottom<-.4);
 assert.ok(safe.top>.6&&safe.top<.84);
 const actor=p(120,70),camera=p(20,70),focus=p(125,70);
 const original=directorOrthoFittingZoom(camera,focus,[actor],
  .46,1100,.79,.76,10,.83);
 const fitted=directorOrthoFittingZoom(camera,focus,[actor],
  .46,1100,.79,.76,10,.83,
  {left:-.79,right:.79,top:.60,bottom:-.38});
 assert.ok(fitted<=original,
  'the lower replay controls reduce available portrait height');
 const mask=directorForegroundOccupancy(camera,focus,actor,
  [{a:p(65,30),b:p(65,110),height:44,kind:'door'}],
  'ortho',.46,1100,4,108,safe);
 for(const value of Object.values(mask))
   assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
 assert.ok(mask.door>0,'the occupied leaf covers some image pixels');
});

test('R9.1 formerly valid quiet camera cuts when current actor leaves view',()=>{
 const room={id:'lab',x:0,y:0,w:550,h:200};
 const position=t=>t<.5?p(105,100):p(386,100);
 const rail=new ReplayDirectorStoryboard(5,t=>{
  const current=position(t);
  return {
   focus:t<.5?p(124,100):p(398,100),
   cameraAnchor:t<.5?p(55,100):p(331,100),
   roomId:'lab',fov:105,zoom:7,yaw:0,pitch:.4,
   actorsFramed:1,shotType:'travel',kind:'squad',
   subjects:['rook'],doorId:null,score:50,occluded:0,
   motion:0,operatorPoint:current,requiredPoints:[current],
   editorialId:'follow:rook',editorialKind:'follow',
   editorialPriority:2.6,actionAxis:p(1,0),
   subjectReadable:true,subjectVisibility:1,
   compositionQuality:{primaryReadable:true,score:95}
  };
 },{step:.5,rooms:[room],aspect:.62,baseSpan:1100});
 const before=rail.sample(0);
 const early=rail.sample(.5);
 assert.ok(!early.cameraDecision.startsWith('cut:'),
  'brief lost subject must not trigger hyperactive immediate cuts');
 const recovered=rail.sample(3);
 assert.ok(recovered.cameraAnchor.x>280,
  'after confirmed sustained loss camera restores visible subject');
 assert.equal(recovered.cameraDecision,'cut:restore-visible-subject');
 assert.equal(rail.sample(3).cameraAnchor.x,recovered.cameraAnchor.x,
  'random seeks remain deterministic');
 assert.equal(before.cameraAnchor.x,55);
});

test('R9.1 a camera with readable actors is not replaced by a prettier empty angle',()=>{
 const room={id:'lab',x:0,y:0,w:360,h:180};
 const rail=new ReplayDirectorStoryboard(2,t=>({
   focus:t<.5?p(115,85):p(350,85),
   cameraAnchor:t<.5?p(65,85):p(298,85),
   roomId:'lab',fov:108,zoom:2.3,yaw:0,pitch:.4,
   actorsFramed:1,shotType:'travel',kind:'squad',
   subjects:['rook'],doorId:null,score:55,occluded:0,
   motion:0,operatorPoint:p(115,85),requiredPoints:[p(115,85)],
   editorialId:'follow:rook',editorialKind:'follow',
   editorialPriority:2.6,
   subjectReadable:t<.5,
   compositionQuality:{primaryReadable:t<.5,score:96}
 }),{step:.5,rooms:[room],aspect:.8,baseSpan:1100});
 assert.equal(rail.sample(.5).cameraDecision,'hold:visible-over-obstructed');
});

test('R9.1 replay only hides redundant top header controls',()=>{
 const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');
 assert.match(css,/body\.replaying \.top \.top-controls\s*\{/);
 assert.match(css,/visibility:hidden;pointer-events:none/);
});
