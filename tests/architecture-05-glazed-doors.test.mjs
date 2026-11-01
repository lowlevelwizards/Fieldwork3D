import test from 'node:test';
import assert from 'node:assert/strict';
import {doorBlocksSightRay,doorBlocksRay} from '../src/breach-core.ts';
import {generateSite} from '../src/breach-site.ts';
test('glazed leaf transmits sight but remains a physically closed door',()=>{
 const d={id:'GLAZED',a:{x:0,y:0},b:{x:48,y:0},open:false,openedAt:-1,style:'glazed'};
 const ray={a:{x:24,y:-20},b:{x:24,y:20}};
 assert.equal(doorBlocksSightRay([d],ray),false);
 assert.equal(doorBlocksRay([d],ray),true);
 assert.equal(doorBlocksSightRay([{...d,style:'steel'}],ray),true);
});
test('public commercial and paired entry doors use contextual glazed construction',()=>{
 let count=0;
 for(let seed=1;seed<=44;seed++){
  const site=generateSite(seed);
  for(const door of site.doors)if(door.style==='glazed'){
   count++;assert.notEqual(door.kind,'shutter');
   if(door.pairedWith)assert.equal(site.doors.find(x=>x.id===door.pairedWith)?.style,'glazed');
  }
 }
 assert.ok(count>=4);
});
