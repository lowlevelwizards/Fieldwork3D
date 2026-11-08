import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beginAutoSidestep,autoSidestepFacing}
  from '../src/breach-auto-sidestep.ts';

const from={x:0,y:0},original={x:40,y:0};
const sidestep={x:14,y:24},goal={x:100,y:0};

test('lateral automatic bypass preserves original forward heading temporarily',()=>{
 const hold=beginAutoSidestep(from,original,sidestep,0,goal,4,true);
 assert.ok(hold);
 assert.equal(hold.facing,0);
 assert.equal(autoSidestepFacing(hold,from,sidestep,goal,4.25,true),0);
 // It is intentionally temporary, not another authored LOOK/WATCH order.
 assert.equal(autoSidestepFacing(hold,from,sidestep,goal,5.26,true),null);
});

test('straight travel and actual hallway corners retain ordinary turning',()=>{
 assert.equal(beginAutoSidestep(from,original,{x:30,y:4},0,goal,4,true),null);
 // A real corner follows a path initially pointed north, while the actor
 // still faces east: not a sidestep initiated out of forward travel.
 assert.equal(beginAutoSidestep(from,{x:0,y:40},sidestep,0,goal,4,true),null);
 assert.equal(beginAutoSidestep(from,original,{x:-25,y:0},0,goal,4,true),null);
 assert.equal(beginAutoSidestep(from,original,{x:25,y:60},0,goal,4,true),null);
});

test('an explicit action, a new destination, or resumed forward route releases hold',()=>{
 const hold=beginAutoSidestep(from,original,sidestep,0,goal,4,true);
 assert.ok(hold);
 assert.equal(beginAutoSidestep(from,original,sidestep,0,goal,4,false),null);
 assert.equal(autoSidestepFacing(hold,from,sidestep,goal,4,false),null);
 assert.equal(autoSidestepFacing(hold,from,sidestep,{x:70,y:0},4,true),null);
 assert.equal(autoSidestepFacing(hold,{x:30,y:0},{x:55,y:2},goal,4,true),null);
});

test('motor applies lateral facing only after verified detour and never changes authored route',()=>{
 const game=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.match(game,/beginAutoSidestep\(a\.p,next,candidate,a\.heading,p,/);
 assert.match(game,/beginAutoSidestep\(a\.p,next,fullLane\[0\],a\.heading,p,/);
 assert.match(game,/const heldSide=autoSidestepFacing\(/);
 assert.match(game,/rotate\(a,facing\?\?angle\(a\.p,a\.nav\[0\]\),dt\)/);
 assert.match(game,/a\.autoSidestep=null;\s*a\.routeGoalKey=goalKey/);
 assert.match(rig,/const lateral=Math\.abs\(Math\.sin\(travel-p\.heading\)\)>\.52/);
});
