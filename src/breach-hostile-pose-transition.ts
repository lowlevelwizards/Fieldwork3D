/** Render-only hostile state handoffs. No motor, contact or AI authority.
 * A named state key makes the existing atomic NPC pose publisher blend
 * surrender/restraint/escort arms from the last displayed anatomy.
 * Kneel-to-standing is sampled BEFORE leg IK from a replayed GO timestamp,
 * keeping the complete hip/knee/ankle chain physically connected.
 */
export type HostilePoseSubject={
 health:number;injuryStage:number;surrendered:boolean;restrained?:boolean;
 escortLeaderId?:string|null;suspectEscapeMode?:string|null;
 lastEscortCommandAt?:number;
};
const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));
 return t*t*(3-2*t);};
export const HOSTILE_ESCORT_POSE_SECONDS=.46;
export function hostileNpcTransitionKey(a:HostilePoseSubject):string{
 if(a.health<=0)return 'hostile/down';
 if(a.surrendered){
  if(a.suspectEscapeMode==='flee')return 'hostile/escape';
  if(a.escortLeaderId)return 'hostile/escort';
  return a.restrained?'hostile/restrained':'hostile/surrender';
 }
 return a.injuryStage>0?'hostile/wounded':'hostile/active';
}
export function hostileCustodyWalkBlend(a:HostilePoseSubject,now:number):number{
 if(!a.surrendered||a.health<=0)return 0;
 if(a.suspectEscapeMode==='flee')return 1;
 const walking=!!a.escortLeaderId;
 const at=a.lastEscortCommandAt;
 // Old films lacking the GO timestamp reconstruct their settled state.
 if(at===undefined||!Number.isFinite(at)||!Number.isFinite(now)||
    now<at)return walking?1:0;
 const elapsed=now-at;
 if(elapsed>=HOSTILE_ESCORT_POSE_SECONDS)return walking?1:0;
 const progress=ease(elapsed/HOSTILE_ESCORT_POSE_SECONDS);
 return walking?progress:1-progress;
}
