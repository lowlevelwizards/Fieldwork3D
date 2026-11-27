import test from 'node:test';import assert from 'node:assert/strict';
import {proposeDragTrail} from '../src/breach-drag-trail.ts';
test('CT4 follows actual corner path and does not drift at rest',()=>{
 let body={x:0,y:0},from={x:25,y:0},trail;
 for(const to of [{x:30,y:0},{x:35,y:0},{x:35,y:5},{x:35,y:10},{x:35,y:20}]){
  const p=proposeDragTrail('b',body,from,to,trail,()=>true);
  assert.ok(p);body=p.point;trail=p.trail;from=to;
 }
 assert.equal(body.y,0);assert.ok(body.x>0);
 const stopped=proposeDragTrail('b',body,from,from,trail,()=>true);
 assert.deepEqual(stopped.point,body);assert.equal(stopped.trail,trail);
 assert.equal(proposeDragTrail('b',body,from,{x:35,y:25},trail,()=>false),null);
});
