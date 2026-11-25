import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentAttachment,coverAttachment,wallMarkPose,doorMarkLocalPose,coverMarkLocalPose,windowMarkPose,isGroundImpactMark} from '../src/breach-impact-surface.ts';
import {strikeSurface} from '../src/breach-ballistic-resolution.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
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
 assert.equal(isGroundImpactMark({surface:'dust',height:1,shotId:3}),false);
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

test('target attachment projects a confirmed hit to the authored panel and follows owner identity',()=>{
 const box={id:'target',fixture:'target-plate',x:0,y:0,w:20,h:30,topHeight:45};
 const ref=coverAttachment(1,box,{x:0,y:30},{x:0,y:-30},.25,30);
 const pose=coverMarkLocalPose(ref,box,box);
 assert.equal(pose.ny,0);assert.equal(pose.nz,1);assert.ok(pose.z>2.4&&pose.z<3);
 assert.deepEqual(coverMarkLocalPose(ref,box,{...box,x:50,y:40}),pose);
 assert.equal(coverMarkLocalPose(ref,box,{...box,destroyed:true}),null);
 assert.equal(coverMarkLocalPose(ref,box,{...box,id:'other'}),null);
 assert.equal(coverMarkLocalPose({...ref,localX:9,localY:44},box,box),null,'empty space beside head');
 const rotated={...box,w:30,h:20,orientation:1};
 const rot=coverAttachment(1,rotated,{x:30,y:0},{x:-30,y:0},.25,30);
 assert.equal(coverMarkLocalPose(rot,rotated,rotated).nz,1);
});
test('solid prop sides are bounded by authored artwork and intact owner',()=>{
 const box={id:'post',fixture:'support-column',x:0,y:0,w:20,h:20,topHeight:40};
 const ref=coverAttachment(0,box,{x:-20,y:0},{x:20,y:0},.25,20);
 const p=coverMarkLocalPose(ref,box,box);
 assert.equal(p.nx,-1);assert.equal(p.x,-10.18);assert.equal(p.y,20);
 assert.equal(coverMarkLocalPose({...ref,localY:1},box,box),null);
 assert.equal(coverMarkLocalPose(ref,{...box,fixture:'chair'},{...box,fixture:'chair'}),null);
});
test('intact picture glass can own a mark, broken or open glass cannot',()=>{
 const pane={id:'w',x:0,y:0,width:40,vertical:false,style:'picture',sillHeight:10,headHeight:40,open:false,shattered:false};
 const ref=segmentAttachment('window',0,'w',{a:{x:-20,y:0},b:{x:20,y:0}},{x:0,y:10},{x:0,y:-10},.5,25);
 assert.equal(windowMarkPose(ref,pane).z,.66);
 assert.equal(windowMarkPose(ref,{...pane,shattered:true}),null);
 assert.equal(windowMarkPose(ref,{...pane,open:true}),null);
});

test('replay snapshots preserve immutable surface ownership through seek and reapply',()=>{
 const s=newSession();
 const ref=segmentAttachment('wall',0,undefined,wall,{x:20,y:-10},{x:20,y:10},.5,25);
 s.impactMarks=[{id:7,shotId:3,p:{x:20,y:0},height:25,age:0,surface:'stone',surfaceRef:ref}];
 const frame=snapshot(s);
 s.impactMarks[0].surfaceRef.localY=42;
 assert.equal(frame.impactMarks[0].surfaceRef.localY,25);
 applyReplayFrame(s,frame);
 assert.equal(s.impactMarks[0].surfaceRef.localY,25);
 s.impactMarks[0].surfaceRef.localY=9;
 assert.equal(frame.impactMarks[0].surfaceRef.localY,25);
});
