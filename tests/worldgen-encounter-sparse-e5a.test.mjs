import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,enemies} from '../src/breach-game.ts';
import {chooseHostileBudget} from '../src/worldgen/encounter-population.ts';

test('E5-A: seeded low-risk quiet intel or rescue can have no armed threat',()=>{
 const room={id:'r',kind:'room',zoneId:'r',x:0,y:0,w:150,h:150};
 const site={seed:8,rooms:[room],identity:{capacity:1,activity:'quiet'}};
 let zero=0;
 for(let seed=1;seed<60;seed++){
  const value=chooseHostileBudget({...site,seed},
    {seed,risk:1,mission:'intel'},'vacant');
  if(value===0)zero++;
 }
 assert.ok(zero>=3&&zero<=40);
 assert.ok(chooseHostileBudget({...site,seed:5},
   {seed:5,risk:3,mission:'capture'},'guarded')>=1);
});
test('E5-A: a zero-enemy site does not silently spawn legacy red defenders',()=>{
 const site=generateSite(35,'small');
 const vacant={...site,enemies:[],enemyHeadings:[],
  encounter:{...site.encounter,
   mission:'intel',premise:'vacant',risk:1,
   hostileBudget:0,actors:[],groups:[]}};
 const s=newSession(0,35,'floor-plan','small','intel',vacant);
 assert.equal(enemies(s).length,0);
 assert.equal(s.missionType,'intel');
 assert.equal(s.mission,'secure');
});
test('E5-A: a single real encounter creates exactly one enemy',()=>{
 const site=generateSite(35,'small');
 const single={...site,enemies:site.enemies.slice(0,1),
  enemyHeadings:site.enemyHeadings?.slice(0,1),
  encounter:{...site.encounter,actors:site.encounter.actors.slice(0,1)}};
 const s=newSession(0,35,'floor-plan','small','clear',single);
 assert.equal(enemies(s).length,1);
});

test('E5-A: a real generated vacant intel site and live session agree',()=>{
 const site=generateSite(2,'small',undefined,
   {seed:2,mission:'intel',risk:1,premise:'vacant'});
 assert.equal(site.encounter.mission,'intel');
 assert.equal(site.encounter.premise,'vacant');
 assert.equal(site.enemies.length,0);
 assert.equal(site.encounter.actors.length,0);
 const session=newSession(0,2,'floor-plan','small','intel',site);
 assert.equal(enemies(session).length,0);
 assert.equal(session.mission,'secure');
});
