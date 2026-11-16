/** Dispatch D1.3: inspect the four existing authored looks, not a content
 * promise or item availability policy. Coverage concerns only explicitly
 * authored visual gaps; no whole-kit completeness can be inferred.
 */
import {factionReference,type ReferenceGap} from './faction-reference-catalog.ts';
import {referenceGapFidelity,type ReferenceGapFidelity}
 from './faction-reference-asset-registry.ts';
import {referenceVisualStatus} from './faction-reference-audit.ts';
import {referenceWeaponChoice,type ReferenceWeaponFidelity}
 from './faction-reference-weapons.ts';
import {factionTimeline} from './faction-reference-timelines.ts';
import {DISPATCH_STARTER_REFERENCE_IDS,dispatchReferenceContext,
 type DispatchReferenceContext} from './dispatch-content-foundation.ts';

export type DispatchAuthoredGap=Readonly<{
 id:string;label:string;importance:ReferenceGap['importance'];
 fidelity:ReferenceGapFidelity;
}>;
export type DispatchReferenceCoverage=Readonly<{
 context:DispatchReferenceContext;
 referenceName:string;
 era:Readonly<{start:number;end:number;label:string}>;
 /** Existing FT1.x visual assessment; NOT an authenticity certificate. */
 visualStatus:ReturnType<typeof referenceVisualStatus>;
 weaponPreview:Readonly<{presetId:string;fidelity:ReferenceWeaponFidelity}>;
 /** A gap is 'exact' only for that specific authored requirement. */
 authoredGaps:readonly DispatchAuthoredGap[];
 counts:Readonly<Record<ReferenceGapFidelity,number>>;
 historicalIssueResearch:'has-associated-records'|'no-associated-records';
 sourceNotes:string;
 gearFitNote:string|null;
 coverageScope:'authored-visual-gaps-only';
 completeHistoricalKitVerified:false;
}>;

/** Unsupported IDs return null, so this cannot be used as a blanket police
 * catalog or a fallback for military/security/fictional references.
 */
export function dispatchReferenceCoverage(referenceId:string):
 DispatchReferenceCoverage|null{
 const context=dispatchReferenceContext(referenceId);
 const reference=context?factionReference(referenceId):undefined;
 const timeline=context?factionTimeline(context.timelineId):undefined;
 if(!context||!reference||!timeline)return null;
 const gaps=reference.gaps.map(gap=>Object.freeze({
  id:gap.id,label:gap.label,importance:gap.importance,
  fidelity:referenceGapFidelity(reference,gap)
 }));
 const counts:Record<ReferenceGapFidelity,number>=
  {exact:0,approximate:0,missing:0};
 for(const gap of gaps)counts[gap.fidelity]++;
 const weapon=referenceWeaponChoice(referenceId);
 return Object.freeze({
  context,referenceName:reference.name,
  era:Object.freeze({...reference.era}),
  visualStatus:referenceVisualStatus(reference),
  weaponPreview:Object.freeze({presetId:weapon.presetId,fidelity:weapon.fidelity}),
  authoredGaps:Object.freeze(gaps),
  counts:Object.freeze(counts),
  historicalIssueResearch:timeline.equipment.length?
   'has-associated-records':'no-associated-records',
  sourceNotes:reference.sourceNotes,
  gearFitNote:reference.gearFitNote??null,
  coverageScope:'authored-visual-gaps-only' as const,
  completeHistoricalKitVerified:false as const
 });
}

/** Deterministic, catalog-order view, with no new appearance or asset IDs. */
export function dispatchStarterCoverage():readonly DispatchReferenceCoverage[]{
 return Object.freeze(DISPATCH_STARTER_REFERENCE_IDS.flatMap(id=>{
  const coverage=dispatchReferenceCoverage(id);
  return coverage?[coverage]:[];
 }));
}

/** Integrity audit is separate from the appearance-level validity checks.
 * It catches lost/duplicated gap records and mismatches to source data.
 */
export function auditDispatchStarterCoverage():readonly string[]{
 const issues:string[]=[];
 const reports=dispatchStarterCoverage();
 if(reports.length!==DISPATCH_STARTER_REFERENCE_IDS.length)
  issues.push('Missing Dispatch starter coverage report');
 for(const report of reports){
  const reference=factionReference(report.context.referenceId);
  if(!reference)continue;
  const ids=report.authoredGaps.map(gap=>gap.id);
  if(new Set(ids).size!==ids.length)
   issues.push('Duplicate authored visual gap: '+reference.id);
  if(ids.length!==reference.gaps.length)
   issues.push('Dropped authored visual gap: '+reference.id);
  if(report.counts.exact+report.counts.approximate+report.counts.missing!==ids.length)
   issues.push('Inconsistent visual gap count: '+reference.id);
 }
 return issues;
}
