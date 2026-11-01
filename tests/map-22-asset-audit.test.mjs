import test from 'node:test';
import assert from 'node:assert/strict';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {assetReviewInventory,ART_REVIEW_DIMENSIONS} from '../src/worldgen/asset-review.ts';
test('art review inventory covers every physical, detail and architectural entry',()=>{
 const entries=assetLibrary(),reviews=assetReviewInventory();
 assert.equal(reviews.length,entries.length);
 assert.equal(new Set(reviews.map(r=>r.id)).size,entries.length);
 for(const review of reviews){
  assert.equal(Object.keys(review.scores).length,ART_REVIEW_DIMENSIONS.length);
  assert.equal(review.scores.silhouette,null,'Do not fabricate approval scores');
  assert.ok(review.metres.every(n=>n>0));
 }
 assert.equal(reviews.find(r=>r.id==='office-chair').status,'needs-cleanup');
 assert.equal(reviews.find(r=>r.id==='bike-rack').status,'needs-cleanup');
});
