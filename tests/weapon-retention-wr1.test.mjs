import test from 'node:test';import assert from 'node:assert/strict';
import {requestWeaponRetention,retentionReady,readSlingKind} from '../src/breach-weapon-retention.ts';
const base={sling:'two',primaryPresent:true,secondaryPresent:true,selected:'primary',action:'ordinary'};
const req=(p={})=>requestWeaponRetention({...base,...p});
test('WR1 ordinary and one-hand actions preserve support',()=>{
 assert.deepEqual(req(),{primary:'held-two',secondary:'holstered',hands:'none',blocked:null});
 assert.equal(req({action:'one-hand'}).primary,'held-one');
 assert.equal(req({action:'reload'}).primary,'held-two');
});
test('WR1 occupied regions and sling capabilities select only valid support',()=>{
 assert.equal(req({action:'hands-free',preferred:'side'}).primary,'front-slung');
 assert.equal(req({action:'hands-free',occupied:['front','side']}).primary,'back-slung');
 assert.equal(req({sling:'single',action:'hands-free',mobile:true,occupied:['front']}).blocked,'no-compatible-support');
 assert.equal(req({sling:'none',action:'hands-free'}).primary,'grounded');
 assert.equal(req({sling:'none',action:'hands-free',mobile:true}).blocked,'no-compatible-support');
});
test('WR1 secondary retains primary and hands-free holsters sidearm',()=>{
 assert.deepEqual(req({action:'switch-secondary'}),{primary:'front-slung',secondary:'held-two',hands:'none',blocked:null});
 assert.equal(req({selected:'secondary',action:'hands-free'}).secondary,'holstered');
 assert.equal(req({secondaryPresent:false,action:'switch-secondary'}).blocked,'no-secondary');
 assert.equal(req({primaryPresent:false,action:'switch-secondary'}).primary,'absent');
});
test('WR1 requests never constitute achieved custody',()=>{
 const target=req({action:'hands-free'});
 assert.equal(retentionReady(target,{primary:'held-two',secondary:'holstered'}),false);
 assert.equal(retentionReady(target,{primary:'front-slung',secondary:'holstered'}),true);
 const blocked=req({sling:'none',action:'hands-free',mobile:true});
 assert.equal(retentionReady(blocked,blocked),false);
 assert.equal(req({action:'surrender'}).primary,'relinquished');
 assert.equal(readSlingKind(undefined),'none');
 assert.equal(readSlingKind('sling-two-point'),'two');
});
