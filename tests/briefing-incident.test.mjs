import test from 'node:test';
import assert from 'node:assert/strict';
import {operationBrief} from '../src/breach-operations.ts';
import {mixBriefingSeed,briefingRng} from '../src/briefing/briefing-seed.ts';
import {INCIDENTS,eligibleIncidents,isIncidentEligible} from '../src/briefing/incident-catalog.ts';
import {selectIncident} from '../src/briefing/incident-director.ts';

const truth=(kind,building='house',premise='hideout')=>({
 schema:1,seed:177,missionKind:kind,building,subtype:'family-home',
 siteName:'EXAMPLE',scale:'small',propertyCondition:'occupied',
 premise,encounterProfile:'prepared',risk:2,riskFromContract:false,
 intelMode:'exterior-known',roomCount:7,hostileCount:3,
 armedProfileCount:{ordinary:2,security:1,prepared:0},
 activeCivilianCount:0,rescueTargetPresent:true,captureTargetPresent:true,
 objective:operationBrief(kind),entryId:'FRONT'
});
test('B1: deterministic narrative RNG and independent salt',()=>{
 const a=Array.from({length:5},()=>briefingRng(mixBriefingSeed(88,10))());
 assert.equal(new Set(a).size,1);
 assert.notEqual(mixBriefingSeed(88,10),mixBriefingSeed(88,11));
});
test('B2: all five missions retain a selectable safe fallback',()=>{
 for(const kind of ['clear','intel','rescue','hold','capture']){
  const sample=truth(kind);
  assert.ok(eligibleIncidents(sample).some(x=>x.id==='generic-'+kind));
  assert.equal(selectIncident(sample,{forceIncidentId:'generic-'+kind}).id,'generic-'+kind);
 }
});
test('B2: location, premise and objective prevent mismatched incident selection',()=>{
 assert.equal(isIncidentEligible(truth('capture','warehouse'),INCIDENTS[0]),false);
 assert.equal(isIncidentEligible(truth('rescue','house','defensive'),INCIDENTS[1]),false);
 assert.equal(isIncidentEligible(truth('intel','warehouse'),INCIDENTS[2]),true);
 assert.equal(selectIncident(truth('clear'),{forceIncidentId:'warrant-service'}).id,'generic-clear');
});
test('B2: seeded selection survives repetition and recent-history filtering',()=>{
 const sample=truth('capture');
 const first=selectIncident(sample).id;
 assert.equal(selectIncident(sample).id,first);
 assert.equal(selectIncident(sample,{recentIds:['warrant-service']}).id,
  selectIncident(sample,{recentIds:['warrant-service']}).id);
});
