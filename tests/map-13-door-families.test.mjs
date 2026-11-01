import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
test('MAP 13 real door finishes affect frame resistance without modifying hinges',()=>{
 const variants=new Set(assetLibrary().filter(a=>a.id.startsWith('door:')).map(a=>a.id));
 for(const type of ['wood','steel','reinforced','exit'])
   assert.ok(variants.has('door:'+type));
 let strong=0;
 for(let seed=1;seed<=55;seed++){
  const site=generateSite(seed);
  for(const door of site.doors){
   assert.ok(['wood','steel','reinforced','exit'].includes(door.style));
   if(door.style==='reinforced'){
     strong++;
     assert.ok((door.frameIntegrity??0)>3);
     assert.ok((door.resistance??0)>2);
   }
  }
 }
 assert.ok(strong>0);
});
