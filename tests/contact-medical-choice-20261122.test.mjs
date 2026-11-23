import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {personContactStandpoint,PERSON_CONTACT_REACH}
 from '../src/breach-person-contact-standpoint.ts';
import {newSession,team,enemies,planSuspectRestraint,toggling,stepSession}
 from '../src/breach-game.ts';
import {commitSuspectSurrender} from '../src/breach-suspect-compliance.ts';
import {registerWound} from '../src/breach-medical-wounds.ts';
import {medicalTreatmentChoices,medicalPatientStatus}
 from '../src/breach-medical-target-choices.ts';
import {dispatchTacticalContextCommand}
 from '../src/breach-tactical-context-command.ts';
import {activateSite} from '../src/breach-core.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('restraint standoff never places an operator at the subject center',()=>{
 const from={x:0,y:0},person={x:40,y:0};
 assert.equal(PERSON_CONTACT_REACH,36);
 const goal=personContactStandpoint(from,person,p=>p.x>0);
 assert.ok(goal);
 assert.ok(Math.abs(d(goal,person)-31)<.0001);
 assert.ok(d(goal,person)>20,'standing space must not overlap the subject');
 assert.equal(personContactStandpoint(from,person,()=>false),null);
 const order=source('src/breach-order-interactions.ts');
 assert.match(order,/PERSON_CONTACT_REACH/);
 assert.match(order,/personContactStandpoint\(a\.p,suspect\.p/);
 assert.match(order,/personContactStandpoint\(a\.p,person\.p/);
 const restrain=order.split("if(n.interaction==='restrain-suspect')")[1]
   .split("if(n.interaction==='escort-suspect')")[0];
 assert.doesNotMatch(restrain,/approach\(a,suspect\.p,dt,s,\.65\)/);
 const civilian=order.split("if(n.objectId.startsWith('civ:')")[1];
 assert.doesNotMatch(civilian,/approach\(a,person\.p,dt,s,\.65\)/);
});

test('a compliant suspect 32 units away can be restrained without walking into them',()=>{
 const s=newSession(0,4);
 try{
  const actor=team(s)[0],suspect=enemies(s)[0];
  for(const mate of team(s))if(mate!==actor)mate.health=0;
  for(const enemy of enemies(s))if(enemy!==suspect)enemy.health=0;
  suspect.p={x:actor.p.x+32,y:actor.p.y};
  suspect.priorP={...suspect.p};
  suspect.heading=actor.heading=actor.weaponYaw=0;
  actor.awareness.visualProgress[suspect.id]=1;
  assert.equal(commitSuspectSurrender(s,suspect,()=>{},()=>{}),true);
  assert.equal(planSuspectRestraint(s,actor.id,suspect.id),true);
  const origin={...actor.p};
  toggling(s);
  for(let i=0;i<145&&s.phase==='running'&&!suspect.restrained;i++)
   stepSession(s,1/60);
  assert.equal(suspect.restrained,true,'contact must finish without route collision');
  assert.ok(d(actor.p,suspect.p)>=18,'bodies remain separate');
  assert.ok(d(actor.p,origin)<8,'nearby restraint does not force entry to target center');
 }finally{activateSite(null);}
});

test('medical choices identify self, bleeding, stability, and insufficient supplies',()=>{
 const s=newSession(0,4);
 try{
  const actor=team(s)[0];
  actor.medicalSupplies={'tourniquet':2,'field-dressing':2,'trauma-dressing':2};
  registerWound(actor.medical,620,'leg',2,0);
  let patients=medicalTreatmentChoices(s,actor,actor.p);
  assert.equal(patients[0]?.id,actor.id);
  assert.equal(patients[0]?.isSelf,true);
  assert.equal(patients[0]?.status,'BLEEDING');
  assert.equal(patients[0]?.canTreat,true);
  const result=dispatchTacticalContextCommand({
   state:s,selected:actor.id,actor,node:undefined,door:undefined,
   action:'ctxTreat:'+actor.id,selectedActiveWatch:false,
   medicalCandidate:()=>null
  });
  assert.equal(result.outcome,'accepted');
  assert.ok(actor.plan.some(n=>n.kind==='treat'&&n.patientId===actor.id));
  actor.plan=[];
  actor.medical.wounds[0].stabilized=true;
  assert.equal(medicalPatientStatus(actor),'STABLE');
  patients=medicalTreatmentChoices(s,actor,actor.p);
  assert.equal(patients[0]?.canTreat,false);
  assert.equal(patients[0]?.status,'STABLE');
  const denied=dispatchTacticalContextCommand({
   state:s,selected:actor.id,actor,node:undefined,door:undefined,
   action:'ctxTreat:'+actor.id,selectedActiveWatch:false,
   medicalCandidate:()=>null
  });
  assert.equal(denied.outcome,'rejected');
  actor.medical.wounds[0].stabilized=false;
  actor.medicalSupplies={'tourniquet':0,'field-dressing':0,'trauma-dressing':0};
  patients=medicalTreatmentChoices(s,actor,actor.p);
  assert.equal(patients[0]?.status,'BLEEDING');
  assert.equal(patients[0]?.canTreat,false);
  assert.match(patients[0]?.note??'',/supplies unavailable/);
  assert.equal(medicalTreatmentChoices(s,actor,{...actor.p})
   .some(p=>p.id===actor.id),true);
 }finally{activateSite(null);}
});

test('a secured gun becomes an evidence marker rather than an unchanged loose gun',()=>{
 const present=source('src/rendering/breach-surrendered-firearms-presenter.ts');
 assert.match(present,/secured-evidence-marker/);
 assert.match(present,/root\.children\[0\]\.visible=item\.status==='loose'/);
 assert.match(present,/root\.children\[1\]\.visible=item\.status==='secured'/);
 const flat=source('src/breach-2d-actor-renderer.ts');
 assert.match(flat,/item\.status==='secured'/);
 assert.match(flat,/liveWeaponKnown\(item,state\)/);
 const order=source('src/breach-order-interactions.ts');
 assert.match(order,/weapon\.status='secured';weapon\.securedById=a\.id/);
 assert.match(order,/action:'weapon-secured'/);
 const pose=source('src/breach-3d.ts');
 assert.match(pose,/interaction==='secure-firearm'/);
});

test('TREAT toolbar and context both open the same explicit patient chooser',()=>{
 const hud=source('src/ui/tactical-hud-controller.ts');
 const palette=source('src/ui/tactical-palette-controller.ts');
 const main=source('src/breach-main.ts');
 assert.match(hud,/port\.openTreatment\?\.\(\)/);
 assert.doesNotMatch(hud,/if\(patient\)planMedicalTreatment\(port\.state,port\.selected,patient\.id\)/);
 assert.match(hud,/case 'ctxTreat':\s*config\.toggleTreatment\?\.\(\)/);
 assert.match(palette,/context-medical/);
 assert.match(palette,/medicalPatientStatus\(a\)/);
 assert.match(palette,/medicalChoices:treatmentCandidates/);
 assert.match(main,/openTreatment:\(\)=>\{/);
 assert.match(main,/paletteController\.toggleTreatment\(\)/);
});
