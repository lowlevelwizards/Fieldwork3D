import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {FACTION_TIMELINES,TIMELINE_ORGANIZATIONS}
 from '../src/faction-reference-timelines.ts';
import {HISTORICAL_EQUIPMENT} from '../src/faction-reference-historical-equipment.ts';
import {HISTORICAL_ISSUE_RECORDS} from '../src/faction-reference-equipment-data.ts';
import {GEAR_CATEGORIES,referenceGearSettings,timelineGearMilestones}
 from '../src/faction-reference-gear-chronology.ts';
import {gearEvolutionForTimeline,gearEventsAtYear}
 from '../src/faction-reference-equipment-evolution.ts';
import {resolveDatedGearSnapshot,compareDatedGearSnapshots}
 from '../src/faction-reference-dated-gear-snapshot.ts';

test('FT1.6 preserves complete prior faction research and visual catalogs',()=>{
 assert.equal(FACTION_REFERENCES.length,44);
 assert.equal(FACTION_TIMELINES.length,34);
 assert.equal(HISTORICAL_EQUIPMENT.length,38);
 assert.equal(HISTORICAL_ISSUE_RECORDS.length,35);
 assert.equal(new Set(FACTION_REFERENCES.map(x=>x.id)).size,44);
 assert.ok(TIMELINE_ORGANIZATIONS.length>0);
});

test('FT1.6 captures independent footwear, helmet, fabric and carriage settings',()=>{
 const settings=referenceGearSettings('us-army-dcu-2003');
 assert.deepEqual(Object.keys(settings),[...GEAR_CATEGORIES]);
 assert.ok(settings.footwear.some(x=>x.key==='style.footwear'));
 assert.ok(settings.headgear.some(x=>x.key==='style.headwear'));
 assert.ok(settings.carriage.some(x=>x.key==='detail.mounts'));
 assert.ok(settings.accessories.some(x=>x.key==='detail.attachments'));
 assert.ok(settings.uniform.some(x=>x.key==='style.top'));
 assert.ok(settings.weapon.some(x=>x.key==='preset'));
 assert.equal(GEAR_CATEGORIES.length,9);
});

test('FT1.6 event lanes re-express all existing snapshots and cited research only',()=>{
 const evolutions=FACTION_TIMELINES.map(t=>gearEvolutionForTimeline(t.id));
 assert.ok(evolutions.every(Boolean));
 const all=evolutions.flatMap(t=>t.allEvents);
 assert.ok(all.length>100);
 assert.ok(all.every(x=>x.historicallyVerifiedChange===false));
 assert.ok(all.every(x=>GEAR_CATEGORIES.includes(x.category)));
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 const ids=new Set(HISTORICAL_ISSUE_RECORDS.map(x=>x.id));
 assert.deepEqual(new Set(all.filter(x=>x.kind.startsWith('research'))
  .map(x=>x.recordId)),ids);
 assert.equal(all.filter(x=>x.kind==='research-start').length,35);
 assert.ok(all.filter(x=>x.kind==='visual-baseline').every(x=>
  x.referenceId&&x.to!==null&&x.from===null&&!x.sourceIds.length));
 assert.ok(all.filter(x=>x.kind==='visual-change').every(x=>
  x.referenceId&&x.from!==x.to&&!x.sourceIds.length));
 assert.deepEqual(gearEvolutionForTimeline('no-such-timeline'),null);
});

test('FT1.6 independent visual events match existing same-environment snapshot deltas',()=>{
 const t=gearEvolutionForTimeline('us-army-infantry');
 const milestones=timelineGearMilestones('us-army-infantry');
 assert.ok(t);
 const first=milestones.find(x=>x.year===1990).visualSnapshots[0];
 const desert=milestones.find(x=>x.year===1991).visualSnapshots[0];
 const later=milestones.find(x=>x.year===2003).visualSnapshots[0];
 assert.equal(first.kind,'first-appearance');
 assert.equal(desert.kind,'parallel-variant');
 assert.equal(later.kind,'changed-appearance');
 const initial=gearEventsAtYear(t.timelineId,1990).filter(x=>x.referenceId===first.referenceId);
 const parallel=gearEventsAtYear(t.timelineId,1991).filter(x=>x.referenceId===desert.referenceId);
 const changed=gearEventsAtYear(t.timelineId,2003).filter(x=>x.referenceId===later.referenceId);
 assert.ok(initial.every(x=>x.kind==='visual-baseline'));
 assert.ok(parallel.every(x=>x.kind==='visual-baseline'));
 assert.equal(changed.length,later.changes.length);
 assert.ok(changed.every(x=>x.kind==='visual-change'));
 assert.deepEqual(gearEventsAtYear('not-real',2019),[]);
});

test('FT1.6 research windows never claim issue, replacement or retirement',()=>{
 const t=gearEvolutionForTimeline('us-army-infantry');
 const end=t.allEvents.filter(x=>x.kind==='research-end');
 assert.ok(end.some(x=>x.year===2019));
 assert.ok(end.every(x=>x.to===null&&x.from===null&&
  x.historicallyVerifiedChange===false));
 assert.ok(t.lanes.some(x=>x.category==='uniform'&&
  x.events.some(e=>e.issueStatus==='authorized')));
 assert.ok(t.allEvents.filter(x=>x.kind==='research-start').every(x=>
  x.sourceIds.length>0));
});

