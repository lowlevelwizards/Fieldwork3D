import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {FACTION_TIMELINES,TIMELINE_ORGANIZATIONS}
 from '../src/faction-reference-timelines.ts';
import {HISTORICAL_ISSUE_RECORDS}
 from '../src/faction-reference-equipment-data.ts';
import {HISTORICAL_EQUIPMENT}
 from '../src/faction-reference-historical-equipment.ts';
import {consolidatedFactions,timelineGearMilestones,referenceGearSettings,
 compareReferenceGear,GEAR_CATEGORIES}
 from '../src/faction-reference-gear-chronology.ts';
import {LOADOUT_SLOTS} from '../src/equipment-catalog.ts';

test('FT1.5 every existing reference belongs to one faction, role and visual snapshot',()=>{
 assert.equal(FACTION_REFERENCES.length,44);
 assert.equal(FACTION_TIMELINES.length,34);
 assert.equal(HISTORICAL_EQUIPMENT.length,40);
 assert.equal(HISTORICAL_ISSUE_RECORDS.length,37);
 const factions=consolidatedFactions();
 assert.equal(factions.length,TIMELINE_ORGANIZATIONS.length);
 assert.equal(factions.reduce((n,f)=>n+f.referenceCount,0),44);
 assert.equal(factions.reduce((n,f)=>n+f.timelines.length,0),34);
 const snapshotIds=factions.flatMap(f=>f.timelines.flatMap(t=>t.snapshots.map(s=>s.referenceId)));
 assert.equal(new Set(snapshotIds).size,44);
 assert.deepEqual([...snapshotIds].sort(),FACTION_REFERENCES.map(r=>r.id).sort());
 assert.equal(new Set(factions.map(f=>f.organization.id)).size,factions.length);
 for(const faction of factions){
  assert.ok(faction.timelines.every(t=>t.organizationId===faction.organization.id));
  assert.equal(faction.researchRecordCount,faction.timelines.reduce((n,t)=>n+t.equipment.length,0));
 }
 const army=factions.find(x=>x.organization.id==='us-army');
 assert.deepEqual(army.timelines.map(x=>x.id).sort(),
  ['us-army-infantry','us-army-recon']);
 const police=factions.find(x=>x.organization.id==='us-police-generic');
 assert.deepEqual(police.timelines.map(x=>x.id).sort(),
  ['us-police-patrol','us-swat-archetype']);
 const nva=factions.find(x=>x.organization.id==='east-german-nva');
 const modernGerman=factions.find(x=>x.organization.id==='bundeswehr');
 assert.notEqual(nva.organization.id,modernGerman.organization.id);
});
test('FT1.5 all 13 game slots and separately configured appearance channels are categorized',()=>{
 const gear=referenceGearSettings('us-army-dcu-2003');
 assert.deepEqual(Object.keys(gear),[...GEAR_CATEGORIES]);
 const entries=GEAR_CATEGORIES.flatMap(category=>
  gear[category].map(s=>({category,key:s.key,value:s.value})));
 for(const slot of LOADOUT_SLOTS)
  assert.ok(entries.some(x=>x.key==='equipment.'+slot),'missing equipment '+slot);
 for(const slot of ['top','trousers','headwear','armorStyle','rigStyle','packStyle'])
  assert.ok(entries.some(x=>x.key==='style.'+slot),'missing style '+slot);
 assert.ok(entries.some(x=>x.category==='weapon'&&x.key==='preset'));
 assert.ok(entries.some(x=>x.category==='weapon'&&x.key==='modelFidelity'));
 assert.ok(gear.uniform.some(x=>x.key.includes('fabric.top.print')));
 assert.deepEqual(referenceGearSettings('us-army-dcu-2003'),gear);
});
test('FT1.5 changes compare each existing slot, never infer switches from environment',()=>{
 const timeline=timelineGearMilestones('us-army-infantry');
 assert.deepEqual(timeline.map(x=>x.year),[1981,1990,1991,2003,2008,2010,2015,2019]);
 const first=timeline.find(x=>x.year===1990).visualSnapshots[0];
 assert.equal(first.kind,'first-appearance');
 assert.equal(first.changes.length,0);
 const desert=timeline.find(x=>x.year===1991).visualSnapshots[0];
 assert.equal(desert.kind,'parallel-variant');
 assert.equal(desert.changes.length,0);
 const later=timeline.find(x=>x.year===2003).visualSnapshots[0];
 assert.equal(later.kind,'changed-appearance');
 assert.ok(later.changes.some(x=>x.category==='uniform'));
 assert.ok(later.changes.some(x=>x.category==='armor'||x.category==='carriage'));
 assert.deepEqual(later.changes,
  compareReferenceGear('us-desert-1991','us-army-dcu-2003'));
 assert.ok(later.changes.every(x=>x.previous!==x.current));
});
test('FT1.5 same-year multiple source milestones remain distinct from visual snapshots',()=>{
 const rows=timelineGearMilestones('us-army-infantry');
 const year2003=rows.find(x=>x.year===2003);
 assert.equal(year2003.visualSnapshots.length,1);
 assert.ok(year2003.researchMarkers.some(x=>x.historicalEquipmentId==='us-ach'));
 assert.ok(year2003.researchMarkers.some(x=>x.historicalEquipmentId==='us-interceptor-otv'));
 const year2019=rows.find(x=>x.year===2019);
 assert.ok(year2019.researchMarkers.some(x=>x.marker==='research-window-end'));
 assert.ok(year2019.researchMarkers.every(x=>x.note&&x.evidenceIds.length));
 assert.equal(rows.some(x=>x.year===2004),false);
 assert.equal(timelineGearMilestones('does-not-exist').length,0);
});
test('FT1.5 sourced snapshots do not create unsourced gear or date history',()=>{
 const points=FACTION_TIMELINES.flatMap(t=>timelineGearMilestones(t.id));
 const visuals=points.flatMap(x=>x.visualSnapshots);
 assert.equal(visuals.length,44);
 assert.deepEqual(visuals.map(x=>x.referenceId).sort(),
  FACTION_REFERENCES.map(x=>x.id).sort());
 assert.ok(visuals.every(v=>v.context==='authored-visual-reference'));
 const sourceIds=new Set(HISTORICAL_ISSUE_RECORDS.map(x=>x.id));
 const markers=points.flatMap(x=>x.researchMarkers);
 assert.ok(markers.every(x=>sourceIds.has(x.recordId)));
 assert.equal(markers.filter(x=>x.marker==='research-window-start').length,37);
 assert.ok(markers.every(x=>x.marker!=='research-window-end'||
  HISTORICAL_ISSUE_RECORDS.find(r=>r.id===x.recordId).endYear===x.year));
});
test('FT1.5 UI is grouped by faction -> role and shows source-separated per-slot changes',()=>{
 const studio=readFileSync(new URL('../src/faction-reference-browser.ts',import.meta.url),'utf8');
 assert.match(studio,/FACTIONS \/ TIMELINES/);
 assert.match(studio,/Choose faction/);
 assert.match(studio,/Choose role timeline/);
 assert.match(studio,/EQUIPMENT CHANGE SNAPSHOTS/);
 assert.match(studio,/this\.renderGearChronology\(active\)/);
 assert.match(studio,/END OF RESEARCHED WINDOW \(NOT RETIREMENT\)/);
 assert.match(studio,/snapshot\.changes/);
 assert.match(studio,/this\.select\(snapshot\.referenceId\)/);
 assert.match(studio,/onApplyProposedEquipment/);
});

test('refreshed visual gear snapshots expose independent footwear, belt and weapon attachments',()=>{
 for(const ref of FACTION_REFERENCES){
  const settings=referenceGearSettings(ref.id);
  assert.ok(settings.footwear.some(x=>x.key==='equipment.feet'&&x.value===ref.kit.feet),ref.id);
  assert.ok(settings.footwear.some(x=>x.key==='detail.footwearColor'),ref.id);
  assert.ok(settings.carriage.some(x=>x.key==='equipment.belt'),ref.id);
  assert.ok(settings.weapon.some(x=>x.key.startsWith('attachment.')),ref.id);
 }
});
