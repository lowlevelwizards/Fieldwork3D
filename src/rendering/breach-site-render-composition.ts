/** C2: One render-only site composition sequence for first paint and swaps.
 * This module owns no scene, renderer, simulation or GPU resources.
 * Caller owns the build port and its C1 resource lifetimes. Keep the order:
 * site objects -> static batches -> material shader treatment.
 */
import type {Site} from '../breach-site.ts';
import type {SiteSceneBuildPort} from './breach-site-scene-builder.ts';
import {buildSiteWorld,finalizeStaticSiteBatches}
  from './breach-site-scene-builder.ts';
import {applyWorldGraphicLighting} from '../breach-graphic-world-lighting.ts';

export type SiteRenderCompositionResult={
  graphicMaterials:number;
  batched:boolean;
};

export function composeBreachSiteRender(
  site:Site|null,
  host:SiteSceneBuildPort,
  graphicLookEnabled:boolean
):SiteRenderCompositionResult{
  buildSiteWorld(site,host);
  // Legacy fallback does not have generated-room visibility ownership.
  if(site)finalizeStaticSiteBatches(host);
  // Do not clone, override or dispose palette materials; F1 shader hooks
  // are idempotent and apply after instancing to preserve draw-call parity.
  const graphicMaterials=graphicLookEnabled?
    applyWorldGraphicLighting(host.root).materials:0;
  return {graphicMaterials,batched:site!==null};
}
