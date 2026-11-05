import test from 'node:test';
import assert from 'node:assert/strict';
import {civilianStation} from '../src/worldgen/encounter-civilians.ts';
import {generateSite} from '../src/breach-site.ts';
test('E5-C5 staff and visitors follow site role and fixture semantics',()=>{
 assert.deepEqual(civilianStation('restaurant','prep-table','customer'),
  {role:'employee',activity:'working'});
 assert.deepEqual(civilianStation('restaurant','dining-table','employee'),
  {role:'customer',activity:'seated'});
 assert.deepEqual(civilianStation('clinic','chair','employee'),
  {role:'patient',activity:'seated'});
 assert.deepEqual(civilianStation('house','sofa','resident'),
  {role:'resident',activity:'seated'});
 assert.deepEqual(civilianStation('office','desk','employee'),
  {role:'employee',activity:'working'});
});
test('E5-C5 generated civilian locations remain seeded and safely spaced',()=>{
 for(const seed of [3,13,25,37,49,61,73]){
  const a=generateSite(seed,'small',undefined,
    {seed,mission:'intel',premise:'routine',risk:1});
  const b=generateSite(seed,'small',undefined,
    {seed,mission:'intel',premise:'routine',risk:1});
  assert.deepEqual(a.encounter?.neutrals,b.encounter?.neutrals);
  const people=a.encounter?.neutrals??[];
  assert.ok(people.length<=2);
  for(let i=0;i<people.length;i++){
   for(let j=i+1;j<people.length;j++)
    assert.ok(Math.hypot(people[i].position.x-people[j].position.x,
      people[i].position.y-people[j].position.y)>=43);
   if(people[i].activity==='seated')
     assert.equal(people[i].routine,undefined);
  }
 }
});
