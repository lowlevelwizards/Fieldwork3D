/** Canonical operator contact ownership. Presentation-only, deterministic. */
import {reloadPhase,type ReloadMode} from './breach-magazines.ts';
export type HandOwner='weapon'|'magazine'|'ammunition'|'door'|'brace'|'teammate'|
 'throw'|'medical'|'guard'|'free';
export type ContactAction='hold'|'surrender'|'down'|'treatment'|
 'reload'|'throw'|'push'|'injury'|'door';
/** One non-authoritative injury-guard window for the fixed contact
 * scheduler and the visual pose decision. Actual aiming/shooting always wins
 * the support hand; a glancing uninjured hit is not a medical arm action. */
export type WoundedGuardFacts={
 down:boolean;injury:number;hitRegion:string|null|undefined;
 aiming:boolean;firing:boolean;hitAge:number|undefined;
};
export function woundedHandGuard(p:WoundedGuardFacts):boolean{
 return !p.down&&p.injury>0&&p.hitRegion!=='leg'&&
  !p.aiming&&!p.firing&&p.hitAge!==undefined&&
  p.hitAge>=0&&p.hitAge<1.1;
}
export type ContactRequest={
 surrender:boolean;down:boolean;downProgress:number;
 treatmentActive:boolean;reloadActive:boolean;
 reloadProgress:number;reloadMode:ReloadMode;
 throwActive:boolean;pushActive:boolean;
 woundedGuard:boolean;doorActive:boolean;
};
export type ContactOwners={action:ContactAction;left:HandOwner;
 right:HandOwner;phase:string|null};
export function resolvePoseContactOwners(p:ContactRequest):ContactOwners{
 if(p.surrender)return {action:'surrender',left:'free',right:'free',phase:null};
 if(p.down)return {action:'down',
  left:p.downProgress>.16?'free':'weapon',
  right:p.downProgress>.53?'free':'weapon',phase:null};
 if(p.treatmentActive)return {action:'treatment',
  left:'medical',right:'medical',phase:null};
 if(p.reloadActive){
  const phase=reloadPhase(p.reloadProgress,p.reloadMode);
  const left=phase==='reach'||phase==='settle'?'free':
   p.reloadMode==='shells'?'ammunition':'magazine';
  return {action:'reload',left,right:'weapon',phase};
 }
 if(p.throwActive)return {action:'throw',
  left:'throw',right:'weapon',phase:null};
 if(p.pushActive)return {action:'push',
  left:'guard',right:'weapon',phase:null};
 if(p.woundedGuard)return {action:'injury',
  left:'guard',right:'weapon',phase:null};
 if(p.doorActive)return {action:'door',
  left:'door',right:'weapon',phase:null};
 return {action:'hold',left:'weapon',right:'weapon',phase:null};
}
