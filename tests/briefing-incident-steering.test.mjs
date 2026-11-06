import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseGenerationIncidentIntent} from '../src/briefing/incident-intent.ts';
import {chooseEncounterPremise} from '../src/worldgen/encounter-premises.ts';
import {chooseEncounterProfile} from '../src/worldgen/encounter-profiles.ts';

const sample={seed:117,archetype:'house',
 identity:{activity:'normal',condition:'occupied'},condition:'occupied'};
test('B5: intent is seed-stable and cannot force an ineligible mission or property',()=>{
 assert.equal(chooseGenerationIncidentIntent(117,'house','capture','warrant-service'),'warrant-service');
 assert.equal(chooseGenerationIncidentIntent(117,'warehouse','capture','warrant-service'),'generic-capture');
 assert.notEqual(chooseGenerationIncidentIntent(117,'house','clear','warrant-service'),'warrant-service');
 assert.equal(chooseGenerationIncidentIntent(117,'house','rescue','missing-person'),'missing-person');
 assert.equal(chooseGenerationIncidentIntent(117,'house','rescue'),
   chooseGenerationIncidentIntent(117,'house','rescue'));
});
test('B5: default premise/profile sampling remains identical without the opt-in',()=>{
 const baseline=Array.from({length:50},(_,seed)=>chooseEncounterPremise({...sample,seed},{mission:'capture'}));
 const off=Array.from({length:50},(_,seed)=>chooseEncounterPremise({...sample,seed},{
   mission:'capture',enableIncidentIntent:false,incidentId:'warrant-service'}));
 assert.deepEqual(off,baseline);
 for(let seed=0;seed<50;seed++)
   assert.equal(chooseEncounterProfile('guarded',seed,'capture'),
     chooseEncounterProfile('guarded',seed,'capture',undefined));
});
test('B5: opted-in incident changes plausible encounter weighting',()=>{
 const baseline=Array.from({length:160},(_,seed)=>
   chooseEncounterProfile('routine',seed,'capture'));
 const warranted=Array.from({length:160},(_,seed)=>
   chooseEncounterProfile('routine',seed,'capture','warrant-service'));
 const freq=(xs,k)=>xs.filter(x=>x===k).length;
 assert.ok(freq(warranted,'prepared')>freq(baseline,'prepared'));
 const opted=Array.from({length:120},(_,seed)=>chooseEncounterPremise({...sample,seed},{
   mission:'capture',enableIncidentIntent:true,incidentId:'warrant-service'}));
 const normal=Array.from({length:120},(_,seed)=>chooseEncounterPremise({...sample,seed},{
   mission:'capture'}));
 const favored=(xs)=>xs.filter(x=>['hideout','guarded'].includes(x)).length;
 assert.ok(favored(opted)>favored(normal),'intent should increase compatible premises');
});
