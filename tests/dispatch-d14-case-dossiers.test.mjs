import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {DISPATCH_D8_INCIDENT_IDS,dispatchIncidentDefinition,validDispatchCase}
 from '../src/dispatch-case-contract.ts';
import {dispatchCaseDossier} from '../src/dispatch-case-dossier.ts';
import {newCampaign,readCampaign,acceptContract,resolveOperation}
 from '../src/campaign-state.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const settle=(campaign,id,reportId,outcome='success')=>{
 const accepted=acceptContract(campaign,id);
 assert.notStrictEqual(accepted,campaign);
 return resolveOperation(accepted,{id:reportId,contractId:id,day:accepted.day,
  outcome,grade:outcome==='success'?'B':'F',elapsed:55,
  participatingIds:[accepted.squadIds[0]],casualties:[],objective:outcome==='success',
  events:[]});
};

test('D14.1 all seven authored cases use only validated real mission and site facts',()=>{
 const campaign=newDispatchPilotCampaign(14001);
 for(const id of DISPATCH_D8_INCIDENT_IDS){
  const def=dispatchIncidentDefinition(id);
  assert.ok(def?.buildings?.length&&def.leads.length&&def.contexts.length,id);
  const contract={...campaign.contracts[0],kind:def.missions[0],
   dispatchCase:{version:1,incidentId:id,archetype:def.buildings[0]}};
  assert.equal(validDispatchCase(contract.dispatchCase,contract.kind),true,id);
  const c={...campaign,contracts:[contract]};
  const dossier=dispatchCaseDossier(c,contract);
  assert.ok(dossier,id);
  assert.equal(dossier.lead,def.leads[0]);
  assert.equal(dossier.context,def.contexts[0]);
  assert.equal(dossier.site,def.buildings[0].toUpperCase().replace(/-/g,' '));
  assert.ok(dossier.objective.length>15);
  assert.equal(dossier.related.length,0);
  assert.equal(dossier.relatedLabel,'NEW INCIDENT RECORD');
  assert.ok(dossier.uncertainty.includes('not confirmed'));
 }
});

test('D14.1 actual successful settlement creates a real linked outcome and survives reload',()=>{
 let campaign=newDispatchPilotCampaign(14002);
 const first=campaign.contracts.find(x=>x.kind==='intel')??campaign.contracts[0];
 // Use the actual generated contract objective and leave follow-up generation authoritative.
 campaign=settle(campaign,first.id,'d14-success');
 const linked=campaign.contracts.find(x=>x.followUpOf===first.id);
 if(linked){
  const d=dispatchCaseDossier(campaign,linked);
  assert.equal(d.related.length,1);
  assert.equal(d.related[0].contractId,first.id);
  assert.equal(d.related[0].outcome,'success');
  assert.equal(d.related[0].grade,'B');
  assert.equal(d.related[0].title.length>0,true);
  assert.match(d.relatedLabel,/1 PRIOR RESPONSE/);
  const roundtrip=readCampaign(JSON.stringify(campaign));
  assert.ok(roundtrip);
  assert.deepEqual(dispatchCaseDossier(roundtrip,linked),d);
 }else{
  assert.equal(first.kind,'hold','hold has no follow-up under existing rules');
 }
});

test('D14.1 failed outcomes never invent an automatic successful follow-up',()=>{
 const campaign=newDispatchPilotCampaign(14003);
 const first=campaign.contracts[0];
 const failed=settle(campaign,first.id,'d14-fail','failure');
 assert.equal(failed.contracts.some(x=>x.followUpOf===first.id),false);
});

test('D14.1 missing records and missing report do not invent outcomes or scene details',()=>{
 const baseline=newDispatchPilotCampaign(14004);
 const root=baseline.contracts[0];
 const child={...root,id:root.id+'-related',followUpOf:root.id};
 const linked={...baseline,contracts:[root,child]};
 const noReport=dispatchCaseDossier(linked,child);
 assert.equal(noReport.related[0].outcome,'unrecorded');
 assert.equal(noReport.related[0].grade,null);
 const pruned={...baseline,contracts:[child]};
 const missing=dispatchCaseDossier(pruned,child);
 assert.equal(missing.related.length,1);
 assert.equal(missing.related[0].outcome,'unknown');
 assert.equal(missing.related[0].title,'Earlier operation record unavailable');
 assert.match(missing.relatedLabel,/INCOMPLETE/);
 const cycle={...baseline,contracts:[{...root,followUpOf:child.id},child]};
 const cyclic=dispatchCaseDossier(cycle,child);
 assert.ok(cyclic.related.length<=6);
 assert.equal(cyclic.related.some(x=>x.contractId===child.id),false);
 assert.match(cyclic.relatedLabel,/INCOMPLETE/);
 const long=Array.from({length:9},(_,i)=>({...root,
  id:'chain-'+i,...(i?{followUpOf:'chain-'+(i-1)}:{followUpOf:undefined})}));
 const bounded=dispatchCaseDossier({...baseline,contracts:long},long.at(-1));
 assert.equal(bounded.related.length,6);
 assert.match(bounded.relatedLabel,/INCOMPLETE/);
 assert.equal(dispatchCaseDossier(newCampaign(14005),newCampaign(14005).contracts[0]),null);
 assert.equal(dispatchCaseDossier(baseline,{...root,id:'forged'}),null);
});

test('D14.2 UI only extends Dispatch contract briefing and does not change objectives',()=>{
 const ui=read('src/campaign-ui.ts');
 assert.match(ui,/dispatchCaseDossier\(campaign,contract\)/);
 assert.match(ui,/REPORTED LEAD · UNCONFIRMED/);
 assert.match(ui,/TACTICAL OBJECTIVE/);
 assert.match(ui,/RELATED RESPONSE HISTORY/);
 assert.match(ui,/REPORTING LIMITS/);
 assert.match(ui,/this\.handlers\.chooseContract\(contract\.id\)/);
 assert.match(read('src/dispatch-case-dossier.ts'),/MAX_LINKS=6/);
 assert.match(ui,/RELATED CASE HISTORY/);
 assert.match(ui,/const linked=c.contracts.filter/);
 assert.match(read('src/campaign-style.css'),/campaign-case-history summary/);
});
