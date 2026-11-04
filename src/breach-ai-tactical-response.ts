/** R8B: a chosen combat action must actually affect behavior.
 * Shooting is never authorized by this policy: the existing true visual,
 * muzzle, friendly and geometric fire checks remain authoritative.
 */
import type {CombatAction} from './breach-ai-combat.ts';
export type ContactTactic={
 seekCover:boolean;withdraw:boolean;holdFire:boolean;mayReposition:boolean;
};
export function contactTactic(action:CombatAction|null,
 hasReachableRetreat:boolean):ContactTactic{
 if(action==='withdraw')return {seekCover:true,
   withdraw:hasReachableRetreat,holdFire:true,mayReposition:false};
 if(action==='hold')return {seekCover:true,withdraw:false,
   holdFire:true,mayReposition:false};
 if(action==='reposition')return {seekCover:false,withdraw:false,
   holdFire:true,mayReposition:true};
 return {seekCover:false,withdraw:false,holdFire:false,mayReposition:false};
}
