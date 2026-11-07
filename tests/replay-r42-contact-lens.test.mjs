import test from 'node:test';
import assert from 'node:assert/strict';
import {operatorContactEventKnown,operatorContactAvailable}
  from '../src/breach-replay-contact-lens.ts';

const friendly=new Set(['rook','moss','ash','vale']);
const event=(actor,kind='shot',source='battle')=>({
  key:'e:1',order:1,source,t:4,actor,kind,text:'recorded',p:{x:20,y:20}
});
const known=(rooks=[],moss=[])=>({
  visibleActorIds:['hostile-a','hostile-b'],
  visibleCivilianIds:[],discoveredBodyIds:[],
  operatorVisibleActorIds:{rook:rooks,moss}
});
test('operator lens uses observer-specific evidence, not team visibility',()=>{
  const k=known(['hostile-a'],['hostile-b']);
  assert.equal(operatorContactEventKnown(event('hostile-a'),k,'rook',friendly),true);
  assert.equal(operatorContactEventKnown(event('hostile-b'),k,'rook',friendly),false);
  assert.equal(operatorContactEventKnown(event('hostile-a'),k,'moss',friendly),false);
  assert.equal(operatorContactEventKnown(event('hostile-b'),k,'moss',friendly),true);
});
test('friendly intel reports do not reveal hidden named opponents',()=>{
  const k=known([]);
  assert.equal(operatorContactEventKnown(event('rook','intel'),k,'rook',friendly),false);
  assert.equal(operatorContactEventKnown(event('moss','intel'),k,'rook',friendly),false);
  assert.equal(operatorContactEventKnown(event('rook','shot'),k,'rook',friendly),true);
  assert.equal(operatorContactEventKnown(event('rook','blocked','execution'),k,'rook',friendly),true);
  assert.equal(operatorContactEventKnown(event('moss','shot'),k,'rook',friendly),false);
  assert.equal(operatorContactEventKnown(event(undefined,'objective'),k,'rook',friendly),false);
});
test('legacy replay has no fictitious observer evidence',()=>{
  const old={visibleActorIds:['hostile-a'],
    visibleCivilianIds:[],discoveredBodyIds:[]};
  assert.equal(operatorContactAvailable(old,'rook'),false);
  assert.equal(operatorContactEventKnown(event('hostile-a'),old,'rook',friendly),false);
  assert.equal(operatorContactEventKnown(event('hostile-a'),null,'rook',friendly),false);
  assert.equal(operatorContactAvailable(known([]),'rook'),true);
  assert.equal(operatorContactAvailable(known([]),'ash'),false);
});
