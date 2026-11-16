/** FT1.4C: reuse existing authored appearances as VISUAL ONLY proxies.
 * A reference kit's era span is not item-issue evidence, and a nearest
 * snapshot is advisory; no unseen year is silently backfilled.
 */
import type {HistoricalGenerationContext}
 from './faction-reference-equipment-eligibility.ts';
import {timelineById,resolveTimelineYear}
 from './faction-reference-timeline-resolver.ts';
import {referenceVisualStatus} from './faction-reference-audit.ts';
export type ExistingVisualProxy={
 status:'dated-visual-reference'|'nearest-advisory'|'no-reference'|'invalid-context';
 referenceId?:string;referenceYear?:number;
 visualQuality?:'recognizable-approximation'|'missing-defining-assets';
 compatibleForPreview:boolean;
 explanation:string;
};
export function existingVisualProxyForContext(
 context:HistoricalGenerationContext):ExistingVisualProxy{
 const timeline=timelineById(context.timelineId);
 if(!timeline)return {status:'invalid-context',compatibleForPreview:false,
  explanation:'Unknown research timeline'};
 const found=resolveTimelineYear(timeline,context.year,context.environment);
 const match=found.matches[0];
 if(match)return {status:'dated-visual-reference',
  referenceId:match.reference.id,referenceYear:match.snapshot.representativeYear,
  visualQuality:referenceVisualStatus(match.reference),compatibleForPreview:true,
  explanation:'Existing appearance reference covers this year. It is a visual stand-in only: its equipment is not independently evidenced for this context.'};
 const nearest=found.nearest[0];
 if(nearest)return {status:'nearest-advisory',
  referenceId:nearest.reference.id,referenceYear:nearest.snapshot.representativeYear,
  visualQuality:referenceVisualStatus(nearest.reference),compatibleForPreview:false,
  explanation:'Only a nearest-year visual reference exists. Do not automatically apply it to a historically unsupported date.'};
 return {status:found.status==='invalid-year'?'invalid-context':'no-reference',
  compatibleForPreview:false,
  explanation:'No authored appearance reference can be safely previewed for this year/environment'};
}
