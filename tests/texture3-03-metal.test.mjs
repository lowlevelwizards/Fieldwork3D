import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {fixtureComponentSurface} from '../src/worldgen/pixel-surface-selection.ts';
test('formed steel, enamel, painted and corrugated materials have distinct construction',()=>{
 const kinds=['painted-metal','industrial-steel','corrugated-metal','enamel-metal'];
 const samples=kinds.map(k=>pixelPattern(k));
 for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++)
  assert.notDeepEqual(samples[i],samples[j],kinds[i]+' / '+kinds[j]);
 assert.equal(fixtureComponentSurface('dumpster','body'),'painted-metal');
 assert.equal(fixtureComponentSurface('shipping-container','body'),'corrugated-metal');
});
