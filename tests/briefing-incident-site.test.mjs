import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {compileMissionFacts} from '../src/briefing/mission-facts.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {validateOperationDossier} from '../src/briefing/briefing-validation.ts';

test('B5: a real opt-in encounter carries intent into truthful, restricted briefing facts',()=>{
 try{
  const requested='missing-person',seed=12;
  const site=generateSite(seed,'small',undefined,
    {mission:'rescue',enableIncidentIntent:true,incidentId:requested});
  assert.equal(site.encounter?.incidentIntentId,requested);
  assert.ok(site.encounter?.actors.length!==undefined);
  const session=newSession(0,seed,'true-blind','small','rescue',site);
  const truth=compileMissionFacts(session);
  assert.equal(truth.encounterIncidentId,requested);
  assert.equal(truth.hostileCount,session.operators.filter(a=>a.side==='red').length);
  const dossier=createOperationDossier(truth,{quality:'low'});
  assert.deepEqual(validateOperationDossier(truth,dossier),[]);
  assert.ok(dossier.rendered.standard.includes(truth.objective.extraction));
  assert.ok(dossier.claims.every(c=>c.disclosure!=='floor-plan'));
  assert.ok(['missing-person','generic-rescue'].includes(dossier.identity.incidentId));
 }finally{activateSite(null);}
});
