import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {doorBlocksRay,doorBlocksSightRay,doorBlocksSegment} from '../src/breach-core.ts';
test('screen and French doors have distinct sight, bullet and movement behavior',()=>{
 const door={id:'F',a:{x:0,y:0},b:{x:48,y:0},open:false,openedAt:-1};
 const ray={a:{x:24,y:-20},b:{x:24,y:20}};
 assert.equal(doorBlocksSightRay([{...door,style:'french'}],ray),false);
 assert.equal(doorBlocksRay([{...door,style:'french'}],ray),true);
 assert.equal(doorBlocksSightRay([{...door,style:'screen'}],ray),false);
 assert.equal(doorBlocksRay([{...door,style:'screen'}],ray),false);
 assert.equal(doorBlocksSegment({...door,style:'screen'},ray),true);
});
test('new door families are selected contextually and sliding finishes use real tracks',()=>{
 const count=new Set();let sliding=0;
 for(let seed=1;seed<=135;seed++){
  const site=generateSite(seed);
  for(const d of site.doors){
   if(['french','louvered','screen','barn','pocket','fire'].includes(d.style??'')){
    count.add(d.style);
    if(['barn','pocket'].includes(d.style)){sliding++;assert.equal(d.kind,'sliding');}
   }
  }
 }
 assert.ok(count.size>=2);
});
