import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WALL_EFFECTS,WALL_FINISHES,WALL_WITNESSES,wallSample,samplePixels,selectWallEvents} from '../src/wall-material-lab-samples.ts';
test('every production wall effect has a visible, deterministic isolated witness',()=>{
 for(const kind of WALL_EFFECTS){
  const witness=WALL_WITNESSES[kind],recipe=wallSample(witness.finish,[kind]);
  const clean=samplePixels(recipe,0);
  assert.deepEqual(samplePixels(recipe,witness.event.threshold-1).bytes,clean.bytes,kind);
  const aged=samplePixels(recipe,100);
  assert.notDeepEqual(aged.bytes,clean.bytes,kind);
  assert.deepEqual(samplePixels(recipe,100).bytes,aged.bytes,kind);
  assert.deepEqual(selectWallEvents(recipe,100).map(e=>e.kind),[kind]);
  assert.equal(aged.height,24);
  assert.equal(aged.width,128);
 }
});
test('clean finishes and combined examples retain production condition budget',()=>{
 for(const i of WALL_FINISHES.keys())assert.deepEqual(samplePixels(wallSample(i),100).bytes,samplePixels(wallSample(i),0).bytes);
 const recipe=wallSample(2,['damp','moss','runoff','crack']);
 assert.equal(selectWallEvents(recipe,0).length,0);
 assert.ok(selectWallEvents(recipe,50).length<=2);
 assert.equal(selectWallEvents(recipe,100).length,4);
});
