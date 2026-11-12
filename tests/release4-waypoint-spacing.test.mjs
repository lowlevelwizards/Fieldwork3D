import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spaceStrokeWaypoints} from '../src/ui/touch-hit-targets.ts';
const p=(x,y)=>({x,y});
test('R4.5 removes duplicate near-straight touch nodes with stable endpoint',()=>{
 const points=[p(0,0),p(10,0),p(19,0.3),p(48,1),p(90,2)];
 const result=spaceStrokeWaypoints(points,x=>x);
 assert.ok(result.length<points.length);
 assert.deepEqual(result[0],points[0]);
 assert.deepEqual(result.at(-1),points.at(-1));
});
test('R4.5 preserves meaningful corners and known-geometry veto',()=>{
 const corner=[p(0,0),p(12,0),p(12,35),p(13,65)];
 assert.deepEqual(spaceStrokeWaypoints(corner,x=>x),corner);
 const blocked=[p(0,0),p(10,0),p(50,0)];
 assert.deepEqual(spaceStrokeWaypoints(blocked,x=>x,18,
  (a,b)=>b.x-a.x<=25),blocked);
});
test('R4.5 finger cleanup is a single undoable authoring edit',()=>{
 const source=readFileSync(new URL('../src/breach-pointer-command-controller.ts',import.meta.url),'utf8');
 assert.match(source,/spaceStrokeWaypoints\(points,projectStroke,18,/);
 assert.match(source,/planMoveStroke\(port\.state,port\.selected,spaced\.slice\(1\),false,true,strokeOutcome\)/);
});
