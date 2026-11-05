import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {chooseCivilianRefuge,civilianRefugePoints}
 from '../src/breach-civilian-refuge.ts';
import {stepCivilianMovement} from '../src/breach-civilian-movement.ts';
import {generateSite} from '../src/breach-site.ts';
const make=()=>{const c=createCivilian({id:'civ:path',
 role:'resident',persona:'steady',activity:'idle',
 position:{x:70,y:70},heading:0,roomId:'home',
 routine:[{x:70,y:70}],appearanceSeed:14});
 c.threatEstimate={x:120,y:70};
 c.refugePoints=[{x:38,y:70}];return c;};
test('E5-C2 refuses blocked destination without viable physical route',()=>{
 const c=make();
 assert.equal(chooseCivilianRefuge(c,{canReach:()=>false,
  routeTo:()=>[]}),null);
});
test('E5-C2 uses verified route waypoints instead of walking through wall',()=>{
 const c=make();
 const path=[{x:70,y:30},{x:38,y:30},{x:38,y:70}];
 // A solid wall blocks the straight same-row leg, but the three
 // corridor turns remain individually physically passable.
 const clear=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<50&&
   !(Math.abs(a.y-70)<.01&&Math.abs(b.y-70)<.01);
 const picked=chooseCivilianRefuge(c,{canReach:clear,
  routeTo:()=>path});
 assert.ok(picked);
 assert.equal(picked.path.length,3);
 c.goal=picked.goal;c.nav=picked.path;c.state='fleeing';
 for(let i=0;i<900;i++)stepCivilianMovement(c,1+i/60,1/60,
  clear,()=>false);
 assert.ok(Math.hypot(c.p.x-38,c.p.y-70)<10);
 assert.equal(c.state,'hiding');
});
test('E5-C2 seed-derived refuge candidates are valid building positions',()=>{
 const site=generateSite(19,'small',undefined,
   {seed:19,mission:'intel',risk:1});
 const room=site.rooms.find(r=>r.kind==='room');
 assert.ok(room);
 const c=make();c.homeRoomId=room.id;
 const a=civilianRefugePoints(site,c),b=civilianRefugePoints(site,c);
 assert.deepEqual(a,b);
 assert.ok(a.length<=15);
});
