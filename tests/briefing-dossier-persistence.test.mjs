import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {compileMissionFacts} from '../src/briefing/mission-facts.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {captureMissionStart,siteForMissionRestart} from '../src/breach-mission-restart.ts';
import {captureReplayManifest} from '../src/breach-replay-manifest.ts';

test('B6: mission-start and replay manifests preserve immutable dossier snapshots',()=>{
 try{
  const site=generateSite(12,'small');
  const session=newSession(0,12,'exterior-known','small',undefined,site);
  session.operationDossier=createOperationDossier(compileMissionFacts(session),{quality:'medium'});
  const original=structuredClone(session.operationDossier);
  const start=captureMissionStart(session,'small');
  const replay=captureReplayManifest(session);
  assert.deepEqual(start.dossier,original);
  assert.deepEqual(replay.dossier,original);
  session.operationDossier.identity.title='CHANGED AFTER GO';
  assert.deepEqual(start.dossier,original);
  assert.deepEqual(replay.dossier,original);
  const restarted=newSession(start.variant,start.seed,start.intelMode,start.scale,
    start.missionType,siteForMissionRestart(start));
  restarted.operationDossier=structuredClone(start.dossier);
  assert.deepEqual(restarted.operationDossier,original);
  assert.equal(restarted.phase,'planning');
 }finally{activateSite(null);}
});
test('B6: older saved replay manifests remain valid without a dossier',()=>{
 const legacy={schemaVersion:2,site:null,actors:[],variant:0,
   intelMode:'true-blind',lightingMode:'day',missionType:'clear'};
 assert.equal(legacy.dossier,undefined);
});
