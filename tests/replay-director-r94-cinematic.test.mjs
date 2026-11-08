import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groundBloodFootprintOccluded} from '../src/breach-ground-geometry.ts';
import {directorRecentAction} from '../src/breach-replay-director-action.ts';
import {directorProjectedActionVisibility} from '../src/breach-replay-director-projection.ts';
import {physicalDirectorView,directorCameraLegal}
 from '../src/breach-replay-director-physical.ts';
import {selectDirectorEditorialShot}
 from '../src/breach-replay-director-edit.ts';
const p=(x,y)=>({x,y});
const scene={rooms:[{id:'warehouse',x:0,y:0,w:410,h:330}],
 walls:[],doors:[],cover:[]};
const safe={left:-.79,right:.79,top:.7,bottom:-.43};

test('R9.4A no screen-space red ovals can paint over 3D walls or actors',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const projected=main.slice(main.indexOf('function renderProjectedPlans(){'),
   main.indexOf('function renderReplayPersonalGround(){'));
 assert.ok(!projected.includes("draw.ellipse(ground.x,ground.y,11,6"));
 assert.ok(!projected.includes("draw.ellipse(pawn.x,pawn.y+11"));
 const renderer=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.ok(renderer.includes('groundBloodFootprintOccluded'));
 assert.ok(renderer.includes('orthoBlood'));
 assert.ok(renderer.includes('this.impactDecalMatrix.rotation.set(-Math.PI/2,0,0)'));
 assert.ok(renderer.includes('depthTest:true,depthWrite:false'));
});
test('R9.4A blood footprint respects walls in BOTH optical lens models',()=>{
 const mark=p(75,0),camera={x:0,y:75,z:0};
 const dir={x:-.8,y:.6,z:0};
 const wall=[{a:p(45,-80),b:p(45,80)}];
 assert.equal(groundBloodFootprintOccluded(mark,4,camera,dir,false,
   wall,[]),true);
 assert.equal(groundBloodFootprintOccluded(mark,4,camera,dir,true,
   wall,[]),true);
 assert.equal(groundBloodFootprintOccluded(mark,4,camera,dir,false,
   [],[]),false);
 assert.equal(groundBloodFootprintOccluded(mark,4,camera,dir,true,
   [],[]),false);
 assert.equal(groundBloodFootprintOccluded(mark,4,camera,dir,true,
   [],[p(50,0)]),true,
   'an intervening operator must hide the floor stain');
});
test('R9.4C recorded combat only awards recent, already fired shots',()=>{
 const shot=(t,id)=>({recordedAt:t,start:p(id*10,10),
   end:p(id*10+50,10),hit:id===2,shooterId:'rook',targetId:'guard'});
 const shots=[shot(8,1),shot(9.2,2),shot(9.7,3),
   shot(10.05,4)];
 const recent=directorRecentAction(shots,10,()=>true);
 assert.deepEqual(recent.map(x=>x.start.x),[30]);
 assert.equal(recent[0].hit,false);
 assert.equal(directorRecentAction(shots,10,s=>s.recordedAt<9.5).length,0);
 assert.equal(directorRecentAction(shots,10,()=>true,1).length,1);
});
test('R9.4C projected muzzle/impact framing remains a BONUS, not new source truth',()=>{
 const action=[{start:p(124,160),end:p(235,160),
   hit:true,shooterId:'rook',targetId:'guard'}];
 const score=directorProjectedActionVisibility(p(77,84),p(180,160),
  action,'ortho',.46,1100,3,108,safe);
 assert.ok(score>.5&&score<=1,'an actual unobstructed line can be framed');
 assert.equal(directorProjectedActionVisibility(p(77,84),p(180,160),
  [],'ortho',.46,1100,3,108,safe),0);
});
test('R9.4B legal contact candidate retains readable target and side choice',()=>{
 const req={
   operator:p(124,160),focus:p(180,160),
   subjectPoints:[p(124,160),p(142,198)],
   requiredPoints:[p(124,160),p(235,160)],
   target:p(235,160),preferredYaw:-Math.PI/2,
   followDirection:p(1,0),targetWeight:270,
   composition:{treatment:'engage',baseSpan:1100,
     usableWidth:.79,usableHeight:.7,safeFrame:safe}
 };
 for(const walls of [
   [{a:p(50,90),b:p(310,90)}],
   [{a:p(50,240),b:p(310,240)}]
 ]){
   const inRoom={...scene,walls};
   const shot=physicalDirectorView(req,inRoom,.46);
   assert.ok(directorCameraLegal(shot.cameraAnchor,scene.rooms[0],inRoom));
   assert.equal(shot.compositionQuality?.targetReadable,true,
     'available side should show the target with real silhouette separation');
 }
});
test('R9.4E current LOOK/WATCH leads the framing while travel stays authored',()=>{
 const actor={id:'rook',side:'blue',health:4,p:p(120,160),
   heading:0,velocity:20};
 const intent={actorId:'rook',position:actor.p,heading:0,
   route:[p(120,160),p(180,160)],direction:p(1,0),
   destination:p(180,160),door:null,kind:'travel',
   speed:20,watchDirection:p(0,1),plannedAttention:null,
   activeRevision:null};
 const shot=selectDirectorEditorialShot(4,[actor],{
   intents:[intent],upcoming:null});
 assert.equal(shot.kind,'follow');
 assert.ok(shot.actionDirection.y>shot.actionDirection.x,
   'executed WATCH has more attention weight than generic movement');
 assert.ok(shot.interest.y>actor.p.y);
 assert.ok(shot.actionDirection.x>.1,
   'travel direction is still represented for composed lead');
});
test('R9.4 shot candidates are not extra cuts or automatic bodycam switching',()=>{
 const story=readFileSync(
   new URL('../src/breach-replay-director-storyboard.ts',import.meta.url),'utf8');
 const action=readFileSync(
   new URL('../src/breach-replay-director-action.ts',import.meta.url),'utf8');
 assert.match(story,/residence>=3/);
 assert.ok(!action.includes('cameraDecision'));
 assert.ok(!action.includes('bodycam'));
});
