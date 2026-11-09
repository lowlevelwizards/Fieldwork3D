import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activateSite} from '../src/breach-core.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,enemies,availableDeployments,selectDeployment}
  from '../src/breach-game.ts';
import {captureMissionStart,siteForMissionRestart,restoreMissionStartingTeam}
  from '../src/breach-mission-restart.ts';

test('RESTART preserves resolved site, enemy setup, rules and deployment',()=>{
 try{
  const site=generateSite(12,'small');
  const original=newSession(1,12,'exterior-known','small','intel',site);
  original.lightingMode='night';
  team(original)[0].magazine=7; // an actual pre-GO kit choice
  const alternate=availableDeployments(original).find(o=>o.id!=='FRONT');
  const entryId=alternate?.id??'FRONT';
  if(entryId!=='FRONT')assert.equal(selectDeployment(original,entryId),true);
  const start=captureMissionStart(original,'small',entryId);
  const expectedSite=structuredClone(start.site);
  const expectedHostiles=enemies(original).map(a=>({
    id:a.id,p:a.p,heading:a.heading,health:a.health,weapon:a.weapon
  }));
  const expectedFriendly=team(original).map(a=>({...a.p}));
  // Simulate a mission played after planning: the live state is disposable.
  original.site.rooms[0].w+=37;
  if(original.site.enemies.length)original.site.enemies[0].x+=51;
  else original.site.objective.x+=51; // sparse missions are valid
  original.doors[0].open=true;
  original.operators[0].health=0;
  team(original)[0].magazine=0;
  original.started=true;
  original.missionType='capture';
  original.intel.mode='full-view';
  const restoredSite=siteForMissionRestart(start);
  assert.deepEqual(restoredSite,expectedSite);
  const repeated=newSession(start.variant,start.seed,start.intelMode,
    start.scale,start.missionType,restoredSite);
  repeated.lightingMode=start.lightingMode;
  restoreMissionStartingTeam(repeated,start);
  if(start.entryId!=='FRONT')
   assert.equal(selectDeployment(repeated,start.entryId),true);
  assert.deepEqual(repeated.site,expectedSite);
  assert.equal(repeated.started,false);
  assert.equal(repeated.phase,'planning');
  assert.equal(repeated.missionType,'intel');
  assert.equal(repeated.intel.mode,'exterior-known');
  assert.equal(repeated.lightingMode,'night');
  assert.deepEqual(team(repeated).map(a=>a.p),expectedFriendly);
  assert.equal(team(repeated)[0].magazine,7);
  assert.equal(team(repeated)[0].health,4);
  assert.deepEqual(enemies(repeated).map(a=>({
   id:a.id,p:a.p,heading:a.heading,health:a.health,weapon:a.weapon
  })),expectedHostiles);
  assert.ok(team(repeated).every(a=>a.plan.length===0));
  assert.equal(repeated.shots.length,0);
  assert.equal(repeated.seconds,0);
  // Repeating twice cannot be polluted by the first repeated session.
  repeated.site.rooms[0].w+=10;
  assert.deepEqual(siteForMissionRestart(start),expectedSite);
 }finally{activateSite(null);}
});

test('RESTART and debrief RETRY use the same path; NEW SITE remains random',()=>{
 const source=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(source,/ui\.restart\.addEventListener\('click',[\s\S]*?restartMission\(\);/);
 assert.match(source,/ui\.retry\.addEventListener\('click',[^\n]*restartMission\(\)/);
 assert.match(source,/ui\.variant\.addEventListener\('click',[\s\S]*?reset\(state\.variant\+1\)/);
 assert.match(source,/function restartMission\(\):void\{/);
 const owner=readFileSync(new URL('../src/breach-mission-controller.ts',import.meta.url),'utf8');
 assert.match(source,/missionController\.restartSnapshot\(state\)/);
 assert.match(source,/missionController\.restartRequest\(start\)/);
 assert.match(source,/missionController\.restoreStartingSetup\(state,start/);
 assert.match(owner,/siteForMissionRestart\(start\)/);
});
