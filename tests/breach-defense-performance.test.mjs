import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies} from '../src/breach-game.ts';
import {defenseCandidates,chooseDefense}
  from '../src/breach-defense.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {activateSite} from '../src/breach-core.ts';

test('local defensive AI tests swept physical routes instead of O(N) A* searches',()=>{
 for(const seed of [3,17,61]){
  const s=newSession(0,seed);
  const target=team(s)[0].p;
  for(const guard of enemies(s)){
   const choices=defenseCandidates(guard.p,target,s.doors);
   assert.ok(choices.every(p=>sweptBodyClear(guard.p,p,s.doors)),
     'defense candidate must be physically reachable at seed '+seed);
   const selected=chooseDefense(guard.p,target,s.doors,
     enemies(s).map(a=>({id:a.id,p:a.p,health:a.health,defense:a.defense})),
     guard.id);
   if(selected)assert.ok(sweptBodyClear(guard.p,selected,s.doors));
  }
 }
 activateSite(null);
});
