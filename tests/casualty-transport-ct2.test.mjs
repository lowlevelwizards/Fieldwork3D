import test from 'node:test';import assert from 'node:assert/strict';
import {makeTransportContact,sampleTransportContact,transportContactDuration} from '../src/breach-transport-contact.ts';
import {beginRetentionTick} from '../src/breach-weapon-retention-live.ts';
test('CT2 pickup and release contact envelope is recorded and bounded',()=>{
 const body={id:'b',p:{x:12,y:4},heading:1};
 const c=makeTransportContact(7,body,'carry','pickup',.8);
 assert.equal(c.duration,1.45);assert.deepEqual(c.point,body.p);
 body.p.x=99;assert.equal(c.point.x,12);
 assert.ok(sampleTransportContact(c).bend>.9);
 assert.ok(sampleTransportContact(c).reach>.9);
 assert.equal(sampleTransportContact({...c,elapsed:c.duration}).bend,0);
 assert.ok(transportContactDuration('carry','release')>transportContactDuration('drag','release'));
});
test('CT2 slung primary stays retained throughout custody and returns after release',()=>{
 const a={health:4,carryingId:'b',weaponConfiguration:{slots:{sling:'sling-two-point'}},
 retentionTransition:{mode:'side-slung',desired:'side-slung',weight:1}};
 for(let i=0;i<120;i++)beginRetentionTick(a,1/60);
 assert.equal(a.retentionTransition.weight,1);
 assert.equal(a.retentionTransition.desired,'side-slung');
 a.carryingId=null;
 for(let i=0;i<120;i++)beginRetentionTick(a,1/60);
 assert.equal(a.retentionTransition,undefined);
});
