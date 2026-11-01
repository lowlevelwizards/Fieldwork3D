import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
test('structural half-walls and columns are physical cover with distinct canonical heights',()=>{
 const wall=propDefinition('half-wall'),post=propDefinition('support-column');
 assert.ok(wall&&post);
 assert.equal(wall.cover,'low');assert.equal(post.cover,'high');
 assert.ok(wall.height<post.height);
});
test('generated rooms may receive contextual partial-height structure without intersecting door approaches',()=>{
 let low=0,column=0;
 for(let seed=1;seed<=120;seed++){
  const site=generateSite(seed);
  for(const c of site.cover.filter(x=>['half-wall','support-column'].includes(x.fixture??''))){
   if(c.fixture==='half-wall'){low++;assert.equal(c.low,true);}
   else{column++;assert.equal(c.low,false);}
   assert.ok(site.doors.every(d=>Math.hypot(c.x-(d.a.x+d.b.x)/2,c.y-(d.a.y+d.b.y)/2)>=54));
  }
 }
 assert.ok(low>0&&column>0,'multiple building types should receive structural variety');
});
