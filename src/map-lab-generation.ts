/** Map Lab-only choices; old scale URLs are normalized without exposing legacy UI. */
import type {Site,SiteScale,BuildingArchetype} from './breach-site.ts';
import type {SiteAudit} from './breach-site-audit.ts';
export type LabScale='small'|'medium'|'large'|'random';
const sizes=['small','medium','large'] as const;
export function labScaleChoice(value:string|null):LabScale{
  if(value==='small'||value==='medium'||value==='large'||value==='random')return value;
  if(value==='standard')return 'small';
  return 'medium'; // expanded and unspecified URLs both map to medium.
}
/** Deterministic random size keeps links/seeds perfectly reproducible. */
export function resolveLabScale(choice:LabScale,seed:number):SiteScale{
  return choice==='random'?sizes[(Math.imul(seed>>>0,2654435761)>>>0)%sizes.length]:choice;
}
export type GeneratorRequest={
  id:number;seed:number;archetype:BuildingArchetype;scale:LabScale;
};
export type GeneratorTiming={generationMs:number;auditMs:number;workerMs:number};
export type GeneratorResponse=
  |{id:number;kind:'progress';percent:number;stage:string;detail:string}
  |{id:number;kind:'done';site:Site;audit:SiteAudit;timing:GeneratorTiming}
  |{id:number;kind:'error';message:string};
