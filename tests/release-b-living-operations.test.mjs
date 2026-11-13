import test from 'node:test';
import assert from 'node:assert/strict';
import {INCIDENTS} from '../src/briefing/incident-catalog.ts';
import {resolveGenerationIncidentIntent}
 from '../src/briefing/incident-intent.ts';
import {chooseEncounterPremise} from '../src/worldgen/encounter-premises.ts';
import {chooseEncounterProfile} from '../src/worldgen/encounter-profiles.ts';
import {applyIncidentActorDoctrine}
 from '../src/worldgen/encounter-incident-doctrine.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {compileMissionFacts} from '../src/briefing/mission-facts.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {validateOperationDossier} from '../src/briefing/briefing-validation.ts';
import {activateSite} from '../src/breach-core.ts';

const featured=[
 {id:'warrant-service',mission:'capture',building:'house',
  allowed:['hideout','guarded','disturbance','incident','after-hours'],seed:22},
 {id:'missing-person',mission:'rescue',building:'house',
  allowed:['incident','disturbance','routine','after-hours','hideout'],seed:12},
 {id:'evidence-seizure',mission:'intel',building:'office',seed:13}
];

test('B1: selected incident cannot promise an incompatible physical premise',()=>{
 for(const p of featured){
  const incidents=INCIDENTS.find(i=>i.id===p.id);
  assert.ok(incidents);
  const premises=p.allowed??['routine','guarded','incident'];
  for(const premise of premises){
   const resolved=resolveGenerationIncidentIntent(
     p.seed,p.building,p.mission,premise,p.id);
   assert.equal(resolved,p.id);
  }
  assert.equal(resolveGenerationIncidentIntent(p.seed,p.building,p.mission,
    premises[0],p.id),resolveGenerationIncidentIntent(
    p.seed,p.building,p.mission,premises[0],p.id));
 }
 const incompatible=resolveGenerationIncidentIntent(22,'warehouse',
   'capture','guarded','warrant-service');
 assert.notEqual(incompatible,'warrant-service');
 assert.ok(INCIDENTS.find(i=>i.id===incompatible)?.missions.includes('capture'));
 assert.notEqual(resolveGenerationIncidentIntent(12,'house',
   'rescue','defensive','missing-person'),'missing-person');
});

test('B1: ordinary incident steering samples only eligible existing premises',()=>{
 for(const p of featured.filter(p=>p.allowed))
  for(let seed=0;seed<36;seed++){
   const site={seed,archetype:p.building,
     identity:{activity:'normal',condition:'occupied'},condition:'occupied'};
   const premise=chooseEncounterPremise(site,{mission:p.mission,
     enableIncidentIntent:true,incidentId:p.id});
   assert.ok(p.allowed.includes(premise),p.id+'/'+seed+'/'+premise);
  }
});

test('B2: three seeded playbooks have different real encounter shapes',()=>{
 const options={
  'warrant-service':new Set(['prepared','clustered']),
  'missing-person':new Set(['active','scattered']),
  'evidence-seizure':new Set(['quiet-approach','scattered'])
 };
 for(const p of featured){
  const sampled=Array.from({length:80},(_,seed)=>
    chooseEncounterProfile('guarded',seed,p.mission,p.id));
  assert.deepEqual(sampled,Array.from({length:80},(_,seed)=>
    chooseEncounterProfile('guarded',seed,p.mission,p.id)));
  assert.ok(sampled.every(x=>options[p.id].has(x)));
  assert.equal(new Set(sampled).size,2);
 }
 assert.notEqual(chooseEncounterProfile('guarded',22,'capture','warrant-service'),
   chooseEncounterProfile('guarded',22,'intel','evidence-seizure'));
});

const at=(id,role,x,y)=>({id,groupId:'g',role,
 activity:'idle',readiness:'relaxed',
 position:{x,y},heading:0,weaponProfile:'ordinary'});
test('B3: doctrines affect real actor duties, never positions or targets',()=>{
 const source=[at('target','target',100,100),at('guard','occupant',145,110),
   at('patrol','occupant',230,120),at('far','occupant',450,480)];
 const site={objective:{x:105,y:108}};
 const identity=actors=>actors.map(a=>({id:a.id,p:a.position}));
 for(const p of featured){
  const before=structuredClone(source);
  const after=applyIncidentActorDoctrine(site,source,p.mission,p.id);
  assert.deepEqual(identity(after),identity(before));
  assert.deepEqual(source,before,'never mutate the encounter source');
  assert.equal(after.length,before.length);
  assert.equal(after[0].role,'target');
  if(p.id==='warrant-service'){
   assert.equal(after[1].role,'sentry');
   assert.equal(after[1].readiness,'prepared');
  }else if(p.id==='missing-person'){
   assert.equal(after[1].role,'patrol');
   assert.equal(after[1].activity,'patrolling');
  }else{
   assert.equal(after[1].role,'sentry');
   assert.equal(after[1].readiness,'attentive');
  }
  assert.deepEqual(after[3],before[3],
   'out-of-range actors cannot become artificial objective guards');
 }
 assert.deepEqual(applyIncidentActorDoctrine(site,source,'clear','warrant-service'),
   source,'incompatible mission must not receive doctrine');
});

test('B4: three ordinary generated sites keep incident, objective and dossier aligned',()=>{
 try{
  for(const p of featured){
   const site=generateSite(p.seed,'small',undefined,
     {mission:p.mission,enableIncidentIntent:true,incidentId:p.id},
     {archetype:p.building});
   assert.equal(site.encounter?.incidentIntentId,p.id);
   assert.ok(site.encounter&&Array.isArray(site.encounter.actors),
     'a quiet intel or welfare incident may legitimately have no armed hostiles');
   const s=newSession(0,p.seed,'true-blind','small',p.mission,site);
   const facts=compileMissionFacts(s);
   const dossier=createOperationDossier(facts,{quality:'low'});
   assert.equal(facts.encounterIncidentId,p.id);
   assert.equal(dossier.identity.incidentId,p.id);
   assert.equal(dossier.identity.missionKind,p.mission);
   assert.deepEqual(validateOperationDossier(facts,dossier),[]);
   assert.equal(s.site.objective.x,site.objective.x);
   assert.equal(s.site.objective.y,site.objective.y);
   assert.ok(dossier.rendered.standard.includes(facts.objective.extraction));
   assert.ok(dossier.claims.every(c=>c.disclosure!=='floor-plan'));
   if(p.mission==='capture'){
    assert.equal(site.encounter.actors.filter(a=>a.role==='target').length,1);
    assert.equal(facts.captureTargetPresent,true);
   }
   if(p.mission==='rescue')assert.equal(facts.rescueTargetPresent,true);
  }
 }finally{activateSite(null);}
});
