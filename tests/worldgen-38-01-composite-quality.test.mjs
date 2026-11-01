import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreCompositeQuality} from '../src/worldgen/composite-quality.ts';
const base={errors:[],designQuality:{score:0},incompleteZones:[],
 serviceIssues:[],operationalRouteIssues:[],spaceQuality:{
 crowdedRoomIds:[],doorApproachIssues:[]},
 accessibilityQuality:{issues:[]},humanJourneys:{issues:[]},
 routeFriction:{warnings:[]}};
test('scoring prefers playable coherent buildings and gives dimensions',()=>{
 const quality=scoreCompositeQuality(base);
 assert.equal(quality.score,100);
 assert.equal(quality.grade,'good');
 assert.deepEqual(Object.keys(quality.signals),
  ['playability','function','circulation','spatial']);
});
test('unreachable or blocked maps cannot receive a strong report card',()=>{
 const damaged={...base,errors:['objective unreachable','operator invalid'],
  incompleteZones:['R1','R2'],spaceQuality:{
    crowdedRoomIds:['R3'],doorApproachIssues:[{doorId:'D1'}]
  }};
 const result=scoreCompositeQuality(damaged);
 assert.equal(result.grade,'critical');
 assert.ok(result.score<70);
 assert.ok(result.notes.length>0);
 assert.deepEqual(result,scoreCompositeQuality(damaged));
});
test('several small circulation issues lower the score without claiming code compliance',()=>{
 const variant={...base,routeFriction:{warnings:['tight','detour']},
  humanJourneys:{issues:[{name:'worker'},{name:'resident'}]}};
 const quality=scoreCompositeQuality(variant);
 assert.ok(quality.score<100&&quality.score>65);
 assert.ok(quality.signals.circulation<quality.signals.playability);
});
