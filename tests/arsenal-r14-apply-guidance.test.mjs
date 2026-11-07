import test from 'node:test';
import assert from 'node:assert/strict';
import {arsenalApplyMessage} from '../src/arsenal/apply-guidance.ts';
test('Campaign credits are disclosed even when a preview cannot yet be purchased',()=>{
 assert.match(arsenalApplyMessage({
  valid:true,canCommit:false,reason:'Insufficient credits',cost:120}),/120 CR total/);
 assert.match(arsenalApplyMessage({
  valid:false,canCommit:false,reason:'Swap weapon class in the Armory first'}),/Armory first/);
 assert.match(arsenalApplyMessage({valid:true,canCommit:true,cost:80}),/80 CR on Apply/);
});
test('Quick Play class changes warn about magazines without claiming a purchase',()=>{
 assert.match(arsenalApplyMessage({valid:true,changesClass:true}),/magazines will reset/);
 assert.match(arsenalApplyMessage({valid:true,cost:0}),/NO PURCHASE NEEDED/);
});
