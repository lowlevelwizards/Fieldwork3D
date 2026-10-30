/** 123: presentation-only locomotion classification.
 * Directions are in world ground coordinates, never model yaw space.
 */
export type LocomotionMode='idle'|'forward'|'backward'|'strafe-left'|'strafe-right'|'pivot'|'settle';
export const wrapAngle=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
export function classifyLocomotion(speed:number,facing:number,travel:number,
  turning:number,previous:LocomotionMode='idle'):LocomotionMode{
  if(speed<4)return Math.abs(turning)>.16?'pivot':
    previous==='idle'?'idle':'settle';
  const difference=wrapAngle(travel-facing);
  const forward=Math.cos(difference),side=Math.sin(difference);
  // Hysteresis prevents 45-degree input noise from flickering steps.
  const threshold=previous.startsWith('strafe')?.48:.63;
  if(Math.abs(side)>threshold&&Math.abs(side)>Math.abs(forward)*.88)
    return side>0?'strafe-right':'strafe-left';
  if(forward<-.48)return 'backward';
  return 'forward';
}
export const lateralAxis=(facing:number)=>({x:-Math.sin(facing),y:Math.cos(facing)});
export function sideOffset(origin:{x:number;y:number},p:{x:number;y:number},
  facing:number){const r=lateralAxis(facing);
  return (p.x-origin.x)*r.x+(p.y-origin.y)*r.y;}
export function uncrossed(left:{x:number;y:number},right:{x:number;y:number},
  facing:number,gap=3.8){
  const axis=lateralAxis(facing);
  return (right.x-left.x)*axis.x+(right.y-left.y)*axis.y>=gap-1e-5;
}
