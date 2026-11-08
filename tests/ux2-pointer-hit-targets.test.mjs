import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tacticalHitProfile} from '../src/ui/touch-hit-targets.ts';
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
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
 assert.match(main,/tacticalPickAt\(\{x:e\.clientX,y:e\.clientY\}/);
 assert.match(main,/tacticalHitProfile\(e\.pointerType\)\.dragStart/);
 assert.match(main,/screenSegmentDistance\(screen,a,b\)/);
 assert.match(main,/routeLineHit\(unit\.p,unit\.plan,screen/);
 assert.match(main,/insertAtRouteLine\(\{x:e\.clientX,y:e\.clientY\},e\.pointerType\)/);
});
test('two-finger camera gesture still cancels route authoring',()=>{
 assert.match(main,/if\(activePointers\.size>=2\)/);
 assert.match(main,/pointer\.mode='cameraMulti'/);
 assert.match(main,/trace=null;draggingNode=null/);
});
