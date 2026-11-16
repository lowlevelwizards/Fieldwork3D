import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {FACTION_TIMELINES} from '../src/faction-reference-timelines.ts';
import {
 CAMPAIGN_CONTENT_DOMAINS,DISPATCH_STARTER_REFERENCE_IDS,
 dispatchReferenceContext,dispatchStarterReferenceContexts,
 dispatchStarterOrganizations,DISPATCH_STARTER_ORGANIZATION_SCOPES,
 auditDispatchStarterReferences
} from '../src/dispatch-content-foundation.ts';

test('D1.1 seeds only the four already-authored police appearances',()=>{
 assert.deepEqual([...CAMPAIGN_CONTENT_DOMAINS],
  ['dispatch','operations','wasteland']);
 assert.deepEqual([...DISPATCH_STARTER_REFERENCE_IDS],[
  'us-swat-mp5-1995','us-swat-2015',
  'us-police-polo-2020','russian-omon-2002'
 ]);
 assert.deepEqual(auditDispatchStarterReferences(),[]);
 assert.equal(dispatchStarterReferenceContexts().length,4);
 for(const context of dispatchStarterReferenceContexts()){
  assert.equal(context.domain,'dispatch');
  assert.equal(context.evidenceScope,'visual-reference-only');
  const ref=FACTION_REFERENCES.find(r=>r.id===context.referenceId);
  assert.ok(ref);
  assert.equal(ref.organization,'police');
  const timeline=FACTION_TIMELINES.find(t=>t.id===context.timelineId);
  assert.ok(timeline);
  assert.equal(timeline.organizationId,context.organizationId);
  assert.equal(timeline.role,context.role);
  const snapshot=timeline.snapshots.find(s=>s.referenceId===context.referenceId);
  assert.ok(snapshot);
  assert.equal(snapshot.representativeYear,context.representativeYear);
 }
});

test('D1.1 keeps patrol, modern SWAT, MP5-era SWAT and OMON distinct',()=>{
 assert.deepEqual(
  dispatchStarterReferenceContexts().map(x=>[x.referenceId,x.organizationId,x.role]),[
   ['us-swat-mp5-1995','us-police-generic','tactical-police'],
   ['us-swat-2015','us-police-generic','tactical-police'],
   ['us-police-polo-2020','us-police-generic','patrol'],
   ['russian-omon-2002','russian-omon','tactical-police']
  ]);
 assert.equal(dispatchReferenceContext('us-army-m81-1990'),null);
 assert.equal(dispatchReferenceContext('private-security-iraq-2007'),null);
 assert.equal(dispatchReferenceContext('unknown-reference'),null);
});

test('D1.1 associations read source references without modifying them',()=>{
 const baseline=JSON.stringify({references:FACTION_REFERENCES,timelines:FACTION_TIMELINES});
 const a=dispatchStarterReferenceContexts();
 const b=dispatchStarterReferenceContexts();
 assert.deepEqual(a,b);
 assert.notStrictEqual(a,b);
 assert.equal(JSON.stringify({references:FACTION_REFERENCES,timelines:FACTION_TIMELINES}),
  baseline);
 assert.equal(Object.isFrozen(a[0]),true);
});

test('D1.2 groups existing looks under only two canonical organization identities',()=>{
 const organizations=dispatchStarterOrganizations();
 assert.deepEqual(organizations.map(x=>[x.id,x.country,x.classification,x.scope]),[
  ['us-police-generic','United States','police','agency-neutral'],
  ['russian-omon','Russia','police','unit-family']
 ]);
 assert.deepEqual(organizations[0].roles.map(x=>[x.timelineId,x.role,x.snapshots.map(s=>s.referenceId)]),[
  ['us-swat-archetype','tactical-police',['us-swat-mp5-1995','us-swat-2015']],
  ['us-police-patrol','patrol',['us-police-polo-2020']]
 ]);
 assert.deepEqual(organizations[1].roles.map(x=>[x.timelineId,x.role,x.snapshots.map(s=>s.referenceId)]),[
  ['russian-omon','tactical-police',['russian-omon-2002']]
 ]);
 assert.deepEqual(organizations[0].roles[0].snapshots.map(x=>x.representativeYear),
  [1995,2015]);
 assert.deepEqual(Object.keys(DISPATCH_STARTER_ORGANIZATION_SCOPES).sort(),
  ['russian-omon','us-police-generic']);
});

test('D1.2 uses timeline-authoritative names and remains immutable, stable and read-only',()=>{
 const before=JSON.stringify({references:FACTION_REFERENCES,timelines:FACTION_TIMELINES});
 const a=dispatchStarterOrganizations(),b=dispatchStarterOrganizations();
 assert.deepEqual(a,b);
 assert.notStrictEqual(a,b);
 assert.ok(Object.isFrozen(a));
 for(const org of a){
  assert.ok(Object.isFrozen(org));
  assert.ok(Object.isFrozen(org.roles));
  for(const role of org.roles){
   assert.ok(Object.isFrozen(role));
   assert.ok(Object.isFrozen(role.snapshots));
   for(const snapshot of role.snapshots)assert.ok(Object.isFrozen(snapshot));
  }
 }
 const us=FACTION_TIMELINES.find(x=>x.id==='us-swat-archetype');
 assert.equal(a[0].roles[0].label,us.label);
 assert.equal(JSON.stringify({references:FACTION_REFERENCES,timelines:FACTION_TIMELINES}),
  before);
 assert.deepEqual(auditDispatchStarterReferences(),[]);
});
