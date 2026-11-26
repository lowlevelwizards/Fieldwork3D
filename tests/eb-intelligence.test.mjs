import test from 'node:test';import assert from 'node:assert/strict';
import {newSession,enemies} from '../src/breach-game.ts';
import {generateSite} from '../src/breach-site.ts';
import {compileMissionFacts} from '../src/briefing/mission-facts.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {createBriefingCardModel} from '../src/briefing/briefing-view-model.ts';
import {matchingFamilyPreset} from '../src/equipment-weapon-families.ts';
test('EB17 disclosure follows resolved actors and quality without exposing positions or private truth',()=>{
 const site=generateSite(17,'small',undefined,{mission:'capture',groupProfile:'regular-force'});
 const s=newSession(0,17,'true-blind','small','capture',site);
 const facts=compileMissionFacts(s),before=JSON.stringify(facts);
 const [low,medium,high]=['low','medium','high'].map(quality=>createOperationDossier(facts,{quality}));
 const groups=d=>d.claims.filter(c=>c.id.startsWith('threat-group-'));
 const kits=d=>d.claims.filter(c=>c.id.startsWith('threat-kit-'));
 assert.equal(groups(low).length,0);assert.equal(kits(low).length,0);
 assert.ok(groups(medium).length);assert.equal(kits(medium).length,0);
 assert.ok(groups(high).length);assert.ok(kits(high).length);
 assert.ok(kits(high)[0].text.includes(matchingFamilyPreset(enemies(s)[0].weaponConfiguration.build).name));
 assert.equal(JSON.stringify(facts),before);
 assert.ok(!JSON.stringify(high).includes('"threatGroups"'));
 assert.ok(!high.claims.some(c=>c.disclosure==='floor-plan'));
 const model=createBriefingCardModel(s.missionType,{...facts.objective,building:'Test',layout:'Unknown',squad:4},high);
 assert.ok(model.reports.threat.some(c=>c.id.startsWith('threat-kit-')));
 assert.ok(high.rendered.standard.includes('THREAT ASSESSMENT'));
});

import {recoveredIntelReceipts} from '../src/breach-optional-intel.ts';
import {contractThreatIntel,researchContractThreat} from '../src/campaign-state.ts';
test('EB18 recovered evidence is accountable and threat research spends existing intel without altering objective/map',()=>{
 const items=[{id:'a',kind:'documents',model:'folder',collectedBy:'rook',collectedAt:1},
 {id:'b',kind:'digital',model:'laptop',collectedBy:null,collectedAt:null},
 {id:'c',kind:'communications',model:'phone',collectedBy:'moss',collectedAt:2}];
 assert.deepEqual(recoveredIntelReceipts(items,['a','b']),[{id:'a',kind:'documents',model:'folder'}]);
 const job={id:'j',status:'available',intel:'unknown',objectiveIntel:'unknown'};
 const c={intelligence:3,contracts:[job],activeContractId:null};
 const medium=researchContractThreat(c,'j'),high=researchContractThreat(medium,'j');
 assert.equal(contractThreatIntel(medium.contracts[0]),'medium');
 assert.equal(contractThreatIntel(high.contracts[0]),'high');
 assert.equal(high.intelligence,0);assert.equal(high.contracts[0].objectiveIntel,'unknown');
 assert.equal(high.contracts[0].intel,'unknown');assert.equal(researchContractThreat(high,'j'),high);
 assert.equal(researchContractThreat({...c,activeContractId:'j'},'j').intelligence,3);
});

import {campaignEnemyContext,createCampaignRules} from '../src/campaign-rules.ts';
import {selectEncounterGroupProfile} from '../src/worldgen/encounter-group-identity.ts';
test('EB20 campaign contexts are explicit and never leak to Quick Play or training',()=>{
 const cases=[['dispatch','civilian'],['operations','military'],['wasteland','survival'],['custom','civilian']];
 for(const [template,expected] of cases){
  const campaign={rules:createCampaignRules(template)};
  assert.equal(campaignEnemyContext('mission',campaign),expected);
  assert.equal(campaignEnemyContext('quick',campaign),undefined);
  assert.equal(campaignEnemyContext('training',campaign),undefined);
 }
 const g={id:'g1',purpose:'organised',members:[]};
 for(let seed=1;seed<50;seed++){
  const survival=selectEncounterGroupProfile(g,[],'defensive',seed,{forceContext:'survival'});
  assert.ok(['armed-irregulars','organised-criminals'].includes(survival));
 }
});
test('EB20 generated profile, issued kit and briefing remain stable after resolved-site restart',()=>{
 const seed=19,site=generateSite(seed,'small',undefined,{mission:'clear',forceContext:'military'});
 const first=newSession(0,seed,'true-blind','small','clear',site);
 const again=newSession(0,seed,'true-blind','small','clear',structuredClone(site));
 assert.deepEqual(compileMissionFacts(first).threatGroups,compileMissionFacts(again).threatGroups);
 assert.deepEqual(createOperationDossier(compileMissionFacts(first),{quality:'high'}),createOperationDossier(compileMissionFacts(again),{quality:'high'}));
});
