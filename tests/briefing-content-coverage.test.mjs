import test from 'node:test';
import assert from 'node:assert/strict';
import {INCIDENTS,isIncidentEligible,eligibleIncidents} from '../src/briefing/incident-catalog.ts';
import {operationBrief} from '../src/breach-operations.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {validateOperationDossier} from '../src/briefing/briefing-validation.ts';

const sample=(d,seed=1)=>({
 schema:1,seed,missionKind:d.missions[0],building:d.buildings?.[0]??'house',
 subtype:'sample-site',siteName:'AUDIT',scale:'small',propertyCondition:'occupied',
 premise:d.premises?.[0]??'routine',encounterProfile:'scattered',risk:1,
 riskFromContract:false,intelMode:'true-blind',roomCount:7,hostileCount:3,
 armedProfileCount:{ordinary:3,security:0,prepared:0},activeCivilianCount:0,
 rescueTargetPresent:true,captureTargetPresent:true,
 objective:operationBrief(d.missions[0]),entryId:'FRONT'
});
test('B7: exactly twenty authored incident families with at least four per objective',()=>{
 const authored=INCIDENTS.filter(d=>!d.id.startsWith('generic-'));
 assert.equal(authored.length,20);
 for(const kind of ['clear','intel','rescue','hold','capture'])
  assert.ok(authored.filter(d=>d.missions.includes(kind)).length>=4);
 assert.equal(new Set(INCIDENTS.map(x=>x.id)).size,INCIDENTS.length);
});
test('B7: every authored incident is eligible for at least one valid physical context',()=>{
 for(const d of INCIDENTS){
  assert.ok(isIncidentEligible(sample(d),d),d.id+' cannot ever generate');
  assert.ok(d.leads.length>=1&&d.contexts.length>=1);
  assert.ok(d.weight>0);
  for(const lead of d.leads)assert.ok(lead.length>32,d.id);
 }
});
test('B7: all twenty scenarios produce contract-accurate, verified dossier text',()=>{
 for(const d of INCIDENTS.filter(x=>!x.id.startsWith('generic-'))){
  const facts=sample(d,118);
  const dossier=createOperationDossier(facts,{forceIncidentId:d.id,quality:'low'});
  assert.equal(dossier.identity.incidentId,d.id);
  assert.deepEqual(validateOperationDossier(facts,dossier),[]);
  assert.ok(dossier.rendered.standard.includes(facts.objective.objective));
  assert.ok(dossier.rendered.standard.includes(facts.objective.extraction));
  assert.ok(dossier.claims.every(c=>c.disclosure!=='floor-plan'));
 }
});
test('B7: stable but differentiated case names, with no generic-only pool',()=>{
 const a=INCIDENTS.find(d=>d.id==='warrant-service');
 const b=INCIDENTS.find(d=>d.id==='fugitive-lead');
 const facts=sample(a,500);
 const first=createOperationDossier(facts,{forceIncidentId:a.id});
 assert.deepEqual(createOperationDossier(facts,{forceIncidentId:a.id}),first);
 const different=createOperationDossier(facts,{forceIncidentId:b.id});
 assert.notEqual(first.identity.narrativeSeed,different.identity.narrativeSeed);
 const eligible=eligibleIncidents(facts);
 assert.ok(eligible.filter(d=>!d.id.startsWith('generic-')).length>=2);
});
