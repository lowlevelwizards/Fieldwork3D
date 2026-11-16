import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {referenceGapFidelity} from '../src/faction-reference-asset-registry.ts';
import {referenceVisualStatus} from '../src/faction-reference-audit.ts';
import {referenceWeaponChoice} from '../src/faction-reference-weapons.ts';
import {
 dispatchReferenceCoverage,dispatchStarterCoverage,auditDispatchStarterCoverage
} from '../src/dispatch-reference-coverage.ts';
import {DISPATCH_STARTER_REFERENCE_IDS}
 from '../src/dispatch-content-foundation.ts';

test('D1.3 covers only the same four authored police looks',()=>{
 const reports=dispatchStarterCoverage();
 assert.equal(reports.length,4);
 assert.deepEqual(reports.map(x=>x.context.referenceId),
  [...DISPATCH_STARTER_REFERENCE_IDS]);
 assert.equal(dispatchReferenceCoverage('us-army-m81-1990'),null);
 assert.equal(dispatchReferenceCoverage('private-security-iraq-2007'),null);
 assert.equal(dispatchReferenceCoverage('unknown'),null);
 assert.deepEqual(auditDispatchStarterCoverage(),[]);
 for(const report of reports){
  assert.equal(report.coverageScope,'authored-visual-gaps-only');
  assert.equal(report.completeHistoricalKitVerified,false);
  assert.equal(report.context.evidenceScope,'visual-reference-only');
  assert.equal(report.historicalIssueResearch,'no-associated-records');
 }
});

test('D1.3 reflects existing gap fidelity and weapon preview without inventing accuracy',()=>{
 for(const report of dispatchStarterCoverage()){
  const reference=FACTION_REFERENCES.find(x=>x.id===report.context.referenceId);
  assert.ok(reference);
  assert.equal(report.referenceName,reference.name);
  assert.deepEqual(report.era,reference.era);
  assert.equal(report.sourceNotes,reference.sourceNotes);
  assert.equal(report.visualStatus,referenceVisualStatus(reference));
  const weapon=referenceWeaponChoice(reference.id);
  assert.deepEqual(report.weaponPreview,{
   presetId:weapon.presetId,fidelity:weapon.fidelity
  });
  assert.deepEqual(report.authoredGaps.map(x=>({
   id:x.id,label:x.label,importance:x.importance,fidelity:x.fidelity
  })),reference.gaps.map(gap=>({
   id:gap.id,label:gap.label,importance:gap.importance,
   fidelity:referenceGapFidelity(reference,gap)
  })));
  assert.equal(Object.values(report.counts).reduce((a,b)=>a+b,0),
   reference.gaps.length);
 }
 const patrol=dispatchReferenceCoverage('us-police-polo-2020');
 assert.ok(patrol);
 assert.deepEqual(patrol.weaponPreview,{presetId:'ar-m4a1',fidelity:'proxy'});
 assert.match(patrol.sourceNotes,/long-gun preview is required by the game/);
 const classic=dispatchReferenceCoverage('us-swat-mp5-1995');
 assert.ok(classic);
 assert.deepEqual(classic.weaponPreview,{presetId:'hk-mp5a3',fidelity:'representative'});
 const modern=dispatchReferenceCoverage('us-swat-2015');
 assert.ok(modern);
 assert.equal(modern.authoredGaps.find(x=>x.id==='police-marking')?.fidelity,'exact');
 const omon=dispatchReferenceCoverage('russian-omon-2002');
 assert.ok(omon);
 assert.equal(omon.weaponPreview.fidelity,'representative');
 assert.ok(omon.authoredGaps.some(x=>x.id==='visor-police'&&x.importance==='defining'));
});

test('D1.3 returns detached immutable reports without altering existing catalogs',()=>{
 const before=JSON.stringify(FACTION_REFERENCES);
 const a=dispatchStarterCoverage(),b=dispatchStarterCoverage();
 assert.deepEqual(a,b);
 assert.notStrictEqual(a,b);
 assert.ok(Object.isFrozen(a));
 for(const report of a){
  assert.ok(Object.isFrozen(report));
  assert.ok(Object.isFrozen(report.era));
  assert.ok(Object.isFrozen(report.weaponPreview));
  assert.ok(Object.isFrozen(report.counts));
  assert.ok(Object.isFrozen(report.authoredGaps));
  for(const gap of report.authoredGaps)assert.ok(Object.isFrozen(gap));
 }
 assert.equal(JSON.stringify(FACTION_REFERENCES),before);
});
