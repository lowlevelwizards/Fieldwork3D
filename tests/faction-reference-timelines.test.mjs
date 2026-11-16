import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {FACTION_TIMELINES,TIMELINE_ORGANIZATIONS,
 factionTimeline,timelineForReference} from '../src/faction-reference-timelines.ts';
import {auditFactionTimelines,resolveTimelineYear,timelinesForOrganization,
 timelinesForReference} from '../src/faction-reference-timeline-resolver.ts';
import {referenceLookForKit,resolveFactionReference}
 from '../src/faction-reference-resolver.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';

test('FT1.0 all existing appearance references are grouped exactly once',()=>{
 const audit=auditFactionTimelines();
 assert.deepEqual(audit.issues,[]);
 assert.equal(audit.referenceCount,FACTION_REFERENCES.length);
 assert.equal(audit.referenceCount,44);
 assert.ok(audit.timelineCount>=20);
 assert.ok(audit.organizationCount>=15);
 const ids=FACTION_TIMELINES.flatMap(x=>x.snapshots.map(s=>s.referenceId));
 assert.equal(new Set(ids).size,44);
 for(const ref of FACTION_REFERENCES){
  const timeline=timelineForReference(ref.id);
  assert.ok(timeline,ref.id);
  assert.equal(timelinesForReference(ref.id).length,1,ref.id);
  assert.ok(factionTimeline(timeline.id));
 }
 assert.ok(TIMELINE_ORGANIZATIONS.some(o=>o.id==='east-german-nva'));
 assert.ok(TIMELINE_ORGANIZATIONS.some(o=>o.id==='south-african-sadf'));
 assert.ok(TIMELINE_ORGANIZATIONS.some(o=>o.id==='south-african-sandf'));
});
test('FT1.0 representative snapshots retain their dated authored ranges',()=>{
 for(const timeline of FACTION_TIMELINES)for(const snapshot of timeline.snapshots){
  const ref=FACTION_REFERENCES.find(x=>x.id===snapshot.referenceId);
  assert.ok(ref,snapshot.referenceId);
  assert.ok(ref.era.start<=snapshot.representativeYear&&
   ref.era.end>=snapshot.representativeYear,snapshot.referenceId);
  assert.equal(snapshot.environment,ref.environment);
  assert.ok(Array.isArray(timeline.equipment));
  assert.ok(Array.isArray(timeline.evidence));
  for(const record of timeline.equipment)
   assert.ok(record.evidenceIds.every(id=>timeline.evidence.some(e=>e.id===id)));
 }
});
test('FT1.0 year queries preserve overlapping theater references and deterministic ordering',()=>{
 const timeline=factionTimeline('us-army-infantry');
 assert.ok(timeline);
 const a=resolveTimelineYear(timeline,1991);
 const b=resolveTimelineYear(timeline,1991);
 assert.equal(a.status,'covered');
 assert.deepEqual(a,b);
 assert.ok(a.matches.some(m=>m.reference.id==='us-desert-1991'));
 assert.ok(a.matches.some(m=>m.reference.id==='us-army-m81-1990'));
 const desert=resolveTimelineYear(timeline,1991,'desert');
 assert.ok(desert.matches.some(m=>m.reference.id==='us-desert-1991'));
 assert.ok(desert.matches.every(m=>m.reference.environment==='desert'));
});
test('FT1.0 gaps never fabricate a valid nearby appearance',()=>{
 const timeline=factionTimeline('us-army-infantry');
 assert.ok(timeline);
 const future=resolveTimelineYear(timeline,2090);
 assert.equal(future.status,'outside-reference-range');
 assert.deepEqual(future.matches,[]);
 assert.ok(future.nearest.length>0);
 const unsupported=resolveTimelineYear(timeline,2003,'urban');
 assert.equal(unsupported.status,'coverage-gap');
 assert.deepEqual(unsupported.matches,[]);
 assert.equal(resolveTimelineYear(timeline,NaN).status,'invalid-year');
 assert.deepEqual(resolveTimelineYear(timeline,NaN).nearest,[]);
});
test('FT1.0 agency-neutral SWAT and patrol remain separate, not universal rules',()=>{
 const t=timelinesForOrganization('us-police-generic');
 assert.equal(t.length,2);
 assert.ok(t.some(x=>x.id==='us-swat-archetype'));
 assert.ok(t.some(x=>x.id==='us-police-patrol'));
 assert.equal(resolveTimelineYear(factionTimeline('us-swat-archetype'),1995).status,'covered');
});
test('FT1.0 read-only historical queries do not change existing studio recipe or equipment',()=>{
 const before=FACTION_REFERENCES.map(x=>x.id);
 const kit=initialEquipmentLoadout('smg');
 const wardrobe=initialWardrobe();
 const state=JSON.stringify({kit,wardrobe});
 const timeline=factionTimeline('us-army-infantry');
 assert.ok(timeline);
 for(const year of [1990,1991,2003,2010,2019,2050]){
  const result=resolveTimelineYear(timeline,year);
  for(const match of result.matches){
   const resolved=resolveFactionReference(match.reference.id);
   assert.equal(resolved.reference.id,match.reference.id);
  }
 }
 const applied=referenceLookForKit('us-army-m81-1990',kit,wardrobe);
 assert.ok(applied.wardrobe);
 assert.equal(JSON.stringify({kit,wardrobe}),state);
 assert.deepEqual(FACTION_REFERENCES.map(x=>x.id),before);
});
