/** R1.03: final fixed-tick movement authority owns *committed* progress.
 * A motor may provisionally accept a step and reset blockedTime, but the
 * joint frame arbiter can reject it for a moving opponent/civilian. Keep the
 * real consecutive rejected time until an actual frame without rejection.
 * This is observational recovery accounting, never a second motor.
 */
type PhysicalStallActor={
 blockedTime:number;
 lastBlocker:string;
 plan:readonly {id:number;kind:string}[];
};
type RejectedCommit={orderId:number;at:number;seconds:number};
const rejected=new WeakMap<PhysicalStallActor,RejectedCommit>();

export function recordRejectedMovementCommit(
 actor:PhysicalStallActor,blocked:'actor'|'geometry',
 at:number,dt:number
):number{
 const order=actor.plan[0];
 if(!order||!['move','pie','door','sync'].includes(order.kind)){
  rejected.delete(actor);
  return actor.blockedTime;
 }
 const prior=rejected.get(actor);
 // A new order or a genuinely intervening tick without rejection cannot
 // inherit the previous plan's collision episode.
 const continuous=!!prior&&prior.orderId===order.id&&
   Math.abs(at-prior.at-dt)<Math.max(.003,dt*.35);
 const seconds=Math.max(actor.blockedTime,continuous?prior.seconds:0)+dt;
 rejected.set(actor,{orderId:order.id,at,seconds});
 actor.blockedTime=seconds;
 actor.lastBlocker=blocked==='actor'?'actor':'route';
 return seconds;
}
/** Called after every complete authoritative frame, only for actors with
 * recorded rejections; a committed movement or a held/interrupted plan
 * breaks the rejection streak. No route writer can fabricate a footstep.
 */
export function clearUnrejectedCommit(
 actor:PhysicalStallActor,at:number
):void{
 const prior=rejected.get(actor);
 if(prior&&prior.at!==at)rejected.delete(actor);
}
/** For tests, read only the actual persistent frame-denial duration. */
export function pendingCommitStall(actor:PhysicalStallActor):number{
 return rejected.get(actor)?.seconds??0;
}
