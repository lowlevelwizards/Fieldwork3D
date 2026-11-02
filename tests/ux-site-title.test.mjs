import test from 'node:test';
import assert from 'node:assert/strict';
import {compactSiteTitle} from '../src/ui/site-title.ts';
test('compact title strips procedural qualifiers',()=>{
 assert.equal(compactSiteTitle({name:'U-SHAPED FLEET SHOP / PROGRAM-O / SERVICED',archetype:'garage'}),'FLEET SHOP');
 assert.equal(compactSiteTitle({name:'DEEP-NARROW / SIDE PASSAGE / COMPACT',archetype:'apartment'}),'APARTMENT');
 assert.equal(compactSiteTitle({name:'NAME / HIDDEN DETAILS',archetype:'office'}),'NAME');
 assert.equal(compactSiteTitle(null),'CUTWOODS');
});
