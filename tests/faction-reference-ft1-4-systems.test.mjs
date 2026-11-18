import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {FACTION_TIMELINES} from '../src/faction-reference-timelines.ts';
import {HISTORICAL_EQUIPMENT} from '../src/faction-reference-historical-equipment.ts';
import {HISTORICAL_ISSUE_RECORDS} from '../src/faction-reference-equipment-data.ts';
import {prioritizeContentDemand,contentDemandSummary}
 from '../src/faction-reference-content-demand.ts';
import {assessHistoricalEnsemble}
 from '../src/faction-reference-ensemble-audit.ts';
import {existingVisualProxyForContext}
 from '../src/faction-reference-visual-proxy.ts';
import {auditHistoricalContext}
 from '../src/faction-reference-quality-audit.ts';
import {generateHistoricalLoadout,validateHistoricalLoadoutProposal}
 from '../src/faction-reference-loadout-generator.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {auditFactionResearchCoverage} from '../src/faction-reference-audit.ts';

const make=(timelineId,year,extra={})=>generateHistoricalLoadout({
 context:{timelineId,year,...extra},mode:'evidence-backed',seed:0});

test('FT1.4 extends systems without new historical items or visual content',()=>{
 assert.equal(FACTION_REFERENCES.length,44);
 assert.equal(FACTION_TIMELINES.length,34);
 assert.equal(HISTORICAL_EQUIPMENT.length,35);
 assert.equal(HISTORICAL_ISSUE_RECORDS.length,32);
 assert.equal(new Set(HISTORICAL_EQUIPMENT.map(x=>x.id)).size,35);
});
test('FT1.4 content demand counts unique affected reference kits and maps actual stand-ins',()=>{
 const a=prioritizeContentDemand();
 assert.deepEqual(a,prioritizeContentDemand());
 assert.ok(a.length>0);
 assert.equal(new Set(a.map(x=>x.id)).size,a.length);
 for(let i=1;i<a.length;i++)
  assert.ok(a[i-1].priorityScore>=a[i].priorityScore);
 for(const item of a){
  assert.equal(item.affectedKitCount,new Set(item.affectedReferenceIds).size);
  assert.equal(item.affectedKitCount,item.missingKitCount+item.approximateKitCount);
  assert.ok(item.affectedKitCount<=44);
  assert.ok(item.noveltyRequiresReview);
  assert.ok(item.priorityScore>0);
  assert.ok(item.currentProxies.length>0);
 }
 const g36=a.find(x=>x.id==='g36-family');
 const sa80=a.find(x=>x.id==='sa80-family');
 assert.equal(g36.affectedKitCount,2);
 assert.equal(sa80.affectedKitCount,2);
 assert.equal(g36.category,'weapon');
 assert.equal(g36.missingKitCount,0,'two Bundeswehr looks now use a G36');
 assert.equal(g36.approximateKitCount,2,'recognizable weapon is not full period issue certification');
 assert.ok(g36.currentProxies.every(x=>x.includes('g36-service (representative)')));
 const duplicated=prioritizeContentDemand([...FACTION_REFERENCES,FACTION_REFERENCES[0]]);
 assert.deepEqual(duplicated,a);
 assert.equal(contentDemandSummary().referenceCount,44);
});
test('FT1.4 dated appearance stand-ins are never treated as historical evidence',()=>{
 const visual=existingVisualProxyForContext({
  timelineId:'bundeswehr-field',year:2000,environment:'woodland'});
 assert.equal(visual.status,'dated-visual-reference');
 assert.equal(visual.compatibleForPreview,true);
 assert.equal(visual.referenceId,'bundeswehr-flecktarn-2000');
 const historical=make('bundeswehr-field',2000,{environment:'woodland'});
 assert.equal(historical.status,'no-evidence');
 const advisory=existingVisualProxyForContext({
  timelineId:'bundeswehr-field',year:1800});
 assert.equal(advisory.status,'nearest-advisory');
 assert.equal(advisory.compatibleForPreview,false);
 assert.equal(existingVisualProxyForContext({
  timelineId:'not-a-faction',year:2000}).status,'invalid-context');
});
test('FT1.4 independent sources do not claim a complete co-issued kit',()=>{
 const proposal=make('us-army-infantry',2016);
 assert.equal(proposal.completeKitVerified,false);
 assert.equal(proposal.ensemble.documentedWholeKit,false);
 assert.equal(proposal.ensemble.evidenceClass,'independently-sourced-composite');
 assert.ok(proposal.ensemble.sourceCount>0);
 assert.equal(proposal.ensemble.researchedCategoryCount,
  new Set(proposal.choices.map(x=>x.category)).size);
 assert.equal(proposal.ensemble.visualSlotConflicts.length,0);
 assert.equal(validateHistoricalLoadoutProposal(
  {...proposal,context:{...proposal.context,year:2003}},initialEquipmentLoadout()),null);
 const altered={...proposal,ensemble:{...proposal.ensemble,documentedWholeKit:true}};
 assert.equal(validateHistoricalLoadoutProposal(altered,initialEquipmentLoadout()),null);
});
test('FT1.4 compatibility audit detects two historical picks mapped to same game slot',()=>{
 const original=make('usmc-field',2006);
 const mapped=original.choices.find(x=>x.mapping?.gameSlot);
 assert.ok(mapped);
 const clone={...mapped,historicalId:'another-identity',recordId:'another-evidence'};
 const assessment=assessHistoricalEnsemble([mapped,clone]);
 assert.equal(assessment.documentedWholeKit,false);
 assert.equal(assessment.visualSlotConflicts.length,1);
 assert.ok(assessment.warnings.some(x=>x.includes('same game slot')));
});
test('FT1.4 quality audit preserves absent research while reporting visual and art gaps',()=>{
 const a=auditHistoricalContext({
  timelineId:'bundeswehr-field',year:2000,environment:'woodland'});
 assert.equal(a.historicalStatus,'no-evidence');
 assert.equal(a.eligibleResearchRecords,0);
 assert.equal(a.visualReferenceIsPeriodMatch,true);
 assert.equal(a.visualReferenceId,'bundeswehr-flecktarn-2000');
 assert.ok(a.relevantContentQueue.some(x=>x.id==='g36-family'));
 assert.equal(a.historicalClaimsVerifiedAsCompleteKit,false);
 const missing=auditHistoricalContext({timelineId:'bundeswehr-field',year:1800});
 assert.equal(missing.visualReferenceIsPeriodMatch,false);
 assert.equal(missing.visualReferenceId,null);
 assert.equal(missing.relevantContentQueue.length,0);
});
test('FT1.4 research and content-audit dimensions remain independent',()=>{
 const report=auditFactionResearchCoverage();
 assert.equal(report.researchedTimelines,9);
 assert.equal(report.historicalAssociations,32);
 assert.equal(report.datedAppearanceReferences,44);
 assert.equal(report.visualNeedCount,report.futureContentQueue.length);
 assert.ok(report.visualNeedCount>0);
});
test('FT1.4 Studio reviews proxies, not authoritative equipment writes',()=>{
 const studio=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../src/faction-reference-browser.ts',import.meta.url),'utf8');
 assert.match(studio,/visualReference\?\.wardrobe\?\?previewWardrobe\(\)/);
 assert.match(studio,/visualReference\?\.kit\?\?p\.loadout/);
 assert.match(browser,/FUTURE VISUAL CONTENT QUEUE/);
 assert.match(browser,/NO COMPLETE-KIT CERTIFICATION/);
 assert.match(browser,/noveltyAssessment/);
 assert.match(browser,/onApplyProposedEquipment/);
});
