/** Unified presentation disclosure. Never modifies simulation knowledge.
 * In particular, physical camera cutaways cannot reveal unseen objects.
 */
import {liveVisibility,type Session,type TeamActor} from '../breach-game.ts';
import type {Door,Pt} from '../breach-core.ts';
import type {CivilianActor} from '../breach-civilian-types.ts';
import {replayActorVisible,replayActorDisclosed,replayCivilianDisclosed,
 type ReplayDisclosure} from '../breach-replay-visibility.ts';
import {civilianPresentationVisible} from '../breach-civilian-visibility.ts';
import {personalDecorVisible} from '../breach-replay-personal-visibility.ts';

export function presentActor(s:Session,a:TeamActor,omniscient:boolean,
 policy:ReplayDisclosure|null):boolean{
 return policy?replayActorDisclosed(s,a,policy):replayActorVisible(s,a,omniscient);
}
export function presentCivilian(s:Session,c:CivilianActor,omniscient:boolean,
 policy:ReplayDisclosure|null):boolean{
 return policy?.mode==='operator'?replayCivilianDisclosed(s,c.id,policy):
  civilianPresentationVisible(c,c.replayVisible!==undefined,
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
