import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,COVER,WALLS} from '../src/breach-core.ts';
import {chooseDefense} from '../src/breach-defense.ts';
import {assessFireLane} from '../src/breach-fire-safety.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {newSession,team,enemies,toggling,stepSession}
  from '../src/breach-game.ts';
test('152: a defender selects a reachable position with muzzle clearance',()=>{
 activateSite({walls:[],doors:[],cover:[
   {x:150,y:100,w:40,h:30,low:false}
 ],rooms:[{id:'R1',x:60,y:60,w:220,h:150,kind:'room',tone:1}],
   seed:1,name:'AUDIT',entrance:{x:100,y:100},spawn:[],
   enemies:[],objective:{x:220,y:100},extract:{x:100,y:100},
   roomCount:1,layout:'office'});
 const from={x:95,y:100},threat={x:220,y:100};
 const p=chooseDefense(from,threat,[],[],'guard');
 assert.ok(p);
 assert.equal(assessFireLane(p,26,threat,32,COVER,WALLS,[]).blocker,
   'clear');
 activateSite(null);
});
test('152: physically crouching lowers the actual gun muzzle by eight',()=>{
 const base={x:100,z:120,heading:0,weaponYaw:0,weapon:'carbine',
   aim:1,velocity:0,recoil:0};
 const standing=muzzleAtShot({...base,posture:'stand'});
 const crouching=muzzleAtShot({...base,posture:'crouch'});
 assert.ok(Math.abs(standing.y-crouching.y-8)<1e-6);
 assert.equal(standing.x,crouching.x);
});
test('152: blocked visible fire triggers a bounded defender reposition attempt',()=>{
 const s=newSession(),a=enemies(s)[0],b=team(s)[0];
 for(const other of s.operators)if(other!==a&&other!==b)other.health=0;
 a.p={x:390,y:164};a.heading=0;
 b.p={x:550,y:164};b.heading=Math.PI;
 a.alert='idle';a.lastFireRepositionAt=-100;
 toggling(s);
 for(let i=0;i<30;i++)stepSession(s,1/60);
 assert.ok(a.lastFireRepositionAt>=0,'blocked lane should cause evaluation');
 assert.ok(a.lastFireRepositionAt<=s.seconds);
 activateSite(null);
});