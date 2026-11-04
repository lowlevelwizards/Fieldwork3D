/** Deterministic sound evidence, derived from real acoustic propagation. */
import type {Pt,Door,Segment} from './breach-core.ts';
import {heardIntensity,acousticDistance} from './breach-acoustics.ts';
import {windowAcousticFactor} from './breach-window-acoustics.ts';
import type {WindowState} from './breach-windows.ts';
export type AcousticEvent={id?:number;p:Pt;radius:number;time:number;kind:string};
export type HeardEvidence={
 id:number;kind:string;estimate:Pt;uncertainty:number;intensity:number;at:number;
};
/** Observer-specific hash prevents global RNG order from biasing combat. */
const pseudo=(event:number,observer:string,salt:number)=>{
 let n=(event^salt)>>>0;
 for(let i=0;i<observer.length;i++)n=Math.imul(n^observer.charCodeAt(i),16777619)>>>0;
 n^=n>>>16;n=Math.imul(n,2246822507)>>>0;
 return (n>>>0)/4294967296;
};
export function interpretSound(event:AcousticEvent,observerId:string,at:Pt,
 doors:readonly Door[],walls:readonly Segment[],
 windows:readonly WindowState[]=[]):HeardEvidence|null{
 const intensity=heardIntensity(event.p,at,event.radius,doors,walls)*
   windowAcousticFactor(event.p,at,windows);
 if(intensity<=0)return null;
 const travel=acousticDistance(event.p,at,doors,walls);
 const uncertainty=Math.max(event.kind==='gunshot'?24:12,
  travel*(event.kind==='gunshot'?.20:.16));
 const theta=pseudo(event.id??Math.round(event.time*1000),observerId,937)*Math.PI*2;
 const offset=uncertainty*.65*Math.sqrt(pseudo(event.id??0,observerId,127));
 return {id:event.id??Math.round(event.time*1000),
  kind:event.kind,estimate:{x:event.p.x+Math.cos(theta)*offset,
   y:event.p.y+Math.sin(theta)*offset},
  uncertainty,intensity,at:event.time};
}

/** Interpret intensity AND cause. Hearing is evidence, not a direct target
 * coordinate or an automatic global alert. A faint footstep isn't gunfire.
 */
export type SoundResponse='ignore'|'orient'|'investigate'|'alarm';
export function soundResponse(kind:string,intensity:number):SoundResponse{
 if(intensity<=0)return 'ignore';
 const violent=kind==='gunshot'||kind==='flashbang'||kind==='kick'||
   kind==='glass'||kind.startsWith('impact-spark')||
   kind.startsWith('impact-splinter');
 if(violent)return intensity>=.10?'alarm':'investigate';
 if(kind==='footstep')
   return intensity<.16?'ignore':intensity<.58?'orient':'investigate';
 if(kind==='warning')return intensity>=.18?'investigate':'orient';
 if(kind==='door'||kind==='window'||kind==='furniture')
   return intensity<.24?'orient':'investigate';
 if(kind.startsWith('impact-'))
   return intensity<.25?'orient':'investigate';
 return intensity<.20?'orient':'investigate';
}
export const soundPriority=(response:SoundResponse):number=>
 response==='alarm'?3:response==='investigate'?2:response==='orient'?1:0;
