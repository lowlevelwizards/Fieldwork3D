/** FT1.4E: derive actionable per-context quality from existing data only.
 * No new faction/weapon/equipment identities, issue facts, or visual meshes.
 */
import type {HistoricalGenerationContext}
 from './faction-reference-equipment-eligibility.ts';
import {historicalEquipmentEligibility} from './faction-reference-equipment-eligibility.ts';
import {generateHistoricalLoadout,type GenerationMode}
 from './faction-reference-loadout-generator.ts';
import {existingVisualProxyForContext} from './faction-reference-visual-proxy.ts';
import {prioritizeContentDemand} from './faction-reference-content-demand.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
export type ContextQualityAudit={
 timelineId:string;year:number;historicalStatus:'eligible'|'no-evidence'|'invalid-context';
 eligibleResearchRecords:number;proposedCategories:number;
 playableCategories:number;proxyOnlyCategories:number;missingCategories:readonly string[];
 historicalClaimsVerifiedAsCompleteKit:false;
 visualReferenceId:string|null;visualReferenceIsPeriodMatch:boolean;
 relevantContentQueue:ReturnType<typeof prioritizeContentDemand>;
};
export function auditHistoricalContext(
 context:HistoricalGenerationContext,mode:GenerationMode='evidence-backed',
 baseline?:EquipmentLoadout):ContextQualityAudit{
 const eligible=historicalEquipmentEligibility(context);
 const proposal=generateHistoricalLoadout({context,mode,baseline});
 const proxy=existingVisualProxyForContext(context);
 const ref=proxy.compatibleForPreview?proxy.referenceId:undefined;
 const relevantContentQueue=ref?
  prioritizeContentDemand().filter(row=>row.affectedReferenceIds.includes(ref)):[];
 return {timelineId:context.timelineId,year:context.year,
  historicalStatus:eligible.status,eligibleResearchRecords:eligible.items.length,
  proposedCategories:proposal.ensemble.researchedCategoryCount,
  playableCategories:proposal.ensemble.visuallyRepresentedCount,
  proxyOnlyCategories:proposal.ensemble.proxyOnlyCount,
  missingCategories:proposal.unresolvedCategories,
  historicalClaimsVerifiedAsCompleteKit:false,
  visualReferenceId:ref??null,visualReferenceIsPeriodMatch:!!ref,
  relevantContentQueue};
}
