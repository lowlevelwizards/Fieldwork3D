import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCombatAction} from '../src/breach-ai-combat.ts';
const base={visible:true,remembered:true,laneClear:true,
 ammunition:9,suppression:.65,morale:.5};

test('cautious, guard and aggressive defenders respond distinctly to pressure',()=>{
 assert.equal(chooseCombatAction({...base,temperament:'cautious'}),'withdraw');
 assert.equal(chooseCombatAction({...base,temperament:'guard'}),'hold');
 assert.equal(chooseCombatAction({...base,temperament:'aggressor'}),'engage');
});
test('no personality can shoot remembered-only targets or through blocked lanes',()=>{
 for(const temperament of ['cautious','guard','aggressor']){
  assert.equal(chooseCombatAction({...base,temperament,visible:false}),
   'investigate');
  assert.equal(chooseCombatAction({...base,temperament,laneClear:false,
   suppression:0,morale:1}),'reposition');
  assert.equal(chooseCombatAction({...base,temperament,ammunition:0,
   suppression:0,morale:1}),'reload');
 }
});
test('guard defaults remain backward-compatible',()=>{
 const input={...base,visible:true};
 assert.equal(chooseCombatAction(input),
  chooseCombatAction({...input,temperament:'guard'}));
});
