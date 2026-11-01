import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {initializeWindows} from '../src/breach-windows.ts';
test('architectural window catalog has coherent high-sill and full-height semantics',()=>{
 let high=0,shop=0,variants=new Set();
 for(let seed=1;seed<=130;seed++){
  const site=generateSite(seed);
  for(const w of site.windows??[]){
   variants.add(w.style);
   if(w.style==='clerestory'){
    high++;assert.ok((w.sillHeight??0)>=25);
    assert.equal(initializeWindows([w])[0].operable,false);
    assert.ok(site.cover.some(c=>c.fixture==='window-sill'&&!c.low&&
      Math.hypot(c.x-w.x,c.y-w.y)<.01));
   }
   if(w.style==='storefront'){
    shop++;assert.equal(w.sillHeight,0);
    assert.ok(site.cover.some(c=>c.fixture==='glass-barrier'&&Math.hypot(c.x-w.x,c.y-w.y)<.01));
   }
  }
 }
 assert.ok(shop>0,'commercial fronts have full-height divided storefronts');
 assert.ok(variants.size>=5,'architectures produce several window families');
});
