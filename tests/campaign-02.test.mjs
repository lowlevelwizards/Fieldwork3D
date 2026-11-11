import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
test('campaign contract objective overrides the random site seed',()=>{
 const s=newSession(0,1,'floor-plan','standard','capture');
 assert.equal(s.missionType,'capture');
 assert.ok(s.captureTarget);
 activateSite(null);
});
test('campaign menu and results settlement remain delegated; Quick Play still opens creator',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const main=read('src/breach-main.ts');
 const flow=read('src/breach-campaign-flow.ts');
 assert.match(main,/createBreachCampaignFlow/);
 assert.match(flow,/new CampaignScreen/);
 assert.match(flow,/resolveOperation\(currentCampaign,result\)/);
 assert.match(main,/reset\(0,job.seed,job.kind,undefined,job.risk\)/);
 assert.match(main,/returnAfterCampaignMission\(\)/);
 assert.match(main,/const launchQuickPlay=\(\)=>quickPlayController\.customize\(\)/);
 assert.match(main,/legacyStudy\|\|bootConfig\.quickEntry\?'quick':'menu'/);
});
