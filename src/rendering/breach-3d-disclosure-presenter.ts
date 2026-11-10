/** Unified presentation disclosure. Never modifies simulation knowledge.
 * In particular, physical camera cutaways cannot reveal unseen objects.
 */
import {liveVisibility,isSeen,type Session,type TeamActor} from '../breach-game.ts';
import type {Door,Pt} from '../breach-core.ts';
import type {CivilianActor} from '../breach-civilian-types.ts';
import {replayActorDisclosed,replayCivilianDisclosed,recordedReplayKnowledge,
 type ReplayDisclosure} from '../breach-replay-visibility.ts';
import {civilianPresentationVisible} from '../breach-civilian-visibility.ts';
import {personalDecorVisible,personalGroundEvidenceAt} from '../breach-replay-personal-visibility.ts';
import {architecturalOpeningKnown} from '../breach-presentation.ts';
import {accessibleExteriorWall} from '../breach-site-footprint.ts';
import type {WideOpening} from '../breach-site.ts';

export function presentActor(s:Session,a:TeamActor,omniscient:boolean,
 policy:ReplayDisclosure|null):boolean{
 if(policy)return replayActorDisclosed(s,a,policy);
 // A live game has no historical sample. Keep its authoritative current
 // actor sight separate from replay's intentionally fail-closed evidence.
 return omniscient||a.side==='blue'||(a.health>0?
   isSeen(s,a):liveVisibility(s,a.p));
}
export function presentCivilian(s:Session,c:CivilianActor,omniscient:boolean,
 policy:ReplayDisclosure|null):boolean{
 if(policy){
   if(policy.mode==='full')return true;
   if(policy.mode==='operator')return replayCivilianDisclosed(s,c.id,policy);
   // Historical squad films with a knowledge sample use it exclusively.
   // Older films may have a recorded per-civilian visibleAtCapture value;
   // never fill a missing historical sample with present-time live LOS.
   return recordedReplayKnowledge(s)?
     replayCivilianDisclosed(s,c.id,policy):c.replayVisible===true;
 }
 return civilianPresentationVisible(c,false,
   omniscient,liveVisibility(s,c.p));
}
export function presentDecor(s:Session,detail:{
 position:Pt;microKey:string;fineKey:string
},omniscient:boolean,bodycam:boolean,
 evidence:ReadonlySet<string>|null):boolean{
 const p=detail.position;
 return personalDecorVisible(omniscient||s.seenGround.has(detail.microKey)||
  s.seenGround.has(detail.fineKey)||liveVisibility(s,p),bodycam,evidence,p);
}
export type DoorPresentationInput={
 door:Door;personal:boolean;omniscient:boolean;directlyObserved:boolean;
 observed:{openFraction:number;glassShattered:boolean;wedged:boolean}|null;
 rememberedOpen:number;rememberedGlass:boolean|undefined;
 replayFraction:number|undefined;previousFraction:number|undefined;
 renderAlpha:number|undefined;replaying:boolean;hasRenderFrame:boolean;
};
export function resolveDoorPresentation(x:DoorPresentationInput){
 const direct=!x.personal&&(x.omniscient||x.directlyObserved);
 const actual=x.door.openFraction??(x.door.open?1:0);
 const fraction=x.personal?(x.observed?.openFraction??0):
  direct?actual:x.rememberedOpen;
 const shown=x.personal?fraction:direct?(x.replayFraction??fraction):fraction;
 const prior=!x.replaying&&direct?x.previousFraction:undefined;
 const alpha=Math.max(0,Math.min(1,x.renderAlpha??1));
 const draw=prior===undefined?shown:prior+(shown-prior)*alpha;
 const glassVisible=x.personal?!(x.observed?.glassShattered??false):
  x.replaying||x.hasRenderFrame?!(direct?!!x.door.glassShattered:false):
  !(direct?!!x.door.glassShattered:(x.rememberedGlass??false));
 const wedgeVisible=x.personal?!!x.observed?.wedged:
  x.door.wedged===true&&direct;
 return {fraction:draw,glassVisible,wedgeVisible,remember:direct};
}

/** Historical personal disclosure applies to all camera lenses. Known public
 * architecture remains available; unseen interior thresholds require the
 * selected observer's recorded fine/micro ground evidence.
 */
export function presentArchitecturalOpening(s:Session,opening:WideOpening,
 omniscient:boolean,policy:ReplayDisclosure|null,
 evidence:ReadonlySet<string>|null):boolean{
 if(policy?.mode!=='operator')return architecturalOpeningKnown(s,opening,omniscient);
 if(s.intel.mode==='full-view'||s.intel.mode==='floor-plan')return true;
 if(s.intel.mode==='exterior-known'&&
   accessibleExteriorWall(s.site??undefined,opening))return true;
 const dx=opening.b.x-opening.a.x,dy=opening.b.y-opening.a.y;
 const length=Math.hypot(dx,dy);
 if(length<.001)return false;
 const mx=(opening.a.x+opening.b.x)/2,my=(opening.a.y+opening.b.y)/2;
 const nx=-dy/length,ny=dx/length;
 return [-1,1].some(sign=>personalGroundEvidenceAt(evidence,{
  x:mx+nx*8*sign,y:my+ny*8*sign
 }));
}
/** A fallback rescue mesh has no archived civilian identity: never reconstruct
 * it in historical squad/personal films from contemporary live sight.
 */
export function presentUnrecordedRescueMarker(s:Session,omniscient:boolean,
 policy:ReplayDisclosure|null):boolean{
 if(policy)return policy.mode==='full';
 return omniscient||liveVisibility(s,s.rescue!.p);
}
/** Shared transient-geometry disclosure for all Three.js camera modes. */
export function presentTransientEvidence(p:Pt,omniscient:boolean,
 personal:boolean,visibleAt:(point:Pt)=>boolean):boolean{
 return !personal&&(omniscient||visibleAt(p));
}
