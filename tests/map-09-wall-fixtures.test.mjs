import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
test('MAP 09 wall fittings attach to real room boundaries without nav geometry',()=>{
 const kinds=new Set(assetLibrary().filter(a=>a.id.startsWith('wall-detail:')).map(x=>x.id));
 assert.equal(kinds.size,7);
 let count=0;
 for(let seed=1;seed<=30;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.wallDetails,b.wallDetails);
  for(const item of a.wallDetails??[]){
   count++;
   assert.ok(a.rooms.some(r=>r.id===item.roomId));
   assert.ok(Number.isFinite(item.x)&&Number.isFinite(item.y));
   assert.ok(item.width>0&&item.depth>0);
   assert.ok(kinds.has('wall-detail:'+item.kind));
  }
 }
 assert.ok(count>0);
});
