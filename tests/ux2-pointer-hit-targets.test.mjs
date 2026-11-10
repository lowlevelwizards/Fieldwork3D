import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tacticalHitProfile} from '../src/ui/touch-hit-targets.ts';
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const picking=readFileSync(new URL('../src/breach-tactical-picking.ts',import.meta.url),'utf8');
const gestures=readFileSync(new URL('../src/breach-canvas-gesture-controller.ts',import.meta.url),'utf8');
const commands=readFileSync(new URL('../src/breach-pointer-command-controller.ts',import.meta.url),'utf8');
test('finger targets are more forgiving without making mouse imprecise',()=>{
 const mouse=tacticalHitProfile('mouse');
 const touch=tacticalHitProfile('touch');
 const pen=tacticalHitProfile('pen');
 assert.deepEqual(mouse,{waypoint:27,route:14,reachableDoor:28,dragStart:9});
 assert.ok(touch.waypoint>pen.waypoint&&pen.waypoint>mouse.waypoint);
 assert.ok(touch.route>pen.route&&pen.route>mouse.route);
 assert.ok(touch.reachableDoor>mouse.reachableDoor);
 assert.ok(touch.dragStart>mouse.dragStart);
 assert.deepEqual(tacticalHitProfile(''),mouse);
});
test('gesture thresholds and hit tests all use pointer type',()=>{
 assert.match(main,/function tacticalPickAt\(screen:Pt,pointerKind:string\)/);
 assert.match(main,/pick:tacticalPickAt/);
 assert.match(main,/pickTacticalTarget\(/);
 assert.match(gestures,/cb\.pick\(/);
 assert.match(gestures,/tacticalHitProfile\(e\.pointerType\)\.dragStart/);
 assert.match(picking,/screenSegmentDistance\(screen,a,b\)/);
 assert.match(picking,/routeLineHit\(unit\.p,unit\.plan,screen/);
 assert.match(commands,/port\.insertAtRouteLine\(\{x:e\.clientX,y:e\.clientY\},e\.pointerType\)/);
});
test('two-finger camera gesture still cancels route authoring',()=>{
 assert.match(gestures,/if\(activePointers\.size>=2\)/);
 assert.match(gestures,/pointer\.mode='cameraMulti'/);
 assert.match(main,/clearDrag:\(\)=>\{trace=null;draggingNode=null/);
});
