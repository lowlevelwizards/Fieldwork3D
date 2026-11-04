import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,enemies,team} from '../src/breach-game.ts';
import {chooseFiringDefense,chooseDefense} from '../src/breach-defense.ts';
import {assessFireLane} from '../src/breach-fire-safety.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {WALLS,COVER,activateSite} from '../src/breach-core.ts';

test('visible-target reposition chooses only physically clear firing lanes',()=>{
 try{
  for(const seed of [3,17,61]){
   const s=newSession(0,seed);
   const target=team(s)[0].p;
   const guards=enemies(s);
   for(const guard of guards){
    const others=guards.map(a=>({id:a.id,p:a.p,
      health:a.health,defense:a.defense}));
    const firing=chooseFiringDefense(guard.p,target,s.doors,
      others,guard.id,18);
    if(firing){
     assert.equal(assessFireLane(firing,26,target,18,
       COVER,WALLS,s.doors,
       others.filter(o=>o.id!==guard.id&&o.health>0).map(o=>o.p)).blocker,
       'clear','no blind firing reposition at seed '+seed);
     assert.ok(sweptBodyClear(guard.p,firing,s.doors));
    }
    const defensive=chooseDefense(guard.p,target,s.doors,others,guard.id);
    if(defensive)assert.ok(sweptBodyClear(guard.p,defensive,s.doors));
   }
  }
 }finally{activateSite(null);}
});
