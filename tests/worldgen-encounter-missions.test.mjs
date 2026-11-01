import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
test('default site encounter mission equals seed-selected tactical mission',()=>{
 const missions=['clear','intel','rescue','hold','capture'];
 for(const seed of [11,22,33]){
  const site=generateSite(seed,'small');
  assert.equal(site.encounter.mission,missions[seed%5]);
 }
 const capture=generateSite(22,'small',undefined,{mission:'capture',risk:3});
 assert.equal(capture.encounter.mission,'capture');
});
