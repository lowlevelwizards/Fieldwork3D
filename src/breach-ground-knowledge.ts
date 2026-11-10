/** Roadmap 2 Stage 3: one read-only interpretation of tactical ground intel.
 * Geometry and live acquisition are authoritative elsewhere. A briefing
 * describes a place; it is not evidence an operator actually saw it.
 */
import type {Pt} from './breach-core.ts';
import type {Site} from './breach-site.ts';
import type {IntelMode} from './breach-intel.ts';
import {exteriorBriefedAt} from './breach-site-footprint.ts';

export type GroundKnowledge='unknown'|'briefed'|'discovered'|'visible';
/** The 40-unit legacy key is not precise evidence; it may span a blind wall. */
export function coarseGroundEvidenceAt(seen:ReadonlySet<string>,p:Pt):boolean{
 return Number.isFinite(p.x)&&Number.isFinite(p.y)&&
   seen.has(Math.floor(p.x/40)+','+Math.floor(p.y/40));
}
/** Only 20/10-unit observed cells give precise evidence, including in replay. */
export function preciseGroundEvidenceAt(
 seen:ReadonlySet<string>|null|undefined,p:Pt):boolean{
 if(!seen||!Number.isFinite(p.x)||!Number.isFinite(p.y))return false;
 return seen.has('micro:'+Math.floor(p.x/10)+','+Math.floor(p.y/10))||
   seen.has('fine:'+Math.floor(p.x/20)+','+Math.floor(p.y/20));
}
/** Full View is a display override, never an individual sight grant. */
export function groundKnowledgeAt(mode:IntelMode,site:Site|undefined,
 p:Pt,currentlyVisible:boolean,everSeen:boolean):GroundKnowledge{
 if(mode==='full-view'||currentlyVisible)return 'visible';
 if(everSeen)return 'discovered';
 if(mode==='floor-plan'||(mode==='exterior-known'&&
   exteriorBriefedAt(site,p)))return 'briefed';
 return 'unknown';
}
export function groundFogLevel(knowledge:GroundKnowledge):0|1|2{
 return knowledge==='visible'?0:knowledge==='unknown'?2:1;
}
