import test from 'node:test';
import assert from 'node:assert/strict';
import {recordDoorFracture} from '../src/breach-fracture-record.ts';
import {damageCover} from '../src/breach-reactive-cover.ts';
import {doorDebrisSource,coverDebrisSource,fractureDebrisPose,debrisPoseContained} from '../src/rendering/breach-fracture-debris.ts';
import {windowShardPose,windowShardPoseInto,WINDOW_SHARD_DURATION,WINDOW_SHARDS_PER_PANE} from '../src/rendering/window-shatter-presentation.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
const scratch=()=>({x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1,heightScale:1});
test('door fracture captures actual opened leaf once and keeps debris fixed after movement',()=>{
 const d={id:'d',a:{x:100,y:100},b:{x:145,y:100},style:'glazed',open:true,openFraction:.5,hinge:'a',glassShattered:true};
 recordDoorFracture(d,2);const source=doorDebrisSource(d);assert.ok(source);assert.notEqual(source.y,100);
 const part=scratch();assert.ok(fractureDebrisPose(source,2.2,0,false,part));
 const before={...part};d.openFraction=0;recordDoorFracture(d,3);
 assert.deepEqual(doorDebrisSource(d),source);
 assert.ok(fractureDebrisPose(doorDebrisSource(d),2.2,0,false,part));assert.deepEqual(part,before);
 assert.equal(fractureDebrisPose(source,1,0,false,part),false);
 assert.ok(fractureDebrisPose(source,4,0,true,part));const settled={...part};
 assert.ok(fractureDebrisPose(source,120,0,true,part));assert.deepEqual(part,settled);
 assert.equal(doorDebrisSource({...d,glassShattered:false}),null);
 assert.equal(doorDebrisSource({...d,glassBreakX:undefined}),null);
});
test('cover collapse captures pre-shrink footprint, material and historical time without changing cover outcome',()=>{
 const box={id:'crate',fixture:'crate',x:200,y:220,w:30,h:24,topHeight:20};
 const legacy={...box};assert.equal(damageCover(box,10,1),damageCover(legacy,10));
 assert.equal(box.w,legacy.w);assert.equal(box.h,legacy.h);
 const source=coverDebrisSource(box,0);assert.ok(source);assert.equal(source.width,30);assert.equal(source.headHeight,20);assert.equal(source.kind,'wood');
 const p=scratch();assert.ok(fractureDebrisPose(source,1.2,1,false,p));assert.ok(p.scale>1.5);
 assert.ok(fractureDebrisPose(source,3,1,true,p));
 assert.equal(coverDebrisSource(legacy,0),null);
 assert.equal(coverDebrisSource({...box,fixture:'glass-barrier'},0),null);
});
test('fracture timestamps and origin survive rewind without leaking future breakage',()=>{
 const s=newSession();const d=s.doors[0];d.style='glazed';d.glassShattered=false;
 const early=snapshot(s);d.glassShattered=true;recordDoorFracture(d,2);s.objectRevision++;const late=snapshot(s);
 applyReplayFrame(s,early);assert.equal(doorDebrisSource(s.doors[0]),null);
 applyReplayFrame(s,late);assert.ok(doorDebrisSource(s.doors[0]));
});

test('burst scratch path preserves poses, rejects invalid samples and is safe across rewind',()=>{
 const p=scratch();
 for(const vertical of [false,true]){
  const pane={x:100,y:200,width:42,vertical,sillHeight:12,headHeight:35,shatteredAt:2};
  for(const time of [2,2.4,2.9,2.1])for(let i=0;i<WINDOW_SHARDS_PER_PANE;i++){
   assert.ok(windowShardPoseInto(pane,time,i,p));
   const {heightScale,...pose}=p;
   assert.deepEqual(pose,windowShardPose(pane,time,i));
   const spread=(i-2.5)/5,t=time-2;
   const lateral=spread*34*.72+spread*t*19;
   const outward=(i%2?1:-1)*t*(8+i*1.6);
   assert.equal(p.x,100+(vertical?outward:lateral));
   assert.equal(p.z,200+(vertical?lateral:outward));
  }
  const before={...p};
  for(const [time,i] of [[1,0],[2+WINDOW_SHARD_DURATION+0.01,0],[NaN,0],[2,0.5],[2,NaN],[2,WINDOW_SHARDS_PER_PANE]]){
   assert.equal(windowShardPoseInto(pane,time,i,p),false);
   assert.deepEqual(p,before);
  }
 }
});

// Use the same broadphase implementation as the session world, with an
// intentionally tiny authored fixture so aperture and jamb cases are exact.
import {TacticalGeometryIndex,pointBounds} from '../src/breach-spatial-index.ts';
function debrisWorld(walls){
 const index=new TacticalGeometryIndex(walls,[]);
 return {bounds:{minX:0,minY:0,maxX:200,maxY:200},
  someWallNearPoint:(p,r,matches)=>index.someWall(pointBounds(p,r),matches)};
}
const wall=(x1,y1,x2,y2)=>({a:{x:x1,y:y1},b:{x:x2,y:y2}});
test('debris containment rejects a full wall crossing, jamb overlap and world edge without moving a pose',()=>{
 const world=debrisWorld([wall(100,20,100,180)]);
 const source={x:80,y:100};
 const p={...scratch(),x:120,z:100,scale:1.5};
 const before={...p};
 assert.equal(debrisPoseContained(world,source,p),false);
 assert.deepEqual(p,before);
 assert.equal(debrisPoseContained(world,source,{...p,x:90}),true);
 assert.equal(debrisPoseContained(world,source,{...p,x:94}),false);
 assert.equal(debrisPoseContained(world,source,{...p,x:90},1.8),false);
 assert.equal(debrisPoseContained(world,source,{...p,x:1}),false);
 assert.equal(debrisPoseContained(world,source,{...p,x:NaN}),false);
});
test('genuine apertures keep both sides of glass debris; exact wall endpoints still block',()=>{
 const world=debrisWorld([wall(100,20,100,80),wall(100,120,100,180)]);
 const p={...scratch(),x:116,z:100,scale:1.5};
 assert.equal(debrisPoseContained(world,{x:84,y:100},p),true);
 assert.equal(debrisPoseContained(world,{x:100,y:100},p),true);
 assert.equal(debrisPoseContained(world,{x:100,y:100},{...p,x:84}),true);
 assert.equal(debrisPoseContained(world,{x:84,y:80},{...p,z:80}),false);
 assert.equal(debrisPoseContained(world,{x:84,y:85},{...p,x:100,z:85}),false);
 // No dependence on previous world, frame order or a mutable global wall list.
 assert.equal(debrisPoseContained(debrisWorld([wall(100,20,100,180)]),{x:84,y:100},p),false);
 assert.equal(debrisPoseContained(world,{x:84,y:100},p),true);
});
