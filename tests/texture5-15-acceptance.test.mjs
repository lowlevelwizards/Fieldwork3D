import test from 'node:test';import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {conditionFloorPixels} from '../src/worldgen/condition-visual.ts';
import {conditionWallPixels} from '../src/worldgen/condition-wall.ts';
import {planEnvironmentalWear} from '../src/worldgen/environment-wear.ts';
import {ageMaterialColor} from '../src/rendering/condition-materials.ts';
import {outdoorVisualCondition} from '../src/worldgen/outdoor-condition.ts';
const seeds=[120,126,127,128,134,141,158];
const alpha=p=>{let n=0;for(let i=3;i<p.length;i+=4)n+=p[i];return n;};
test('same-seed pristine-to-decrepit transformation is unmistakable and graded',()=>{
 for(const seed of seeds){
  const site=generateSite(seed);
  const room=site.rooms.find(r=>r.kind==='room');
  assert.ok(room,'seed '+seed+' has a room');
  const floor=[0,25,50,75,100].map(level=>alpha(conditionFloorPixels(site,room,level)));
  const wall=[0,25,50,75,100].map(level=>alpha(conditionWallPixels(site,0,level)));
  assert.equal(floor[0],0);
  assert.equal(wall[0],0);
  for(let i=1;i<5;i++){
   assert.ok(floor[i]>floor[i-1],seed+' graded floor '+i);
   assert.ok(wall[i]>wall[i-1],seed+' graded wall '+i);
  }
  assert.ok(floor[4]>floor[2]*1.6,'seed '+seed+' large floor aging shift');
  assert.ok(wall[4]>wall[2]*1.6,'seed '+seed+' large wall aging shift');
  const old={...site,conditionLevel:100};
  const clean={...site,conditionLevel:0};
  assert.ok(planEnvironmentalWear(old).length>planEnvironmentalWear(clean).length);
  assert.equal(outdoorVisualCondition(clean),'occupied');
  assert.equal(outdoorVisualCondition(old),'neglected');
  assert.deepEqual(conditionFloorPixels(site,room,100),conditionFloorPixels(site,room,100));
 }
});
test('substrate color and visible patina change independently of placement',()=>{
 const clean=0xaf9c84;
 assert.equal(ageMaterialColor(clean,'painted-wood',0),clean);
 assert.notEqual(ageMaterialColor(clean,'painted-wood',100),clean);
 assert.notEqual(ageMaterialColor(clean,'painted-wood',100),
  ageMaterialColor(clean,'painted-metal',100));
});
