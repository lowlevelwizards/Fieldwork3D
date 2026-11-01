import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {planEnvironmentalWear} from '../src/worldgen/environment-wear.ts';
import {planActivityWear} from '../src/worldgen/wear-sources.ts';
import {planObjectWear} from '../src/worldgen/object-wear.ts';
import {planExposureWear} from '../src/worldgen/wear-exposure.ts';
import {planHistoryWear} from '../src/worldgen/surface-history.ts';
import {planMicroDebris} from '../src/worldgen/micro-debris.ts';
test('condition slider controls every wear channel at fixed seed',()=>{
 for(const seed of [120,126,127,128,134]){
  const site=generateSite(seed),clean={...site,conditionLevel:0},
   medium={...site,conditionLevel:50},old={...site,conditionLevel:100};
  const planners=[planEnvironmentalWear,planActivityWear,planObjectWear,
   planExposureWear,planHistoryWear,planMicroDebris];
  for(const planner of planners){
   assert.equal(planner(clean).length,0,'pristine '+seed+' '+planner.name);
   const mid=planner(medium),ruined=planner(old);
   assert.deepEqual(ruined,planner(old));
   assert.ok(ruined.length>=mid.length,'graded '+seed+' '+planner.name);
   assert.ok(ruined.length<=96,'bounded '+seed+' '+planner.name);
  }
  assert.ok(planEnvironmentalWear(old).length>planEnvironmentalWear(medium).length);
 }
});
