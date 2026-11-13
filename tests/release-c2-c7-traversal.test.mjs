import test from 'node:test';import assert from 'node:assert/strict';
import {motorTraversalWorld,plausibleMotorTraversal}
 from '../src/breach-motor-traversal.ts';
import {newSession,team} from '../src/breach-game.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {activateSite} from '../src/breach-core.ts';
test('C7: one active traversal occupancy scan preserves positions and landing reservations',()=>{
 try{
  const s=newSession(),a=team(s)[0],b=team(s)[1];
  const original=[...s.operators];
  b.traversal={landing:{x:b.p.x+19,y:b.p.y+1}};
  const group=motorTraversalWorld(s,a);
  assert.equal(group.actors.some(p=>p===b.p),true);
  assert.equal(group.actors.some(p=>p===b.traversal.landing),true);
  assert.equal(group.actors.length,original.filter(p=>p!==a&&p.health>0).length+1);
  assert.equal(group.canStand,sessionWorldGeometry(s).passable);
  assert.equal(s.operators.length,original.length);
 }finally{activateSite(null);}
});
test('C7: conservative AABB does not reject a true known obstacle crossing',()=>{
 const cover=[{fixture:'crate',x:101,y:100,w:20,h:18,low:true},
  {fixture:'crate',x:101,y:230,w:20,h:18,low:true}];
 assert.equal(plausibleMotorTraversal({x:50,y:100},{x:180,y:100},
  new Set([0]),cover,[]),true);
 assert.equal(plausibleMotorTraversal({x:50,y:100},{x:180,y:100},
  new Set([1]),cover,[]),false);
});