test('FT1.6 explicitly separates exact visual snapshots, period proxies and absent data',()=>{
 const exact=resolveDatedGearSnapshot({
  timelineId:'us-army-infantry',year:2003,environment:'desert',theater:'Iraq'});
 assert.equal(exact.state,'exact-visual-index');
 assert.equal(exact.visualReferenceId,'us-army-dcu-2003');
 assert.equal(exact.completeHistoricalKitVerified,false);
 assert.ok(exact.historical.some(x=>x.identityId==='us-interceptor-otv'));
 assert.ok(exact.sourceCount>0);
 assert.ok(exact.unknownHistoricalCategories.includes('carriage'));
 const proxy=resolveDatedGearSnapshot({timelineId:'bundeswehr-field',
  year:2001,environment:'woodland'});
 assert.equal(proxy.state,'period-visual-proxy');
 assert.equal(proxy.visualReferenceId,'bundeswehr-flecktarn-2000');
 assert.equal(proxy.evidenceStatus,'no-evidence');
 assert.equal(proxy.historical.length,0);
 assert.ok(proxy.contentDemand.some(x=>x.id==='g36-family'));
 const missing=resolveDatedGearSnapshot({timelineId:'bundeswehr-field',year:1800});
 assert.equal(missing.state,'no-visual');
 assert.equal(missing.visualReferenceId,null);
 assert.equal(missing.contentDemand.length,0);
 assert.ok(GEAR_CATEGORIES.every(cat=>missing.visual[cat].length===0));
});

test('FT1.6 rejects ambiguous visual environments and mismatched preferred IDs',()=>{
 const ambiguous=resolveDatedGearSnapshot({timelineId:'usmc-field',year:2010});
 assert.equal(ambiguous.state,'ambiguous-environment');
 assert.equal(ambiguous.visualReferenceId,null);
 const filtered=resolveDatedGearSnapshot({timelineId:'usmc-field',
  year:2010,environment:'desert'});
 assert.ok(filtered.visualReferenceId);
 const invalid=resolveDatedGearSnapshot({timelineId:'usmc-field',
  year:2010,environment:'desert'},'us-army-dcu-2003');
 assert.equal(invalid.state,'invalid-context');
 assert.equal(invalid.visualReferenceId,null);
 const wrongYear=resolveDatedGearSnapshot({timelineId:'us-army-infantry',
  year:1990,environment:'woodland'},'us-army-ocp-2019');
 assert.equal(wrongYear.state,'invalid-context');
});

test('FT1.6 visual comparison rejects cross-environment, cross-lineage and missing visuals',()=>{
 const a=resolveDatedGearSnapshot({timelineId:'us-army-infantry',
  year:1991,environment:'desert'});
 const b=resolveDatedGearSnapshot({timelineId:'us-army-infantry',
  year:2003,environment:'desert'});
 const comparison=compareDatedGearSnapshots(a,b);
 assert.equal(comparison.comparable,true);
 assert.ok(comparison.changes.some(x=>x.category==='uniform'));
 assert.ok(comparison.changes.every(x=>x.previous!==x.current));
 assert.ok(comparison.reason.includes('NOT a documented'));
 const woodland=resolveDatedGearSnapshot({timelineId:'us-army-infantry',
  year:1990,environment:'woodland'});
 assert.equal(compareDatedGearSnapshots(woodland,b).comparable,false);
 const other=resolveDatedGearSnapshot({timelineId:'usmc-field',
  year:2010,environment:'desert'});
 assert.equal(compareDatedGearSnapshots(other,b).comparable,false);
 const none=resolveDatedGearSnapshot({timelineId:'us-army-infantry',year:1800});
 assert.equal(compareDatedGearSnapshots(none,b).comparable,false);
});

test('FT1.6 does not infer source continuity between independently evidenced years',()=>{
 const withEvidence=resolveDatedGearSnapshot({
  timelineId:'british-army-field',year:2011,theater:'Afghanistan'});
 const noEvidence=resolveDatedGearSnapshot({
  timelineId:'british-army-field',year:2012,theater:'Afghanistan'});
 assert.ok(withEvidence.historical.some(x=>x.identityId==='uk-sa80'));
 assert.equal(noEvidence.evidenceStatus,'no-evidence');
 assert.equal(noEvidence.historical.length,0);
 assert.equal(noEvidence.completeHistoricalKitVerified,false);
});

test('FT1.6 Studio keeps comparison, dated evidence and art demand separate from equips',()=>{
 const browser=readFileSync(new URL('../src/faction-reference-browser.ts',import.meta.url),'utf8');
 assert.match(browser,/INDEPENDENT EQUIPMENT EVOLUTION/);
 assert.match(browser,/COMPARE TWO AUTHORED EQUIPMENT SNAPSHOTS/);
 assert.match(browser,/FUTURE ASSET NEEDS FOR THIS LOOK/);
 assert.match(browser,/compareDatedGearSnapshots/);
 assert.match(browser,/this\.gearTimelinePanel\.append\(panel\)/);
 assert.match(browser,/onApplyProposedEquipment/);
});
