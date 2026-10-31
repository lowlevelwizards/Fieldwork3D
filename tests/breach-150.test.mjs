import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFireLane} from '../src/breach-fire-safety.ts';
import {readFileSync} from 'node:fs';
const from={x:0,y:0},to={x:100,y:0};
const low={x:50,y:0,w:20,h:20,low:true};
const high={...low,low:false};
test('150: standing muzzles clear low furniture but not high cover',()=>{
 assert.equal(assessFireLane(from,26,to,32,[low],[],[]).blocker,'clear');
 assert.equal(assessFireLane(from,22,to,32,[high],[],[]).blocker,'cover');
 assert.equal(assessFireLane(from,32,to,32,[high],[],[]).blocker,'clear');
});
test('150: friendly fire lane blocks a shot before the ammunition is spent',()=>{
 assert.equal(assessFireLane(from,30,to,32,[],[],[],
   [{x:50,y:2}]).blocker,'friendly');
 assert.equal(assessFireLane(from,30,to,32,[],[],[],
   [{x:51,y:23}]).blocker,'clear');
});
test('150: walls and actual door leaves override clear muzzle height',()=>{
 const wall={a:{x:45,y:-10},b:{x:45,y:10}};
 const door={id:'D',...wall,open:false,openedAt:-1,
   hinge:'a',swing:1,openFraction:0};
 assert.equal(assessFireLane(from,32,to,32,[],[wall],[]).blocker,'wall');
 assert.equal(assessFireLane(from,32,to,32,[],[],[door]).blocker,'door');
});
test('150: fire state checks are upstream of ammo decrement',()=>{
 const s=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const fn=s.slice(s.indexOf('function fire('),s.indexOf('function mission(',s.indexOf('function fire(')));
 assert.ok(fn.indexOf("assessFireLane(")<fn.indexOf("a.magazine--"));
 assert.match(fn,/lastFireBlock=lane.blocker/);
});