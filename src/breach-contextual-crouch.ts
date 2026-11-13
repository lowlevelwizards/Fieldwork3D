/** A3.3: voluntary, self-only contextual stance for a stationary stack.
 * This does NOT force the teammate to crouch; the evaluated operator opts
 * into a brief lower posture only when it demonstrably opens a safe,
 * height-aware lane for an already confirmed allied contact.
 */
export type CrouchContext={
 stationary:boolean;busy:boolean;authoredPosture:boolean;
 posture:'stand'|'crouch';originallyAutomatic:boolean;
};
export function canContextuallyCrouch(ctx:CrouchContext):boolean{
 return ctx.stationary&&!ctx.busy&&!ctx.authoredPosture&&
  (ctx.posture==='stand'||ctx.originallyAutomatic);
}
/** A real shooter with a known target must be behind the proposed croucher.
 * Exact muzzle and teammate-volume tests remain the caller's authority.
 */
export function validRearStack(rear:{x:number;y:number;heading:number},
 front:{x:number;y:number},target:{x:number;y:number}):boolean{
 const dx=front.x-rear.x,dy=front.y-rear.y;
 const range=Math.hypot(dx,dy);
 if(range<13||range>60)return false;
 const yaw=Math.atan2(target.y-rear.y,target.x-rear.x);
 const forward=(dx*Math.cos(yaw)+dy*Math.sin(yaw))/range;
 return forward>.80&&Math.abs(Math.atan2(
  Math.sin(rear.heading-yaw),Math.cos(rear.heading-yaw)))<.75;
}
export function contextualCrouchRecovery(input:{
 autoUntil:number;now:number;authored:boolean;busy:boolean;
 advantage:boolean;}) : {crouch:boolean;until:number}{
 if(input.authored||input.busy)return {crouch:false,until:0};
 if(input.advantage)return {crouch:true,until:input.now+1.1};
 return {crouch:input.autoUntil>input.now,
  until:input.autoUntil>input.now?input.autoUntil:0};
}
