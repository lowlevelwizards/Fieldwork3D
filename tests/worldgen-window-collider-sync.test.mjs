import test from 'node:test';
import assert from 'node:assert/strict';
import {synchronizeWindowBarriers} from '../src/worldgen/window-collider-sync.ts';
test('one authoritative physical barrier per window with no orphan sills',()=>{
 const site={windows:[
  {id:'a',x:120,y:80,width:52,vertical:false},
  {id:'b',x:340,y:92,width:86,vertical:true,sillHeight:0}],
  cover:[{x:120,y:80,w:52,h:10,fixture:'window-sill'},
   {x:140,y:180,w:30,h:15,fixture:'window-sill'},
   {x:340,y:92,w:10,h:86,fixture:'glass-barrier'},
   {x:340,y:92,w:10,h:86,fixture:'window-sill'},
   {x:340,y:92,w:10,h:86,fixture:'window-boards'},
   {x:70,y:25,w:50,h:20,fixture:'counter'}]};
 const fixed=synchronizeWindowBarriers(site);
 assert.deepEqual(fixed.cover.map(o=>o.fixture),[
  'window-boards','counter','window-sill','glass-barrier']);
 assert.deepEqual(fixed.cover.slice(-2).map(o=>[o.x,o.y,o.w,o.h]),
   [[120,80,52,10],[340,92,10,86]]);
 assert.deepEqual(synchronizeWindowBarriers(fixed),fixed);
});
