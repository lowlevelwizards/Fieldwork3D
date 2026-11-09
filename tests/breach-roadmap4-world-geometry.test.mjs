import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {WALLS,activateSite} from '../src/breach-core.ts';
import {worldGeometryForQuery} from '../src/breach-world-context.ts';
test('session geometry remains stable as active site binding changes',()=>{
 const a=newSession(),world=worldGeometryForQuery(a);
 const before=JSON.stringify(world.walls);
 const previous=JSON.stringify(WALLS);
 try{
  activateSite(null);
  assert.equal(JSON.stringify(worldGeometryForQuery(a).walls),before);
  assert.equal(world.cover,a.coverState);
  assert.equal(worldGeometryForQuery(a).cover,a.coverState);
 }finally{
  if(a.site)activateSite(a.site);
 }
 assert.equal(JSON.stringify(WALLS),previous);
});
