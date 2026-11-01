import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {planEnvironmentalWear} from '../src/worldgen/environment-wear.ts';
test('MAP 10 environmental wear respects condition and room bounds',()=>{
 let seen=0,empty=0;
 for(let seed=1;seed<=50;seed++){
   const site=generateSite(seed);
   const marks=planEnvironmentalWear(site);
   assert.deepEqual(marks,planEnvironmentalWear(site));
   if(site.condition==='occupied'){assert.ok(marks.length<=2);empty++;}
   for(const mark of marks){
     seen++;
     const room=site.rooms.find(r=>r.id===mark.roomId);
     assert.ok(room);
     assert.ok(mark.x>=room.x&&mark.x<=room.x+room.w);
     assert.ok(mark.y>=room.y&&mark.y<=room.y+room.h);
     assert.ok(mark.width>0&&mark.depth>0);
   }
 }
 assert.ok(seen>0&&empty>0);
});
