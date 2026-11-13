import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceSimulationActors} from '../src/breach-simulation-actor-phase.ts';
import {witnessShock} from '../src/breach-ai-morale.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const point=(x,y)=>({x,y});
const actor=(id,p,health,lastDownAt=0)=>({
 id,name:id,side:'red',p,priorP:{...p},heading:0,
 health,fireCd:0,reload:0,reloadMode:null,surrendered:false,
 lastDownAt,lastMoraleEventAt:0,morale:.9,suppression:0,
 injuryStage:0,personality:'guard',alert:'guard',blockedTime:0,
 awareness:{contacts:{}},doorStunUntil:0,plan:[],nav:[],
 velocity:0,targetId:null,retreatPoint:null
});
const port=(seen)=>({
 notify(){},battleEvent(){},defensivePosition(){return null;},
 unobstructed(a,b){seen.push([a.x,b.x]);return true;},
 decideEnemy(){},runFriendly(){}
});
test('enemy morale candidate reuse preserves exact sequential shock and witness timing',()=>{
 const observer=actor('observer',point(0,0),4);
 const unseen=actor('out-of-range',point(350,0),0,2);
 const first=actor('down-a',point(100,0),0,2);
 const second=actor('down-b',point(120,0),0,3);
 const s={seconds:5,operators:[observer,unseen,first,second]};
 const rays=[];
 advanceSimulationActors(s,1/60,port(rays));
 assert.deepEqual(rays,[[0,100],[0,120]]);
 const expected=.9+1/60*.006-witnessShock(100,true)-witnessShock(120,true);
 assert.ok(Math.abs(observer.morale-expected)<1e-12);
 assert.equal(observer.lastMoraleEventAt,3);
 const previous=rays.length;
 advanceSimulationActors(s,1/60,port(rays));
 assert.equal(rays.length,previous,'already witnessed casualties cost zero LOS');
 second.lastDownAt=4;
 advanceSimulationActors(s,1/60,port(rays));
 assert.deepEqual(rays.at(-1),[0,120],'new timestamp gets immediate individual LOS');
 assert.equal(observer.lastMoraleEventAt,4);
});
test('combat correction retains real cover, friend and civilian safety while avoiding duplicate scans',()=>{
 const code=source('src/breach-firing-pipeline.ts');
 assert.match(code,/const people:Pt\[\]=\[\]/);
 assert.match(code,/for\(const civil of s\.civilians\)if\(civil\.health>0\)people\.push\(civil\.p\)/);
 assert.match(code,/const world=sessionWorldGeometry\(s\);\n const aimYaw/);
 assert.match(code,/sweptBodyClear\(a\.p,candidate,s\.doors,8,world\)/);
 assert.match(code,/for\(const other of allies\)if\(other!==a&&other!==rear&&other\.health>0\)/);
 assert.match(code,/liveVisibility\(s,c\.p\)&&unobstructed\(a\.p,c\.p,s,false\)/);
 assert.match(code,/assessFriendlyLane\(from,clearance\.muzzle\.y,far,farHeight/);
 assert.match(code,/assessFireLane\(origin,clearance\.muzzle\.y,target\.p,/);
});
