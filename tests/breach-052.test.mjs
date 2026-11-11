import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as geometry from '../src/breach-core.ts';
import {
 W,H,WALLS,COVER,initialDoors,newTacticalState,route,passable,
 isClear,doorCenter,pointToSegment
} from '../src/breach-core.ts';
import {
 newSession,team,enemies,planMove,planLook,clearPlan,toggling,stepSession,
 geometricallyVisible
} from '../src/breach-game.ts';

test('052 geometry: original small building and intact physical door gaps',()=>{
 const s=newSession(); // Explicitly restore the static legacy training geometry.
 assert.equal(s.site,undefined);
 assert.equal(W,640);assert.equal(H,740);
 assert.ok(WALLS.length>=7);assert.ok(COVER.length>=4);
 const doors=initialDoors();
 assert.equal(doors.length,2);
 for(const d of doors){
  assert.equal(passable(doorCenter(d)),true,d.id+' should remain traversable');
  assert.equal(d.open,false);
 }
 assert.equal(passable({x:112,y:252}),false);
 assert.equal(passable({x:210,y:310}),true);
 assert.ok(pointToSegment({x:12,y:10},{a:{x:0,y:0},b:{x:20,y:0}})>9);
});

test('052 geometry: original A* produces a physically walkable route through the entrance',()=>{
 newSession();
 const from={x:282,y:628},to={x:213,y:305};
 const path=route(from,to);
 assert.ok(path.length>3);
 assert.deepEqual(path.at(-1),to);
 for(const p of path)assert.equal(passable(p),true);
 assert.ok(path.some(p=>p.y<532)&&path.some(p=>p.y>532));
});

test('052 geometry: closed and opened door leaves preserve physical sight blocking',()=>{
 const s=newSession();
 const doors=s.doors;
 const a={x:304,y:558},b={x:302,y:501};
 assert.equal(isClear(a,b,doors),false);
 doors[0].open=true;doors[0].openFraction=1;
 assert.equal(isClear(a,b,doors),true);
});

test('052 -> live: independent authored plans and facing are owned by the current Session',()=>{
 const s=newSession();
 const rook=team(s).find(a=>a.id==='rook'),moss=team(s).find(a=>a.id==='moss');
 assert.ok(rook&&moss);
 assert.equal(team(s).length,2);assert.equal(enemies(s).length,2);
 assert.equal(s.phase,'planning');
 assert.equal(planMove(s,rook.id,{x:rook.p.x+16,y:rook.p.y-34}),true);
 assert.equal(planMove(s,moss.id,{x:moss.p.x+16,y:moss.p.y-34}),true);
 assert.equal(planLook(s,rook.id,{x:rook.p.x+25,y:rook.p.y-32}),true);
 assert.ok(rook.plan.length>=1&&moss.plan.length>=1);
 assert.equal(clearPlan(s,rook.id),true);
 assert.equal(rook.plan.length,0);
 assert.ok(moss.plan.length>0);
});

test('052 -> live: fixed-step simulation pauses and continues through authoritative GO',()=>{
 const s=newSession();
 const rook=team(s).find(a=>a.id==='rook');
 assert.ok(rook);
 assert.equal(planMove(s,rook.id,{x:rook.p.x+24,y:rook.p.y-40}),true);
 stepSession(s,1/60);assert.equal(s.seconds,0);
 toggling(s);assert.equal(s.phase,'running');
 for(let i=0;i<20;i++)stepSession(s,1/60);
 assert.ok(s.seconds>.3,'only the authoritative running simulation advances time');
 toggling(s);assert.equal(s.phase,'planning');
 const frozen=s.seconds;
 for(let i=0;i<15;i++)stepSession(s,1/60);
 assert.equal(s.seconds,frozen);
});

test('052 -> live: physically blocked targets need directional, unobstructed sight',()=>{
 const s=newSession();
 const rook=team(s)[0],enemy=enemies(s)[0];
 assert.equal(geometricallyVisible(rook,enemy,s),false);
 rook.p={x:196,y:338};rook.heading=0;rook.priorP={...rook.p};
 enemy.p={x:246,y:338};enemy.priorP={...enemy.p};
 assert.equal(geometricallyVisible(rook,enemy,s),true);
 rook.heading=Math.PI;
 assert.equal(geometricallyVisible(rook,enemy,s),false);
});

test('052 -> live: mission outcomes are produced by the actual phase director',()=>{
 const lost=newSession();
 team(lost).forEach(a=>a.health=0);
 toggling(lost);stepSession(lost,1/60);
 assert.equal(lost.phase,'lost');
 const cleared=newSession();
 enemies(cleared).forEach(a=>a.health=0);
 toggling(cleared);stepSession(cleared,1/60);
 assert.equal(cleared.mission,'secure');
 assert.notEqual(cleared.phase,'won','eliminating enemies is not sufficient to secure the mission');
});

test('052 retirement: only geometry and seed fixtures survive; tactical HTML is canonical',()=>{
 assert.equal(typeof geometry.step,'undefined');
 assert.equal(typeof geometry.toggleExecution,'undefined');
 assert.equal(typeof geometry.queueWaypoint,'undefined');
 assert.equal(typeof newTacticalState,'function');
 assert.equal(newTacticalState().operators.length,4);
 const vite=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
 const src=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const canonical=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const redirect=readFileSync(new URL('../breach.html',import.meta.url),'utf8');
 assert.ok(vite.includes("breach: 'breach.html'"));
 assert.ok(vite.includes("world: 'world.html'"));
 assert.ok(vite.includes("study: 'study.html'"));
 assert.ok(canonical.includes('id="breachCanvas"'));
 assert.ok(redirect.includes('window.location.replace(target.href)'));
 assert.ok(src.includes("from './breach-core.ts'"));
 assert.ok(!src.includes('newOperation'));
 assert.ok(!src.includes('regional-terrain'));
 assert.ok(canonical.includes('id="play"'));
});
