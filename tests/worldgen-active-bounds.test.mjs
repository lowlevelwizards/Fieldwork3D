import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,activeWorldBounds,passable,route,W,H} from '../src/breach-core.ts';
test('runtime bounds are single authoritative coordinate envelope, with legacy fallback',()=>{
 const site=generateSite(17);
 assert.deepEqual(site.bounds,{minX:0,minY:0,maxX:W,maxY:H});
 activateSite({...site,bounds:{minX:-120,minY:-100,maxX:950,maxY:920},walls:[],cover:[]});
 try{
  assert.deepEqual(activeWorldBounds(),{minX:-120,minY:-100,maxX:950,maxY:920});
  assert.ok(passable({x:810,y:820}));
  assert.ok(passable({x:-80,y:-60}));
  assert.ok(!passable({x:960,y:820}));
  assert.ok(route({x:760,y:760},{x:810,y:820}).length>0);
 }finally{activateSite(null);}
 assert.deepEqual(activeWorldBounds(),{minX:0,minY:0,maxX:W,maxY:H});
 assert.ok(!passable({x:810,y:820}));
});
