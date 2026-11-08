import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  propertySurfaceCenterHeight,PROPERTY_SURFACE_THICKNESS,
  exteriorZoneRenderLift
} from '../src/rendering/property-surface-elevation.ts';
import {windowShardPose,WINDOW_SHARD_DURATION}
  from '../src/rendering/window-shatter-presentation.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

test('overlapping road finishes have ordered, non-coplanar top surfaces',()=>{
 const a=propertySurfaceCenterHeight('path');
 const b=propertySurfaceCenterHeight('sidewalk');
 const c=propertySurfaceCenterHeight('curb-edge');
 const d=propertySurfaceCenterHeight('curb-ramp');
 assert.ok(a<b&&b<c&&c<d);
 assert.ok(b-a>PROPERTY_SURFACE_THICKNESS);
 assert.ok(c-b>PROPERTY_SURFACE_THICKNESS);
 assert.ok(d-c>PROPERTY_SURFACE_THICKNESS);
 assert.ok(d+PROPERTY_SURFACE_THICKNESS/2<0,
  'render-only marks stay below all walkable interior floors');
 assert.ok(exteriorZoneRenderLift('arrival-forecourt')>
  exteriorZoneRenderLift('side-passage'));
 assert.ok(exteriorZoneRenderLift('side-passage')>
  exteriorZoneRenderLift('rear-property'));
});

test('glass fragments are deterministic and vanish after their finite lifetime',()=>{
 const w={x:140,y:260,width:52,vertical:false,
  sillHeight:14,headHeight:37,shatteredAt:12};
 assert.equal(windowShardPose(w,11.99,2),null);
 assert.deepEqual(windowShardPose(w,12.25,2),windowShardPose(w,12.25,2));
 assert.ok(windowShardPose(w,12.25,2).y>0);
 assert.equal(windowShardPose(w,12+WINDOW_SHARD_DURATION,2),null);
 assert.equal(windowShardPose({...w,shatteredAt:undefined},12.1,2),null);
 const vertical=windowShardPose({...w,vertical:true},12.25,2);
 const horizontal=windowShardPose(w,12.25,2);
 assert.notEqual(vertical.x,horizontal.x);
});

test('shatter timestamp travels with world snapshots and survives rewind',()=>{
 const s=newSession();
 s.windows=[{id:'REGRESSION-PANE',x:110,y:90,width:45,vertical:false,
   open:true,integrity:0,shattered:true,operable:false,shatteredAt:2.125}];
 s.seconds=2.5;
 const frame=snapshot(s);
 s.windows[0].shattered=false;s.windows[0].shatteredAt=undefined;
 applyReplayFrame(s,frame);
 assert.equal(s.windows[0].shattered,true);
 assert.equal(s.windows[0].shatteredAt,2.125);
});

test('renderer uses frame-owned pane state and lit instanced brass',()=>{
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(source,/const personalWindows=replayDisclosurePolicy\?\.mode==='operator'/);
 assert.match(source,/windowShardPose\(current,s\.seconds,i\)/);
 assert.match(source,/glass\.visible=!\(broken\|\|opened\)/);
 assert.match(source,/new THREE\.MeshStandardMaterial\(\{\s*color:0xb38d59/);
 assert.doesNotMatch(source,/new THREE\.MeshBasicMaterial\(\{color:0xc7a361\}\)/);
});
