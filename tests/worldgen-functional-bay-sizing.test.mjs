import test from 'node:test';
import assert from 'node:assert/strict';
import {roomCapacityTarget,fitFunctionalBaySizes} from '../src/worldgen/functional-bay-sizing.ts';
import {blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {generateSite} from '../src/breach-site.ts';

test('physical capacity targets reflect operational room fixtures',()=>{
 assert.ok(roomCapacityTarget('bathroom').w>=111);
 assert.ok(roomCapacityTarget('bathroom').d>=118);
 assert.ok(roomCapacityTarget('exam').w>=127);
 assert.ok(roomCapacityTarget('bay').d>=144);
});
test('undersized real bays expand but public corridors stay passable and narrow',()=>{
 const plan={kind:'clinic',family:'constrained clinic',widths:[80,65,80],
  depths:[88,90],front:{col:1,row:1},cells:[
   ['exam','hallway','treatment'],
   ['waiting','reception','restroom']]};
 const fitted=fitFunctionalBaySizes(plan);
 assert.ok(fitted.widths[0]>80);
 assert.equal(fitted.widths[1],65);
 assert.ok(fitted.widths[2]>80);
 assert.ok(fitted.depths[0]>88);
 assert.ok(fitted.depths[1]>90);
 for(let i=0;i<plan.widths.length;i++){
  assert.ok(fitted.widths[i]>=plan.widths[i]);
  assert.ok(fitted.widths[i]<=plan.widths[i]+36);
 }
 for(let i=0;i<plan.depths.length;i++){
  assert.ok(fitted.depths[i]>=plan.depths[i]);
  assert.ok(fitted.depths[i]<=plan.depths[i]+36);
 }
 assert.deepEqual(fitted.cells,plan.cells);
 assert.deepEqual(blueprintIssues(fitted),[]);
 // Sizing is invoked once per compilation; the 36-unit cap is intentionally
 // retained rather than repeatedly growing a physically constrained site.
});
test('capacity fitting does not invalidate playable multi-size generated sites',()=>{
 for(const [seed,scale] of [[7,'small'],[10,'medium'],[3,'standard'],[22,'large']]){
  const site=generateSite(seed,scale);
  assert.ok(site.doors.some(d=>d.id==='FRONT'));
  assert.ok(site.rooms.every(r=>r.w>0&&r.h>0));
  assert.deepEqual(generateSite(seed,scale).rooms,site.rooms);
 }
});
