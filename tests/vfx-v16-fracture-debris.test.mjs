import test from 'node:test';
import assert from 'node:assert/strict';
import {recordDoorFracture} from '../src/breach-fracture-record.ts';
import {damageCover} from '../src/breach-reactive-cover.ts';
import {doorDebrisSource,coverDebrisSource,fractureDebrisPose} from '../src/rendering/breach-fracture-debris.ts';
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
