import test from 'node:test';import assert from 'node:assert/strict';
import {beginRetentionTick,prepareHandsFree,retentionBusy} from '../src/breach-weapon-retention-live.ts';
const actor=()=>({weaponConfiguration:{slots:{sling:'sling-two-point'}},reload:0,velocity:0,aim:0});
test('WR8 waits for achieved retention, then returns to held',()=>{
 const a=actor();assert.equal(prepareHandsFree(a,1/60),false);
 assert.equal(retentionBusy(a),true);
 for(let i=0;i<60;i++){beginRetentionTick(a,1/60);prepareHandsFree(a,1/60);}
 assert.equal(prepareHandsFree(a,1/60),true);
 for(let i=0;i<60;i++)beginRetentionTick(a,1/60);
 assert.equal(retentionBusy(a),false);
});
test('WR8 single point uses front, legacy unslung remains compatible',()=>{
 const a=actor();a.weaponConfiguration.slots.sling='sling-single-point';
 assert.equal(prepareHandsFree(a,1/60),false);assert.equal(a.retentionTransition.desired,'front-slung');
 const b=actor();b.weaponConfiguration.slots.sling='sling-none';
 assert.equal(prepareHandsFree(b,1/60),true);
});
