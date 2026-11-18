import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {FACTION_TIMELINES} from '../src/faction-reference-timelines.ts';
import {HISTORICAL_EQUIPMENT} from '../src/faction-reference-historical-equipment.ts';
import {HISTORICAL_ISSUE_RECORDS} from '../src/faction-reference-equipment-data.ts';
import {HISTORICAL_EVIDENCE} from '../src/faction-reference-evidence.ts';
import {FT12_HISTORICAL_EQUIPMENT,FT12_EVIDENCE,FT12_ASSOCIATIONS}
 from '../src/faction-reference-equipment-ft1-2.ts';
import {auditHistoricalEquipment,equipmentAtYear,researchMilestoneYears,
 researchTimelineCoverage,compareEquipmentYears}
 from '../src/faction-reference-equipment-resolver.ts';
import {auditFactionTimelines,resolveTimelineYear}
 from '../src/faction-reference-timeline-resolver.ts';

const added=['bundeswehr-field','canadian-field','finnish-field',
 'australian-field','french-field'];
const ids=(timeline,year)=>equipmentAtYear(timeline,year).map(x=>x.equipment.id);

test('FT1.2 expands researched coverage to nine timelines without touching 44 snapshots',()=>{
 const report=auditHistoricalEquipment();
 assert.deepEqual(report.issues,[]);
 assert.deepEqual(auditFactionTimelines().issues,[]);
 assert.equal(report.researchedTimelines,9);
 assert.equal(report.totalTimelines,34);
 assert.equal(FACTION_REFERENCES.length,44);
 assert.equal(FACTION_TIMELINES.reduce((n,t)=>n+t.snapshots.length,0),44);
 for(const t of added)assert.ok(researchTimelineCoverage(t).records>0,t);
 const allIds=new Set(HISTORICAL_EQUIPMENT.map(x=>x.id));
 assert.equal(allIds.size,HISTORICAL_EQUIPMENT.length);
 assert.equal(HISTORICAL_EQUIPMENT.length,19+FT12_HISTORICAL_EQUIPMENT.length);
 assert.equal(HISTORICAL_EVIDENCE.length,15+FT12_EVIDENCE.length);
 assert.equal(HISTORICAL_ISSUE_RECORDS.length,16+FT12_ASSOCIATIONS.length);
});

test('FT1.2 German historical 1991 Flecktarn, 1997 G36 and 2026 arid claims remain separate',()=>{
 assert.ok(ids('bundeswehr-field',1991).includes('de-flecktarn-five'));
 assert.ok(ids('bundeswehr-field',1997).includes('de-g36'));
 assert.ok(ids('bundeswehr-field',2026).includes('de-tropentarn-three'));
 assert.ok(!ids('bundeswehr-field',2010).includes('de-tropentarn-three'));
 const g=equipmentAtYear('bundeswehr-field',1997).find(x=>x.equipment.id==='de-g36');
 assert.equal(g.equipment.model.fidelity,'representative');
 assert.equal(g.equipment.model.id,'g36-service');
});
test('FT1.2 Canadian MT introduction plan is not past confirmed TW use',()=>{
 const older=ids('canadian-field',2020);
 assert.ok(older.includes('ca-cadpat-tw'));
 assert.ok(!older.includes('ca-cadpat-mt'));
 const plan=equipmentAtYear('canadian-field',2024).find(x=>x.equipment.id==='ca-cadpat-mt');
 assert.equal(plan.record.issueStatus,'planned');
 assert.equal(plan.record.availability,'unknown');
 assert.ok(ids('canadian-field',2022).includes('ca-c7a2'));
});
test('FT1.2 Finnish supplier evidence stays tentative; government evidence is year-bound',()=>{
 const m=equipmentAtYear('finnish-field',2016).find(x=>x.equipment.id==='fi-m05');
 assert.ok(m);
 assert.equal(m.record.confidence,'tentative');
 assert.ok(ids('finnish-field',2025).includes('fi-rk62'));
 assert.ok(!ids('finnish-field',2015).includes('fi-rk62'));
 assert.equal(HISTORICAL_EQUIPMENT.find(x=>x.id==='fi-rk62').model.fidelity,'proxy');
});
test('FT1.2 Australian DPCU, helmet and F88 transitions are distinct artifacts',()=>{
 assert.ok(ids('australian-field',2001).includes('au-dpcu'));
 assert.ok(ids('australian-field',2004).includes('au-rbh303au'));
 assert.ok(ids('australian-field',2010).includes('au-f88a2'));
 assert.ok(ids('australian-field',2016).includes('au-ef88'));
 const both=ids('australian-field',2016);
 assert.ok(both.includes('au-f88a2'));
 assert.ok(both.includes('au-ef88'));
});
test('FT1.2 French BME proposed rollout is not an asserted issued 2024 uniform',()=>{
 const cce=equipmentAtYear('french-field',2022).find(x=>x.equipment.id==='fr-cce');
 assert.ok(cce);
 const next=equipmentAtYear('french-field',2024).find(x=>x.equipment.id==='fr-bme');
 assert.equal(next.record.issueStatus,'planned');
 assert.equal(next.record.availability,'unknown');
 assert.equal(HISTORICAL_EQUIPMENT.find(x=>x.id==='fr-famas-f1').model.fidelity,'proxy');
});
test('FT1.2 milestone year index and two-year comparisons are deterministic, read only',()=>{
 const before=JSON.stringify({refs:FACTION_REFERENCES,timelines:FACTION_TIMELINES,
  gear:HISTORICAL_ISSUE_RECORDS});
 for(const t of added){
  const milestoneYears=researchMilestoneYears(t);
  assert.ok(milestoneYears.length>0,t);
  assert.deepEqual(milestoneYears,[...new Set(milestoneYears)].sort((a,b)=>a-b));
  assert.deepEqual(researchTimelineCoverage(t),researchTimelineCoverage(t));
  const first=milestoneYears[0],last=milestoneYears.at(-1);
  assert.deepEqual(compareEquipmentYears(t,first,last),
   compareEquipmentYears(t,first,last));
 }
 assert.deepEqual(researchMilestoneYears('unknown'),[]);
 assert.equal(JSON.stringify({refs:FACTION_REFERENCES,timelines:FACTION_TIMELINES,
  gear:HISTORICAL_ISSUE_RECORDS}),before);
});
test('FT1.2 historical research can exist without an authored snapshot or issued model',()=>{
 const g=FACTION_TIMELINES.find(t=>t.id==='bundeswehr-field');
 assert.ok(g);
 assert.equal(resolveTimelineYear(g,2026).matches.length,0);
 assert.ok(equipmentAtYear(g.id,2026).length>0);
 const f=HISTORICAL_EQUIPMENT.find(x=>x.id==='fr-bme');
 assert.equal(f.model,undefined);
 assert.equal(equipmentAtYear('french-field',2040).length,0);
});
test('FT1.2 all sources are distinct HTTPS documents, all records have known identities',()=>{
 const sources=new Set(HISTORICAL_EVIDENCE.map(x=>x.id));
 const gear=new Set(HISTORICAL_EQUIPMENT.map(x=>x.id));
 for(const s of HISTORICAL_EVIDENCE)assert.ok(s.url.startsWith('https://'),s.id);
 for(const a of HISTORICAL_ISSUE_RECORDS){
  assert.ok(gear.has(a.historicalEquipmentId),a.id);
  assert.ok(a.evidenceIds.length,a.id);
  for(const id of a.evidenceIds)assert.ok(sources.has(id),id);
  if(a.issueStatus==='planned')assert.notEqual(a.availability,'standard');
 }
});
