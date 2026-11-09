import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {newSession,planNearbyInteraction,planMedicalTreatment} from '../src/breach-game.ts';
import {registerWound} from '../src/breach-medical-wounds.ts';
import {kitMedicalSupplies} from '../src/equipment-medical-supplies.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';

const options={door:false,node:false,flashRemaining:2,
  posture:'stand',pace:'walk',firePolicy:'engage',reserve:30,magazine:20};

test('TREAT only appears for an eligible medical target, never on door menu',()=>{
  assert.equal(contextActionChoices(options).some(x=>x.id==='ctxTreat'),false);
  const withPatient=contextActionChoices({...options,treatTargetName:'Moss'});
  assert.equal(withPatient.find(x=>x.id==='ctxTreat')?.group,'primary');
  assert.match(withPatient.find(x=>x.id==='ctxTreat')?.title??'',/Moss/);
  assert.equal(contextActionChoices({...options,door:true,treatTargetName:'Moss'})
    .some(x=>x.id==='ctxTreat'),false);
});

test('WINDOW only appears for a reachable operable fixture and remains contextual',()=>{
  assert.equal(contextActionChoices(options).some(x=>x.id==='ctxWindow'),false);
  assert.equal(contextActionChoices({...options,nearWindow:true})
    .find(x=>x.id==='ctxWindow')?.group,'advanced');
});

test('selected waypoint window action inserts at that waypoint, not route end',()=>{
  const s=newSession(),a=s.operators.find(x=>x.id==='rook');
  const node={id:s.nextId++,kind:'wait',p:{...a.p},duration:.5};
  const later={id:s.nextId++,kind:'wait',p:{x:a.p.x+90,y:a.p.y},duration:.5};
  a.plan=[node,later];
  s.windows=[{id:'CONTEXT-W',x:a.p.x+15,y:a.p.y,width:48,
    vertical:true,open:false,integrity:2,shattered:false,operable:true}];
  assert.equal(planNearbyInteraction(s,a.id,'open-window',node.id),true);
  assert.equal(a.plan[1].interaction,'open-window');
  assert.equal(a.plan[1].objectId,'window:CONTEXT-W');
  assert.equal(a.plan[2].id,later.id);
  assert.deepEqual(a.plan[1].p,node.p);
});

test('selected waypoint treatment inserts before following orders with real supplies',()=>{
  const s=newSession(),a=s.operators.find(x=>x.id==='rook');
  const patient=s.operators.find(x=>x.id==='moss');
  patient.p={x:a.p.x+13,y:a.p.y};
  registerWound(patient.medical,22,'leg',2,0);
  a.medicalSupplies=kitMedicalSupplies(initialEquipmentLoadout('carbine'));
  const node={id:s.nextId++,kind:'wait',p:{...a.p},duration:.5};
  const later={id:s.nextId++,kind:'wait',p:{x:a.p.x+88,y:a.p.y},duration:.5};
  a.plan=[node,later];
  assert.equal(planMedicalTreatment(s,a.id,patient.id,node.id),true);
  assert.equal(a.plan[1].kind,'treat');
  assert.equal(a.plan[1].patientId,patient.id);
  assert.equal(a.plan[2].id,later.id);
  assert.equal(planMedicalTreatment(s,a.id,patient.id,999999),false);
});

test('tactical palette looks up windows and patients at selected waypoint',()=>{
  const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  assert.match(main,/const at=node\?\.p\?\?finalPoint\(a\)/);
  assert.match(main,/treatTargetName:treatTarget\?\.name/);
  const commands=readFileSync(new URL('../src/breach-tactical-context-command.ts',import.meta.url),'utf8');
  assert.match(commands,/planNearbyInteraction\(state,selected,\s*nearby\.open\?'close-window':'open-window',node\?\.id\)/);
  assert.match(commands,/planMedicalTreatment\(state,selected,patient\.id,node\?\.id\)/);
});
