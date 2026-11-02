/** Visibility contract: structural context never implies hostile discovery. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialSurfaceState} from '../src/breach-presentation.ts';
const room=(id,x)=>({id,x,y:0,w:80,h:80,kind:'room',tone:0});
const session=(mode='true-blind')=>({
 site:{rooms:[room('A',0),room('B',80)]},doors:[],
 operators:[],seenGround:new Set(),
 intel:{mode,walls:new Set(),doors:new Set(),cover:new Set(),
  rooms:new Set(),doorMemory:new Map()}
});
test('VIS-04 unknown room stays hidden without briefing',()=>{
 const s=session();
 assert.equal(spatialSurfaceState(s,'room','A'),'unknown');
 assert.equal(spatialSurfaceState(s,'room','B'),'unknown');
});
test('VIS-04 occupied room exposes shell but not adjacent room',()=>{
 const s=session();
 s.operators.push({side:'blue',health:100,p:{x:40,y:40}});
 assert.equal(spatialSurfaceState(s,'room','A'),'occupied-structure');
 assert.equal(spatialSurfaceState(s,'room','B'),'unknown');
});
test('VIS-04 briefed door is not mistaken for live observed state',()=>{
 const s=session('floor-plan');
 s.intel.doors.add('D1');
 assert.equal(spatialSurfaceState(s,'door','D1'),'briefed');
 s.intel.doorMemory.set('D1',0);
 assert.equal(spatialSurfaceState(s,'door','D1'),'remembered');
});
