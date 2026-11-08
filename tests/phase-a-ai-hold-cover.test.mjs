import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCombatAction} from '../src/breach-ai-combat.ts';
import {contactTactic,shouldSeekHoldCover}
 from '../src/breach-ai-tactical-response.ts';

const ctx=(changes={})=>({visible:true,remembered:true,laneClear:true,
 ammunition:12,suppression:.63,morale:.95,temperament:'guard',...changes});

test('A4: pressured defender holds rather than leaving safety for a blocked shot',()=>{
 assert.equal(chooseCombatAction(ctx({laneClear:false})),'hold');
 assert.equal(contactTactic('hold',true).holdFire,true);
 assert.equal(contactTactic('hold',false).seekCover,true);
 assert.equal(chooseCombatAction(ctx({suppression:.05,laneClear:false})),'reposition',
  'low-pressure blocked weapon still seeks a legal firing position');
});

test('A4: credible retreat still outranks HOLD when morale collapses',()=>{
 assert.equal(chooseCombatAction(ctx({suppression:.91,morale:.2,laneClear:false})),'withdraw');
});

test('A4: cover lookup happens only with no committed destination and cooldown ready',()=>{
 assert.equal(shouldSeekHoldCover('hold',false,10,9),true);
 assert.equal(shouldSeekHoldCover('hold',true,10,9),false);
 assert.equal(shouldSeekHoldCover('hold',false,8,9),false);
 assert.equal(shouldSeekHoldCover('reposition',false,10,9),false);
 assert.equal(shouldSeekHoldCover('hold',false,NaN,9),false);
});
