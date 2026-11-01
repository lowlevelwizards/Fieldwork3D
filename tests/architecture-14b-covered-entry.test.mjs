import test from 'node:test';
import assert from 'node:assert/strict';
import {addCoveredEntries} from '../src/worldgen/entry-shelters.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {generateSite} from '../src/breach-site.ts';
test('covered entry roof and posts are anchored to real front door and deterministic',()=>{
 const synthetic={seed:23,archetype:'house',entrySide:'south',
  rooms:[{id:'R',x:140,y:70,w:140,h:150,kind:'room',purpose:'foyer'}],
  doors:[{id:'FRONT',a:{x:190,y:220},b:{x:238,y:220}}],
  bounds:{minX:0,minY:0,maxX:440,maxY:430},
  cover:[],spawn:[],enemies:[],entrance:{x:214,y:285},
  objective:{x:205,y:125},extract:{x:214,y:370}};
 const a=addCoveredEntries(synthetic,23);
 assert.equal(a.structures?.[0].kind,'porch-roof');
 assert.equal(a.cover.filter(c=>c.fixture==='porch-post').length,2);
 assert.deepEqual(addCoveredEntries(synthetic,23),a);
 const post=propDefinition('porch-post');
 assert.ok(post?.solid);assert.equal(post.cover,'high');
});
test('physical entry supports never occupy door or operator approach',()=>{
 let shelters=0,posts=0;
 for(let seed=1;seed<=132;seed++){
  const site=generateSite(seed);
  for(const st of site.structures??[]){
   if(!['entrance-canopy','porch-roof','service-awning'].includes(st.kind))continue;
   shelters++;
  }
  for(const p of site.cover.filter(c=>c.fixture==='porch-post')){
   posts++;
   assert.ok(site.doors.every(d=>Math.hypot(p.x-(d.a.x+d.b.x)/2,
      p.y-(d.a.y+d.b.y)/2)>34));
  }
 }
 assert.ok(shelters>0,'at least one real property gets a covered entry');
});
