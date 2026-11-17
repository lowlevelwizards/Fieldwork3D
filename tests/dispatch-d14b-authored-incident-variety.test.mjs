import test from 'node:test';
import assert from 'node:assert/strict';
import {DISPATCH_D8_INCIDENT_IDS,dispatchIncidentDefinition,validDispatchCase}
 from '../src/dispatch-case-contract.ts';
import {assignDispatchCase} from '../src/dispatch-case-selection.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {newCampaign,readCampaign} from '../src/campaign-state.ts';
import {INCIDENTS} from '../src/briefing/incident-catalog.ts';

const KINDS=['capture','rescue','intel','clear','hold'];

test('D14.4 all nineteen curated cases already exist and map to playable objectives and buildings',()=>{
 assert.equal(DISPATCH_D8_INCIDENT_IDS.length,19);
 assert.equal(new Set(DISPATCH_D8_INCIDENT_IDS).size,19);
 const byKind=new Map(KINDS.map(kind=>[kind,0]));
 for(const id of DISPATCH_D8_INCIDENT_IDS){
  const def=dispatchIncidentDefinition(id);
  assert.ok(def,'missing authored definition '+id);
  assert.equal(INCIDENTS.find(x=>x.id===id),def,'must reuse the common authored incident');
  assert.ok(def.leads.length>0&&def.contexts.length>0&&def.weight>0,id);
  assert.ok(def.buildings?.length,id+' needs authored sites');
  assert.ok(def.missions.every(kind=>KINDS.includes(kind)),id);
  for(const kind of def.missions){
   byKind.set(kind,(byKind.get(kind)??0)+1);
   for(const archetype of def.buildings){
    assert.equal(validDispatchCase({version:1,incidentId:id,archetype},kind),true,
     id+' '+kind+' '+archetype);
   }
  }
 }
 assert.deepEqual(Object.fromEntries(byKind),{
  capture:3,rescue:4,intel:4,clear:4,hold:4
 });
});

test('D14.4 initial offers gain distinct seeded cases without rerolling saved contracts',()=>{
 const sample=newDispatchPilotCampaign(1440);
 const base=sample.contracts[0];
 const observed=new Set();
 const diversity=new Map(KINDS.map(kind=>[kind,new Set()]));
 for(const kind of KINDS){
  for(let seed=1;seed<=120;seed++){
   const original={...base,id:'d14b-'+kind+'-'+seed,seed,kind,dispatchCase:undefined};
   const chosen=assignDispatchCase(original);
   const id=chosen.dispatchCase?.incidentId;
   assert.ok(id&&DISPATCH_D8_INCIDENT_IDS.includes(id));
   assert.equal(validDispatchCase(chosen.dispatchCase,kind),true);
   assert.deepEqual(assignDispatchCase(original),chosen);
   assert.strictEqual(assignDispatchCase(chosen),chosen,'already stored selection immutable');
   observed.add(id);
   diversity.get(kind).add(id);
  }
 }
 assert.ok(observed.size>=15,'expanded pool must actually yield diverse choices');
 for(const kind of KINDS)
  assert.ok(diversity.get(kind).size>=3,kind+' should not collapse to one case');
 const saved=readCampaign(JSON.stringify(sample));
 assert.ok(saved);
 assert.deepEqual(saved.contracts,sample.contracts);
 assert.equal(newCampaign(1440).contracts.some(c=>c.dispatchCase),false,
  'original non-Dispatch contracts remain unaffected');
});

test('D14.4 stale or fabricated incident data cannot be imported',()=>{
 const campaign=newDispatchPilotCampaign(1441);
 const job=campaign.contracts[0];
 const bad={...campaign,contracts:campaign.contracts.map(x=>x.id===job.id?
  {...x,dispatchCase:{version:1,incidentId:'not-an-authored-incident',archetype:'house'}}:x)};
 assert.equal(readCampaign(JSON.stringify(bad)),null);
 assert.equal(dispatchIncidentDefinition('generic-clear'),undefined);
});
