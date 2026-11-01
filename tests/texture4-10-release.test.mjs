import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {planEnvironmentalWear} from '../src/worldgen/environment-wear.ts';
import {planActivityWear} from '../src/worldgen/wear-sources.ts';
import {planObjectWear} from '../src/worldgen/object-wear.ts';
import {planExposureWear} from '../src/worldgen/wear-exposure.ts';
import {planHistoryWear} from '../src/worldgen/surface-history.ts';
const html=readFileSync(new URL('../asset-lab.html',import.meta.url),'utf8');
test('wear controls are available in material lab',()=>{
 for(const id of ['wear-kind','wear-boost','wear-swatch','wear-diagnostics'])
  assert.ok(html.includes('id="'+id+'"'),id);
});
test('whole weathering pipeline remains deterministic and bounded',()=>{
 for(const seed of [120,126,127,128,134,141,158]){
  const s=generateSite(seed);
  const floor=[...planEnvironmentalWear(s),...planActivityWear(s),...planHistoryWear(s)];
  const objects=[...planObjectWear(s),...planExposureWear(s)];
  assert.ok(floor.length<=25,'floor effects over budget');
  assert.ok(objects.length<=25,'object effects over budget');
  assert.deepEqual(floor,[...planEnvironmentalWear(s),...planActivityWear(s),...planHistoryWear(s)]);
 }
});
