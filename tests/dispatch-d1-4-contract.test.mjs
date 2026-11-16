import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAMPAIGN_TEMPLATE_IDS,createCampaignRules,effectiveCampaignRules}
 from '../src/campaign-rules.ts';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {FACTION_TIMELINES,TIMELINE_ORGANIZATIONS}
 from '../src/faction-reference-timelines.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {dispatchStarterReferenceContexts,dispatchStarterOrganizations,
 auditDispatchStarterReferences} from '../src/dispatch-content-foundation.ts';
import {dispatchStarterCoverage,auditDispatchStarterCoverage,
 auditDispatchFoundation} from '../src/dispatch-reference-coverage.ts';

test('D1.4 closes the four authored references without duplicating catalog authorities',()=>{
 const before=JSON.stringify({
  references:FACTION_REFERENCES,timelines:FACTION_TIMELINES,
  organizations:TIMELINE_ORGANIZATIONS
 });
 const all=dispatchStarterReferenceContexts();
 const organizations=dispatchStarterOrganizations();
 const coverage=dispatchStarterCoverage();
 assert.deepEqual(auditDispatchStarterReferences(),[]);
 assert.deepEqual(auditDispatchStarterCoverage(),[]);
 assert.deepEqual(auditDispatchFoundation(),[]);
 assert.equal(Object.isFrozen(auditDispatchFoundation()),true);
 assert.equal(all.length,4);
 assert.equal(organizations.length,2);
 assert.equal(organizations.reduce((sum,x)=>sum+x.roles.length,0),3);
 assert.deepEqual(coverage.map(x=>x.context.referenceId),
  all.map(x=>x.referenceId));
 for(const ref of coverage){
  assert.equal(ref.completeHistoricalKitVerified,false);
  assert.equal(ref.coverageScope,'authored-visual-gaps-only');
  assert.equal(ref.context.evidenceScope,'visual-reference-only');
 }
 assert.equal(JSON.stringify({
  references:FACTION_REFERENCES,timelines:FACTION_TIMELINES,
  organizations:TIMELINE_ORGANIZATIONS
 }),before);
});

test('D1.4 does not activate fictional campaign presets or change existing loadouts',()=>{
 assert.deepEqual([...CAMPAIGN_TEMPLATE_IDS],
  ['dispatch','operations','wasteland','custom']);
 assert.equal(createCampaignRules('dispatch').template,'dispatch');
 assert.equal(effectiveCampaignRules(null).template,'custom');
 const before=JSON.stringify(initialEquipmentLoadout('smg'));
 dispatchStarterCoverage();
 dispatchStarterOrganizations();
 assert.equal(JSON.stringify(initialEquipmentLoadout('smg')),before);
});

test('D1.4 modules cannot become a backdoor for item filtering or save writes',()=>{
 for(const path of ['dispatch-content-foundation.ts','dispatch-reference-coverage.ts']){
  const source=readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
  assert.doesNotMatch(source,/\b(?:setEquipmentChoice|writeCampaign|saveCampaign)\s*\(/);
  assert.doesNotMatch(source,/\b(?:update|push|splice)\s*\(\s*FACTION_REFERENCES/);
 }
 const creator=readFileSync(new URL('../src/ui/campaign-creator.ts',
  import.meta.url),'utf8');
 assert.match(creator,/The Dispatch SWAT pilot is separately available/);
 const rules=readFileSync(new URL('../src/campaign-rules.ts',import.meta.url),'utf8');
 assert.match(rules,/Quick Play never reads this module/);
});
