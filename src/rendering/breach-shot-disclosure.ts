/** V19.3: one visual shot decision per exact event in a synchronous
 * render. The existing shotVisibility remains the shared live source for
 * audio and presentation. Personal playback must not reconstruct LOS. */
import type {Pt} from '../breach-core.ts';
import type {Session,ShotEvent} from '../breach-game.ts';
import {shotVisibility,type ShotVisibility} from '../breach-presentation.ts';
const HIDDEN:ShotVisibility=Object.freeze({flash:false,trace:false,impact:false});
const FULL:ShotVisibility=Object.freeze({flash:true,trace:true,impact:true});
export function presentShotEvidence(s:Session,shot:ShotEvent,
 omniscient:boolean,personal:boolean,visibleAt?:(p:Pt)=>boolean):ShotVisibility{
 if(personal)return HIDDEN;
 if(omniscient)return FULL;
 return shotVisibility(s,shot,visibleAt);
}
export class ShotFrameDisclosure{
 private readonly values=new Map<ShotEvent,ShotVisibility>();
 clear():void{this.values.clear();}
 forShot(s:Session,shot:ShotEvent,omniscient:boolean,personal:boolean,
  visibleAt?:(p:Pt)=>boolean):ShotVisibility{
  if(personal)return HIDDEN;
  if(omniscient)return FULL;
  const prior=this.values.get(shot);
  if(prior)return prior;
  const decision=presentShotEvidence(s,shot,false,false,visibleAt);
  // Beyond the existing bounded visual shot history, degrade to exact
  // source queries rather than making the per-frame cache unbounded.
  if(this.values.size<240)this.values.set(shot,decision);
  return decision;
 }
}
