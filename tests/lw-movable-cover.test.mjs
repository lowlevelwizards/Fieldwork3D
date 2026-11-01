import test from 'node:test';import assert from 'node:assert/strict';
import {relocateCover,canRelocateCover} from '../src/breach-movable-cover.ts';
test('small physical props move but do not overlap actors or change site input',()=>{
 const plan={x:100,y:100,w:20,h:20,fixture:'crate'};
 const pieces=[{...plan},{x:150,y:100,w:20,h:20,fixture:'table'}];
 assert.equal(relocateCover(pieces,0,{x:150,y:100},[],[],[]),false);
 assert.equal(relocateCover(pieces,0,{x:200,y:150},[],[],[{x:201,y:150}]),false);
 assert.equal(relocateCover(pieces,0,{x:205,y:150},[],[],[]),true);
 assert.equal(pieces[0].x,205);
 assert.equal(plan.x,100);
 assert.equal(canRelocateCover({x:0,y:0,w:150,h:80,fixture:'cabinet'}),false);
});
