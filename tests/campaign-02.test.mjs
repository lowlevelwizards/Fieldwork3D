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
test('campaign menu and results settlement integrate without replacing quick play',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(main,/new CampaignScreen/);
 assert.match(main,/campaignMode='quick'/);
 assert.match(main,/resolveOperation\(campaign,result\)/);
 assert.match(main,/reset\(0,job.seed,job.kind\)/);
 assert.match(main,/returnAfterCampaignMission\(\)/);
});