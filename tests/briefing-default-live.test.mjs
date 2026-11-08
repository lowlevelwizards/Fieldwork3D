import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {compileMissionFacts} from '../src/briefing/mission-facts.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('R3: ordinary Quick Play and Campaign enable procedural briefings',()=>{
 const main=read('src/breach-main.ts'),worker=read('src/quick-play-worker.ts');
 assert.match(main,/briefingPreviewEnabled=startupParams\.get\('briefingV2'\)!=='0'/);
 assert.match(main,/const civilianPreview=startupParams\.get\('civilians'\)!=='0'/);
 assert.match(main,/enableCivilians:civilianPreview,enableIncidentIntent:true/);
 assert.match(main,/enableIncidentIntent:true\}\);/);
 assert.match(worker,/\},\{enableIncidentIntent:true\}\)/);
 assert.match(main,/campaignScreen\.hide\(\);\s+showMissionBriefing\(\)/);
 assert.match(main,/quickPlayPanel\.hidden=true;\s+showMissionBriefing\(\)/);
});
test('R3: objectives, success, extraction stay authoritative',()=>{
 const main=read('src/breach-main.ts');
 assert.match(main,/ui\.briefingBody\.textContent=brief\.objective/);
 assert.match(main,/ui\.briefingCondition\.textContent=brief\.condition/);
 assert.match(main,/ui\.briefingExtraction\.textContent=brief\.extraction/);
 assert.match(main,/createBriefingCardModel\(state\.missionType,brief,dossier\)/);
 assert.match(main,/renderBriefingReports\(ui\.briefingIntel,model\.reports\.threat\)/);
});
test('R3: real enabled encounter produces a mission-consistent dossier',()=>{
 try{
  const seed=12,site=generateSite(seed,'small',undefined,{enableIncidentIntent:true});
  const mission=['clear','intel','rescue','hold','capture'][seed%5];
  const s=newSession(0,seed,'exterior-known','small',mission,site);
  const facts=compileMissionFacts(s),d=createOperationDossier(facts);
  assert.equal(d.identity.seed,seed);
  assert.equal(d.identity.missionKind,mission);
  assert.ok(d.rendered.standard.includes(d.contract.objective));
  assert.ok(d.rendered.standard.includes(d.contract.extraction));
 }finally{activateSite(null);}
});
