import test from 'node:test';import assert from 'node:assert/strict';
import {chooseCombatAction} from '../src/breach-ai-combat.ts';
const base={visible:true,remembered:true,laneClear:true,ammunition:10,suppression:0,morale:1};
test('defenders never shoot at merely remembered contacts',()=>{
 assert.equal(chooseCombatAction({...base,visible:false}),'investigate');
 assert.equal(chooseCombatAction({...base,laneClear:false}),'reposition');
 assert.equal(chooseCombatAction({...base,ammunition:0}),'reload');
 assert.equal(chooseCombatAction({...base,suppression:.9,morale:.3}),'withdraw');
 assert.equal(chooseCombatAction(base),'engage');
});
