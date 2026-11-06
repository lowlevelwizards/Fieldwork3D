import test from 'node:test';
import assert from 'node:assert/strict';
import {operationBrief} from '../src/breach-operations.ts';
import {createOperationDossier,presentOperationDossier}
  from '../src/briefing/briefing-composer.ts';
import {validateOperationDossier}
  from '../src/briefing/briefing-validation.ts';
const sample=(kind='capture',intelMode='exterior-known',hostileCount=4)=>({
 schema:1,seed:87,missionKind:kind,building:'house',subtype:'bungalow',
 siteName:'Pine Residence',scale:'standard',propertyCondition:'occupied',
 premise:'hideout',encounterProfile:'prepared',risk:1,riskFromContract:false,
 intelMode,roomCount:7,hostileCount,
 armedProfileCount:{ordinary:hostileCount,security:0,prepared:0},
 activeCivilianCount:0,rescueTargetPresent:true,captureTargetPresent:true,
 objective:operationBrief(kind),entryId:'FRONT'
});
test('B3/B4: same mission identity produces same dossier',()=>{
 const facts=sample();
 const one=createOperationDossier(facts,{quality:'high',style:'dispatch'});
 assert.deepEqual(createOperationDossier(facts,{quality:'high',style:'dispatch'}),one);
 assert.equal(validateOperationDossier(facts,one).length,0);
 for(const key of ['brief','standard','detailed']){
  assert.match(presentOperationDossier(one,key),/OBJECTIVE/);
  assert.match(presentOperationDossier(one,key),/EXTRACTION/);
 }
});
test('B3: architectural intel mode gates only architectural claims',()=>{
 const blind=createOperationDossier(sample('capture','true-blind'),{quality:'high'});
 assert.equal(blind.claims.some(c=>c.id==='floor-plan'),false);
 assert.equal(blind.claims.some(c=>c.disclosure==='floor-plan'),false);
 const floor=createOperationDossier(sample('capture','floor-plan'),{quality:'low'});
 assert.ok(floor.claims.some(c=>c.id==='floor-plan'));
 assert.ok(floor.claims.some(c=>c.id==='threat'&&c.confidence==='unknown'));
});
test('B3: no fake civilian contact when no live civilian exists',()=>{
 const dossier=createOperationDossier(sample(),{quality:'high'});
 assert.equal(dossier.claims.some(c=>c.id==='civilian-presence'),false);
 assert.ok(dossier.claims.some(c=>c.id==='prepared-resistance'));
});
test('B4: varied writing and intel do not modify physical mission truth',()=>{
 const truth=sample();
 const before=structuredClone(truth);
 const a=createOperationDossier(truth,{quality:'low',style:'dispatch'});
 const b=createOperationDossier(truth,{quality:'high',style:'intelligence'});
 assert.notDeepEqual(a.rendered.standard,b.rendered.standard);
 assert.deepEqual(truth,before);
 assert.deepEqual(a.contract,b.contract);
});
test('B4: all objectives have truthful functional fallback',()=>{
 for(const kind of ['clear','intel','rescue','hold','capture']){
  const facts=sample(kind,'true-blind',0);
  const dossier=createOperationDossier(facts,{forceIncidentId:'generic-'+kind});
  assert.equal(dossier.contract.objective,operationBrief(kind).objective);
  assert.equal(validateOperationDossier(facts,dossier).length,0);
 }
});
