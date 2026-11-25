import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentAttachment,coverAttachment,wallMarkPose,doorMarkLocalPose,isGroundImpactMark} from '../src/breach-impact-surface.ts';
import {strikeSurface} from '../src/breach-ballistic-resolution.ts';
import {newSession} from '../src/breach-game.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
import {retainImpactMark} from '../src/breach-impact-evidence-buffer.ts';
import {ImpactMarkSlotCache,MARK_MATRIX_DIRTY} from '../src/rendering/breach-impact-mark-cache.ts';
const wall={a:{x:0,y:0},b:{x:100,y:0}};
test('wall decals sit on the struck face at the actual elevation',()=>{
 for(const sign of [-1,1]){
  const r=segmentAttachment('wall',0,undefined,wall,{x:40,y:sign*20},{x:40,y:-sign*20},.5,27);
  const p=wallMarkPose(r,wall);
  assert.equal(p.y,27);assert.equal(p.x,40);assert.equal(p.nz,sign);assert.equal(p.z,sign*4.65);assert.equal(p.ny,0);
  assert.equal(wallMarkPose({...r,localY:60},wall),null);
  assert.equal(wallMarkPose({...r,along:0},wall),null);
 }
});
test('hinge A and hinge B preserve local door attachment when leaf opens',()=>{
 for(const hinge of ['a','b']){
  const d={id:'d',a:{x:0,y:0},b:{x:40,y:0},hinge,swing:-1,open:false,openedAt:0,style:'wood'};
  const leaf=doorLeafSegment(d);
  const r=segmentAttachment('door',0,'d',leaf,{x:20,y:-10},{x:20,y:10},.5,25,d);
  const local=doorMarkLocalPose(r,d);
  assert.equal(local.x,hinge==='a'?20:-20);assert.equal(local.y,25);assert.equal(local.nz,-1);
  assert.deepEqual(doorMarkLocalPose(r,{...d,open:true,openFraction:1}),local);
  assert.equal(doorMarkLocalPose(r,{...d,style:'glazed'}),null);
 }
});
test('cover records actual side/top contact but does not invent interior face',()=>{
 const box={x:0,y:0,w:20,h:20,topHeight:15};
 const side=coverAttachment(1,box,{x:-20,y:0},{x:20,y:0},.25,8);
 assert.equal(side.nx,-1);assert.equal(side.localX,-10);
 assert.equal(coverAttachment(1,box,{x:-20,y:0},{x:20,y:0},.5,15).ny,1);
 assert.equal(coverAttachment(1,box,{x:-20,y:0},{x:20,y:0},.5,8),undefined);
});
test('authoritative ray metadata is opt-in and does not change hit outcome',()=>{
 const s=newSession();const w=sessionWorldGeometry(s).walls[0];
 const dx=w.b.x-w.a.x,dz=w.b.y-w.a.y,len=Math.hypot(dx,dz),x=(w.a.x+w.b.x)/2,y=(w.a.y+w.b.y)/2;
 const from={x:x-dz/len*12,y:y+dx/len*12},to={x:x+dz/len*12,y:y-dx/len*12};
 const plain=strikeSurface(from,to,s,20,32,0),owned=strikeSurface(from,to,s,20,32,0,true);
 for(const k of ['end','surface','penetrated','remaining','paneHits','glassDoorHits','coverHits'])assert.deepEqual(owned[k],plain[k]);
 assert.ok(owned.materialHits.some(h=>h.surfaceRef?.kind==='wall'&&Math.abs(h.height-26)<1e-6));
});
test('unowned raised marks fail closed; ground blood remains ground-aligned',()=>{
 assert.equal(isGroundImpactMark({surface:'metal',height:14}),false);
 assert.equal(isGroundImpactMark({surface:'stone',height:20}),false);
 assert.equal(isGroundImpactMark({surface:'dust',height:1}),true);
 assert.equal(isGroundImpactMark({surface:'blood',height:25}),true);
});
test('same committed hit is not duplicated; orientation invalidates cached transform',()=>{
 const ref=segmentAttachment('wall',0,undefined,wall,{x:20,y:-10},{x:20,y:10},.5,25);
 const s={impactMarks:[]},m={id:1,shotId:3,p:{x:20,y:0},surface:'stone',height:25,age:0,surfaceRef:ref};
 retainImpactMark(s,m);retainImpactMark(s,{...m,id:2});assert.equal(s.impactMarks.length,1);
 retainImpactMark(s,{...m,id:3,shotId:4});assert.equal(s.impactMarks.length,2);
 const c=new ImpactMarkSlotCache(1);c.update(0,1,2,3,4,1,1,-1,0,0,1);
 assert.equal(c.update(0,1,2,3,4,1,1,-1,0,0,-1),MARK_MATRIX_DIRTY);
});
