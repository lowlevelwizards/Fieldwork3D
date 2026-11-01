import test from 'node:test';
import assert from 'node:assert/strict';
import {isArchitecturalSillCover} from '../src/worldgen/architectural-cover-visuals.ts';
import {generateSite} from '../src/breach-site.ts';

test('only coincident aperture sills suppress duplicate render geometry',()=>{
 const site={
  windows:[{id:'W',x:20,y:40,width:32,vertical:false,sillHeight:0}],
  openings:[{id:'S',a:{x:60,y:40},b:{x:100,y:40},kind:'serving'},
    {id:'A',a:{x:110,y:40},b:{x:150,y:40},kind:'arch'}],
 };
 assert.equal(isArchitecturalSillCover(site,{x:20,y:40,fixture:'glass-barrier'}),true);
 assert.equal(isArchitecturalSillCover(site,{x:20,y:40,fixture:'window-sill'}),true);
 assert.equal(isArchitecturalSillCover(site,{x:80,y:40,fixture:'window-sill'}),true);
 assert.equal(isArchitecturalSillCover(site,{x:80,y:40,fixture:'crate'}),false);
 assert.equal(isArchitecturalSillCover(site,{x:130,y:40,fixture:'window-sill'}),false);
 assert.equal(isArchitecturalSillCover(site,{x:25,y:40,fixture:'window-sill'}),false);
 assert.equal(isArchitecturalSillCover(site,{x:80,y:41,fixture:'window-sill'}),false);
});

test('seeded aperture barriers remain physical but do not draw over themselves',()=>{
 let found=0;
 for(let seed=1;seed<=45;seed++){
  const site=generateSite(seed);
  for(const cover of site.cover){
   if(cover.fixture!=='window-sill'&&cover.fixture!=='glass-barrier')continue;
   const physical=site.windows?.some(w=>Math.hypot(w.x-cover.x,w.y-cover.y)<.75)||
     site.openings?.some(o=>o.kind==='serving'&&
       Math.hypot((o.a.x+o.b.x)/2-cover.x,
         (o.a.y+o.b.y)/2-cover.y)<.75);
   if(physical){
    found++;
    assert.equal(isArchitecturalSillCover(site,cover),true);
    assert.ok(site.cover.includes(cover),'collision cover must be retained');
   }
  }
 }
 assert.ok(found>0,'seeded sites should include physical architectural sills');
});
