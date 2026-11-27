import test from 'node:test';import assert from 'node:assert/strict';
import {deriveWeaponRetentionSockets} from '../src/weapons/geometry/weapon-retention-sockets.ts';
const box=(minX,maxX,z=2)=>({min:{x:minX,y:-2,z:-z},max:{x:maxX,y:2,z}});
const receiver=box(-6,4);
test('WR2.0 sockets follow installed art rather than fixed family offsets',()=>{
 const a=deriveWeaponRetentionSockets({receiver,stock:box(-15,-6),handguard:box(4,14)});
 const b=deriveWeaponRetentionSockets({receiver,stock:box(-9,-6),handguard:box(4,8,1.5)});
 assert.ok(a.rear.x<b.rear.x);
 assert.ok(a.front.x>b.front.x);
 assert.equal(b.front.z,1.5);
 assert.deepEqual(a.single,b.single);
});
test('WR2.0 stockless and absent front art are explicit',()=>{
 const a=deriveWeaponRetentionSockets({receiver});
 assert.deepEqual(a.supported,['single']);
 assert.equal(a.front,null);
 assert.ok(a.rear.x>=receiver.min.x);
 assert.equal(deriveWeaponRetentionSockets({receiver:box(4,4)}),null);
});
