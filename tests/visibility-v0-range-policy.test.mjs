import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_UNITS_PER_METER,NEAR_FINE_SIGHT_RANGE,
 sightRangeForBounds,sightRangeForSite}
 from '../src/breach-visibility-range-policy.ts';

test('V0 sight is site-bounded rather than limited to historical CQB range',()=>{
 assert.equal(WORLD_UNITS_PER_METER,20);
 assert.equal(NEAR_FINE_SIGHT_RANGE,240);
 const lot={bounds:{minX:-300,minY:-400,maxX:900,maxY:1100}};
 const range=sightRangeForSite(lot);
 assert.ok(range>1900&&range<2000);
 assert.equal(sightRangeForSite(lot),range);
 assert.ok(sightRangeForBounds(lot.bounds)>NEAR_FINE_SIGHT_RANGE);
});
