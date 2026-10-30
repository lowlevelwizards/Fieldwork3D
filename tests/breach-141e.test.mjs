import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,passable} from '../src/breach-core.ts';
import {generateSite} from '../src/breach-site.ts';
import {defenseCandidates,chooseDefense,watchPoint,
  reachableInvestigation} from '../src/breach-defense.ts';
test('141E: dynamic room defenders find real reachable ground',()=>{
  const site=generateSite(51);activateSite(site);
  const origin=site.enemies[0],threat=site.entrance;
  const candidates=defenseCandidates(origin,threat,site.doors);
  assert.ok(candidates.length);
  assert.ok(candidates.every(passable));
  const picked=chooseDefense(origin,threat,site.doors,[], 'guard');
  assert.ok(picked&&passable(picked));
  const watch=watchPoint(origin,site.doors);
  assert.ok(watch);
  activateSite(null);
});
test('141E: sound investigation never targets impassable cover',()=>{
  const site=generateSite(52);activateSite(site);
  const source=site.enemies[0];
  const obstruction=site.cover[0];
  if(obstruction){
    const goal=reachableInvestigation(source,{x:obstruction.x,y:obstruction.y});
    if(goal)assert.equal(passable(goal),true);
  }
  activateSite(null);
});