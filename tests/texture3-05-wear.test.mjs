import test from 'node:test';import assert from 'node:assert/strict';
import {WEAR_ALPHA_BANDS,wearOpacityBucket} from '../src/rendering/wear-opacity.ts';
import {generateSite} from '../src/breach-site.ts';
import {planEnvironmentalWear,WEAR_BUDGET} from '../src/worldgen/environment-wear.ts';
test('wear opacity uses at most four shared material variants per kind',()=>{
 assert.equal(WEAR_ALPHA_BANDS.length,4);
 for(let alpha=0;alpha<=1;alpha+=.01)
  assert.ok(wearOpacityBucket(alpha)>=0&&wearOpacityBucket(alpha)<4);
});
test('condition wear remains deterministic and anchored inside room boundaries',()=>{
 for(let seed=1;seed<=40;seed++){
  const site=generateSite(seed),wear=planEnvironmentalWear(site);
  assert.deepEqual(wear,planEnvironmentalWear(site));
  assert.ok(wear.length<=WEAR_BUDGET[site.condition??'occupied']);
  for(const p of wear){
   const r=site.rooms.find(x=>x.id===p.roomId);
   assert.ok(r&&p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
  }
 }
});
