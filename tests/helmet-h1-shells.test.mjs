import test from 'node:test';
import assert from 'node:assert/strict';
import {headwearCuboidVolumes,HEAD_SILHOUETTE_METRICS} from '../src/operator-headwear-silhouettes.ts';
import {wardrobeItemsForSlot} from '../src/operator-wardrobe-data.ts';
test('H1 four new authored shell cuts have distinct source volumes',()=>{
 const ids=['mich-2001','mich-2002','fast-sf','fast-xp-mid'];
 const signatures=ids.map(id=>JSON.stringify(headwearCuboidVolumes(id)));
 assert.equal(new Set(signatures).size,4);
 for(const id of ids){
  assert.ok(headwearCuboidVolumes(id).length>=4);
  assert.ok(wardrobeItemsForSlot('headwear').some(x=>x.id===id));
 }
});
test('mid cuts have lower ear edge than high cuts',()=>{
 assert.ok(HEAD_SILHOUETTE_METRICS['mich-2002'].earEdge<HEAD_SILHOUETTE_METRICS['mich-2001'].earEdge);
 assert.ok(HEAD_SILHOUETTE_METRICS['fast-xp-mid'].earEdge<HEAD_SILHOUETTE_METRICS['fast-sf'].earEdge);
 assert.equal(HEAD_SILHOUETTE_METRICS.ach.earEdge,2.23);
});
