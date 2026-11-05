import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveMovementFrame} from '../src/breach-movement-authority.ts';
test('E5-B5a neutral stationary body blocks physical operator intrusion',()=>{
 const decisions=resolveMovementFrame([
  {id:'rook',side:'blue',from:{x:0,y:0},to:{x:19,y:0},alive:true},
  {id:'civ:0',side:'neutral',from:{x:30,y:0},to:{x:30,y:0},alive:true}
 ],()=>true);
 assert.equal(decisions[0].blocked,'actor');
 assert.deepEqual(decisions[0].point,{x:0,y:0});
});
test('E5-B5a neutral bodies cannot swap or occupy one location',()=>{
 const decisions=resolveMovementFrame([
  {id:'civ:a',side:'neutral',from:{x:0,y:0},to:{x:20,y:0},alive:true},
  {id:'civ:b',side:'neutral',from:{x:30,y:0},to:{x:10,y:0},alive:true}
 ],()=>true);
 assert.ok(decisions.some(d=>d.blocked==='actor'));
 assert.ok(Math.hypot(
  decisions[0].point.x-decisions[1].point.x,
  decisions[0].point.y-decisions[1].point.y)>=19);
});
test('E5-B5a existing allied blue passing is unchanged',()=>{
 const decisions=resolveMovementFrame([
  {id:'rook',side:'blue',from:{x:0,y:0},to:{x:20,y:0},alive:true},
  {id:'moss',side:'blue',from:{x:30,y:0},to:{x:10,y:0},alive:true}
 ],()=>true);
 assert.deepEqual(decisions.map(d=>d.blocked),[null,null]);
});
