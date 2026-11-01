import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable} from '../src/breach-core.ts';
test('contextual placements are deterministic, distinct, and physically valid',()=>{
 for(const seed of [11,32,53,74]){
  const opts={premise:'defensive',risk:3};
  const a=generateSite(seed,'large',undefined,opts);
  const b=generateSite(seed,'large',undefined,opts);
  assert.deepEqual(a.enemies,b.enemies);
  assert.equal(a.encounter?.actors.length,a.enemies.length);
  assert.equal(a.encounter?.groups.reduce((n,g)=>n+g.members.length,0),a.enemies.length);
  activateSite(a);
  for(let i=0;i<a.enemies.length;i++){
   assert.ok(passable(a.enemies[i]),'invalid point at '+seed+':'+i);
   for(let j=i+1;j<a.enemies.length;j++)
    assert.ok(Math.hypot(a.enemies[i].x-a.enemies[j].x,
      a.enemies[i].y-a.enemies[j].y)>=25);
  }
  activateSite(null);
 }
});
