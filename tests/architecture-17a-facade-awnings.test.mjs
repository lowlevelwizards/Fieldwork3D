import test from 'node:test';
import assert from 'node:assert/strict';
import {planFacadeAwnings} from '../src/worldgen/facade-awnings.ts';
import {generateSite} from '../src/breach-site.ts';
test('commercial awnings attach to a real exterior glazed opening',()=>{
 const fake={seed:4,archetype:'retail',rooms:[{id:'sales',kind:'room',x:90,y:90,w:180,h:130}],
  windows:[{id:'W0',x:166,y:220,width:72,vertical:false,style:'storefront'}],
  bounds:{minX:0,minY:0,maxX:420,maxY:420}};
 const awnings=planFacadeAwnings(fake);
 assert.equal(awnings.length,1);
 assert.equal(awnings[0].hostWindowId,'W0');
 assert.equal(awnings[0].y>220,true);
 assert.deepEqual(planFacadeAwnings(fake),awnings);
 assert.deepEqual(planFacadeAwnings({...fake,windows:[{...fake.windows[0],interior:true}]}),[]);
});
test('live generated awnings never invent openings or exceed playable bounds',()=>{
 let count=0;
 for(let seed=0;seed<180;seed++){
  const site=generateSite(seed);
  const awnings=planFacadeAwnings(site);
  count+=awnings.length;
  for(const awning of awnings){
   const host=site.windows?.find(w=>w.id===awning.hostWindowId);
   assert.ok(host&&!host.interior);
   assert.ok(awning.w>0&&awning.h>0);
   assert.ok(awning.x-awning.w/2>=(site.bounds?.minX??0));
   assert.ok(awning.y-awning.h/2>=(site.bounds?.minY??0));
  }
 }
 assert.ok(count>0);
});
