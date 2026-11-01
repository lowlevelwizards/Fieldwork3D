import test from 'node:test';
import assert from 'node:assert/strict';
import {addCoveredEntry} from '../src/worldgen/covered-entries.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
test('entry canopy has an overhead span and two physically blocking supported posts',()=>{
 const s={archetype:'retail',entrySide:'south',seed:4,
  rooms:[{id:'R',kind:'room',purpose:'sales',x:50,y:40,w:200,h:180}],
  doors:[{id:'FRONT',a:{x:125,y:220},b:{x:175,y:220},open:false}],
  cover:[],structures:[],spawn:[],enemies:[],
  entrance:{x:150,y:273},objective:{x:110,y:110},extract:{x:150,y:350},
  bounds:{minX:0,minY:0,maxX:500,maxY:500}};
 const out=addCoveredEntry(s,4);
 assert.equal(out.structures?.length,1);
 assert.equal(out.structures[0].kind,'entry-canopy');
 const posts=out.cover.filter(o=>o.fixture==='canopy-post');
 assert.equal(posts.length,2);
 assert.ok(posts.every(p=>p.low===false&&p.y>220));
 assert.equal(propDefinition('canopy-post')?.cover,'high');
 assert.equal(assetLibrary().find(x=>x.id==='canopy-post')?.solid,true);
 assert.deepEqual(addCoveredEntry(out,4),out,'idempotent structural generation');
 assert.equal(s.cover.length,0);
});
test('entrance canopy respects obstructions and never forces posts into protected approaches',()=>{
 const base={archetype:'office',entrySide:'south',rooms:[],
  doors:[{id:'FRONT',a:{x:75,y:200},b:{x:123,y:200}}],
  cover:[],structures:[],spawn:[],enemies:[],
  entrance:{x:99,y:244},objective:{x:99,y:80},extract:{x:99,y:350},
  bounds:{minX:0,minY:0,maxX:400,maxY:400}};
 const normal=addCoveredEntry(base,3);
 assert.equal(normal.structures?.length,1);
 const obstructed=addCoveredEntry({...base,cover:[{x:52,y:244,w:20,h:20,fixture:'crate'}]},3);
 assert.equal(obstructed.structures?.length,0);
});
