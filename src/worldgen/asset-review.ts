/** Human art review remains explicit, never inferred from whether a model renders. */
import {assetLibrary} from './asset-library.ts';
import {CHARACTER_FIXTURE_IDS} from './asset-character-visuals.ts';
import {DETAILED_FIXTURE_IDS} from './detailed-fixture-visuals.ts';
import {WORLD_UNITS_PER_METRE} from './world-scale.ts';
export type ArtReviewStatus='needs-review'|'needs-cleanup'|'needs-redesign'|'approved';
export type ArtReviewDimension='silhouette'|'construction'|'proportions'|'materials'|'personality'|'tacticalReadability';
export const ART_REVIEW_DIMENSIONS:readonly ArtReviewDimension[]=['silhouette','construction','proportions','materials','personality','tacticalReadability'];
export type AssetReview={id:string;category:string;status:ArtReviewStatus;
  metres:readonly [number,number,number];modelFamily:'character'|'detailed'|'shared'|'architectural'|'dressing';
  scores:Readonly<Record<ArtReviewDimension,number|null>>;notes:readonly string[]};
const flagged:Readonly<Record<string,readonly string[]>>={
 'office-chair':['Replace unsupported-looking arm posts and rudimentary caster base'],
 'shower':['Reconnect pipe, head and controls to panel; establish door opening'],
 'bike-rack':['Horizontal half-torus produces C-shaped plan silhouette'],
 'sedan':['Cabin sits too high; distinguish hood, roof and rear deck'],
 'van':['Featureless single cargo slab; define passenger and loading compartments'],
 'suv':['Differentiate window pillars, rear hatch and roof'],
 'tree-broadleaf':['Replace equal-size canopy blobs with asymmetric branching'],
 'tree-conifer':['Avoid identical stacked cones'],
 'tree-scrub':['Differentiate low branching from scaled-down tree'],
};
export function assetReviewInventory():readonly AssetReview[]{
 return assetLibrary().map(entry=>{
  const modelFamily=entry.origin==='structure'?'architectural':
    entry.origin==='dressing'?'dressing':
    CHARACTER_FIXTURE_IDS.has(entry.id)?'character':
    DETAILED_FIXTURE_IDS.has(entry.id)?'detailed':'shared';
  const scores=Object.fromEntries(ART_REVIEW_DIMENSIONS.map(d=>[d,null])) as Record<ArtReviewDimension,number|null>;
  return {id:entry.id,category:entry.category,
   status:flagged[entry.id]?'needs-cleanup' as const:'needs-review' as const,
   metres:[entry.width,entry.depth,entry.height].map(n=>Number((n/WORLD_UNITS_PER_METRE).toFixed(3))) as [number,number,number],
   modelFamily,scores,notes:flagged[entry.id]??[]};
 });
}
export const REVIEW_PRIORITY=Object.keys(flagged);
