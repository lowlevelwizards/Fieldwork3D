import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/ui/campaign-outfitter-gallery.ts',import.meta.url),'utf8');

test('same-slot reselect preserves cards, scroll and async thumbnail generation',()=>{
 assert.match(src,/let renderedSlot:LoadoutSlot\|null=null/);
 assert.match(src,/if\(disposed\)return;\s*[\s\S]*?if\(renderedSlot===slot\)return;\s*renderedSlot=slot/);
 const show=src.slice(src.indexOf(' const show=(slot:LoadoutSlot)=>{'));
 assert.ok(show.indexOf('if(renderedSlot===slot)return')>=0);
 for(const expensive of ['thumbnailGeneration++','observer?.disconnect()',
  'rail.replaceChildren()','choices=equipmentChoices(slot)']){
  const pos=show.indexOf(expensive);
  assert.ok(pos>show.indexOf('if(renderedSlot===slot)return'),
   expensive+' must be skipped by a same-category tap');
 }
});

test('different-category selections and first display still render full choices',()=>{
 assert.match(src,/let renderedSlot:LoadoutSlot\|null=null/);
 assert.match(src,/renderedSlot=slot;\s*active=slot;root\.dataset\.slot=slot/);
 assert.match(src,/choices=equipmentChoices\(slot\)/);
 assert.match(src,/const selected=choices\.find/);
 assert.match(src,/if\(selected\)selectChoice\(selected,false\)/);
});

test('gallery owner still commits equipment through authoritative handlers',()=>{
 const campaign=readFileSync(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');
 const quick=readFileSync(new URL('../src/ui/quick-play-configurator.ts',import.meta.url),'utf8');
 assert.match(campaign,/this\.outfitterGallery=gallery/);
 assert.match(quick,/squadGallery=gallery/);
 assert.match(src,/options\.onEquip\(active,choice\.id\)/);
 assert.match(src,/tile\.disabled=!choice\.issued/);
});
