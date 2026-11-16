import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {FACTION_TIMELINES,factionTimeline} from '../src/faction-reference-timelines.ts';
import {HISTORICAL_ISSUE_RECORDS} from '../src/faction-reference-equipment-data.ts';
import {HISTORICAL_EVIDENCE} from '../src/faction-reference-evidence.ts';
import {HISTORICAL_EQUIPMENT} from '../src/faction-reference-historical-equipment.ts';
import {auditHistoricalEquipment,equipmentAtYear,compareEquipmentYears}
 from '../src/faction-reference-equipment-resolver.ts';
import {auditFactionTimelines,resolveTimelineYear}
 from '../src/faction-reference-timeline-resolver.ts';

test('FT1.1 all researched records resolve without rewriting FT1.0 appearances',()=>{
 const a=auditHistoricalEquipment();
 assert.deepEqual(a.issues,[]);
 assert.equal(a.researchedTimelines,4);
 assert.ok(a.associations>=15);
 assert.ok(a.sourcedClaims>=10);
 assert.equal(a.totalTimelines,34);
 assert.equal(FACTION_REFERENCES.length,44);
 assert.deepEqual(auditFactionTimelines().issues,[]);
 const ids=FACTION_TIMELINES.flatMap(t=>t.snapshots.map(x=>x.referenceId));
 assert.equal(ids.length,44);
 assert.equal(new Set(ids).size,44);
});
test('FT1.1 a historical equipment ID is not a generic gameplay or model proxy',()=>{
 assert.ok(HISTORICAL_EQUIPMENT.some(x=>x.id==='uk-sa80'&&x.model?.fidelity==='proxy'));
 assert.ok(HISTORICAL_EQUIPMENT.some(x=>x.id==='us-m16a2'&&x.model?.kind==='weapon-preset'));
 const all=new Set(HISTORICAL_EQUIPMENT.map(x=>x.id));
 assert.equal(all.size,HISTORICAL_EQUIPMENT.length);
 for(const item of HISTORICAL_ISSUE_RECORDS){
  assert.ok(all.has(item.historicalEquipmentId),item.id);
  assert.ok(item.evidenceIds.length,item.id);
 }
});
test('FT1.1 OCP and UCP coexist during transition; OEF-CP stays distinct',()=>{
 const gear=equipmentAtYear('us-army-infantry',2016).map(x=>x.equipment.id);
 assert.ok(gear.includes('us-acu-ucp'));
 assert.ok(gear.includes('us-acu-ocp'));
 assert.ok(!gear.includes('us-fracu-oefcp'));
 const inAfghan=equipmentAtYear('us-army-infantry',2010,'mixed');
 assert.ok(inAfghan.some(x=>x.equipment.id==='us-fracu-oefcp'));
});
test('FT1.1 planned gear not treated as issued, tentative date not labeled verified',()=>{
 const marines=equipmentAtYear('usmc-field',2006);
 assert.ok(marines.some(x=>x.equipment.id==='usmc-mtv'&&x.record.issueStatus==='planned'));
 assert.ok(marines.some(x=>x.equipment.id==='usmc-lwh'&&x.record.issueStatus==='documented-use'));
 const nva=equipmentAtYear('nva-field',1980);
 assert.ok(nva.some(x=>x.equipment.id==='ddr-m56'&&
  x.record.confidence==='tentative'&&x.record.datePrecision==='approximate'));
 assert.ok(!nva.some(x=>x.equipment.id==='ddr-strichtarn'));
 assert.ok(equipmentAtYear('nva-field',1981).some(x=>x.equipment.id==='ddr-strichtarn'));
});
test('FT1.1 comparisons mean research coverage, never retirement',()=>{
 const a=compareEquipmentYears('us-army-infantry',2010,2016);
 assert.ok(a.newlyDocumented.some(x=>x.equipment.id==='us-acu-ocp'));
 assert.ok(a.notDocumentedInSecond.some(x=>x.equipment.id==='us-fracu-oefcp'));
 assert.deepEqual(a,compareEquipmentYears('us-army-infantry',2010,2016));
 assert.deepEqual(equipmentAtYear('us-army-infantry',NaN),[]);
 assert.deepEqual(equipmentAtYear('us-army-infantry',2200),[]);
 assert.deepEqual(equipmentAtYear('unknown-faction',2016),[]);
});
test('FT1.1 research exists independently from dated visual snapshots',()=>{
 const t=factionTimeline('british-army-field');
 assert.ok(t);
 const gear=equipmentAtYear(t.id,2010);
 assert.ok(gear.some(x=>x.equipment.id==='uk-mtp'));
 const appearance=resolveTimelineYear(t,2010);
 assert.equal(appearance.status,'coverage-gap');
 assert.equal(appearance.matches.length,0);
});
test('FT1.1 evidence is attached only to claims and source links remain HTTPS',()=>{
 const idSet=new Set(HISTORICAL_EVIDENCE.map(x=>x.id));
 for(const record of HISTORICAL_ISSUE_RECORDS){
  for(const id of record.evidenceIds)assert.ok(idSet.has(id),id);
  assert.ok(record.note);
  assert.ok(record.startYear<=record.endYear);
 }
 for(const source of HISTORICAL_EVIDENCE){
  assert.ok(source.url.startsWith('https://'),source.id);
  assert.ok(source.claim,source.id);
 }
 const uk=FACTION_TIMELINES.find(x=>x.id==='british-army-field');
 assert.ok(uk.evidence.length>0);
 assert.ok(uk.equipment.length>0);
});
test('FT1.1 queries are read only and do not introduce campaign state',()=>{
 const before=JSON.stringify({refs:FACTION_REFERENCES,timelines:FACTION_TIMELINES});
 for(let year=1980;year<=2020;year+=5){
  equipmentAtYear('us-army-infantry',year);
  compareEquipmentYears('usmc-field',year,year+5);
 }
 assert.equal(JSON.stringify({refs:FACTION_REFERENCES,timelines:FACTION_TIMELINES}),before);
});
