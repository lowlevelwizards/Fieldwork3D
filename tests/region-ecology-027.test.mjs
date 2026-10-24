import test from 'node:test';
import assert from 'node:assert/strict';
import {
  macroBiome,temperatureC,snowCover,coastalInundation,
  roadCorridor,settlementSites,
} from '../src/region-ecology.ts';
import { regionAt,regionalRiverX,regionalHeight } from '../src/region-model.ts';
test('Verdigris keeps ordered ecological identities from alpine headwaters to sea',()=>{
  assert.equal(macroBiome(3),'alpine');
  assert.equal(macroBiome(40),'conifer');
  assert.equal(macroBiome(75),'mixed-forest');
  assert.equal(macroBiome(110),'farmland');
  assert.equal(macroBiome(145),'wetland');
  assert.equal(macroBiome(176),'estuary');
  assert.ok(temperatureC(10,1800)<temperatureC(170,20));
  assert.ok(snowCover(10,regionalRiverX(10))>
    snowCover(175,regionalRiverX(175)));
  assert.equal(coastalInundation(100,regionalRiverX(100)),0);
  assert.ok(coastalInundation(179,regionalRiverX(179))>=0);
});
test('settlement positions are deterministic, near roads but outside the river center',()=>{
  const a=settlementSites(7),b=settlementSites(7);
  assert.deepEqual(a,b);
  assert.equal(a.length,10);
  for(const site of a){
    assert.equal(site.region,regionAt(site.southKm));
    assert.ok(site.roadKm>3.0&&site.roadKm<7.0);
    assert.ok(site.altitudeM>=regionalHeight(
      regionalRiverX(site.southKm,7),site.southKm,7));
    assert.ok(site.wetRisk>=0&&site.wetRisk<=1);
    assert.ok(Math.min(
      Math.abs(site.xKm-roadCorridor(site.southKm,-1,7)),
      Math.abs(site.xKm-roadCorridor(site.southKm,1,7)))<2);
  }
  assert.notDeepEqual(settlementSites(7),settlementSites(8));
});
