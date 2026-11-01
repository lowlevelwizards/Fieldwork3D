import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseEncounterPremise} from '../src/worldgen/encounter-premises.ts';
test('premises reproducible, overrideable and varied within a building class',()=>{
 const site={archetype:'restaurant',identity:{activity:'normal',condition:'occupied'},seed:777};
 assert.equal(chooseEncounterPremise(site),chooseEncounterPremise(site));
 assert.equal(chooseEncounterPremise(site,{premise:'hideout'}),'hideout');
 const all=new Set(Array.from({length:80},(_,i)=>
   chooseEncounterPremise({...site,seed:i+11},{mission:'clear',risk:2})));
 assert.ok(all.size>=4,'premise variation should exceed four different families');
});
test('vacant property makes vacant premise more likely without forcing it',()=>{
 const sample=(condition)=>Array.from({length:180},(_,i)=>
   chooseEncounterPremise({archetype:'warehouse',seed:101+i,
     identity:{activity:'quiet',condition}},{mission:'clear'}))
   .filter(x=>x==='vacant').length;
 assert.ok(sample('vacant')>sample('occupied'));
});
