import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
test('MAP 08 recognizes floor textiles without collisions',()=>{
 const ids=new Set(assetLibrary().map(a=>a.id));
 for(const name of ['rug','bedside-rug','bath-mat','welcome-mat','runner'])
   assert.ok(ids.has('detail:'+name));
 let count=0;
 for(let seed=1;seed<=66;seed++){
  const site=generateSite(seed);
  for(const d of site.dressing??[]){
   if(!['rug','bedside-rug','bath-mat','welcome-mat','runner'].includes(d.kind))continue;
   count++;
   assert.equal(d.placement,'floor');
   assert.equal(d.elevation,0);
   assert.ok((d.width??0)>0&&(d.depth??0)>0);
   assert.ok(site.rooms.some(room=>room.id===d.roomId));
  }
 }
 assert.ok(count>0);
});
