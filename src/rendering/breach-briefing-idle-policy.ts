/** E6.13: preserve the already-rendered tactical image behind the
 * translucent/blurred planning briefing without re-submitting the same
 * static 3D world on every browser RAF. Never throttle simulation, input,
 * 2D overlays, replay, photo capture or unoccluded planning.
 */
export type Briefing3DDecisionInput=Readonly<{
 enabled:boolean;briefingVisible:boolean;
 frameMode:'idle'|'live'|'replay'|'suspended';
 phase:'planning'|'running'|'won'|'lost';
 replaying:boolean;photoActive:boolean;studioOccludes:boolean;
 viewMode:'iso'|'top'|'plan2d';sceneReady:boolean;previouslyHeld:boolean;
}>;
export type Briefing3DDecision=Readonly<{
 hold:boolean;forceReveal:boolean;
}>;
export function briefing3DDecision(x:Briefing3DDecisionInput):Briefing3DDecision{
 const canHold=x.enabled&&x.briefingVisible&&
  x.frameMode==='idle'&&x.phase==='planning'&&!x.replaying&&
  !x.photoActive&&!x.studioOccludes&&x.viewMode!=='plan2d';
 // Draw the first scene normally. New sites and camera/scene transitions
 // must have a valid image before we ever hold that image behind the shield.
 const hold=canHold&&x.sceneReady;
 // A closing briefing must override even mobile idle3d=30 cadence
 // immediately, without waiting for pointer input or a timer.
 return {hold,forceReveal:x.previouslyHeld&&!canHold};
}
