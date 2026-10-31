/** Ground-plane boot geometry and contact diagnostics.
 * A boot has local +X toe-forward and its worldYaw uses the rig convention
 * (-world heading). Calculations are pure and never change a planted anchor.
 */
export type GroundBoot={position:{x:number;y:number};worldYaw:number};
export const BOOT_LENGTH=8;
export const BOOT_WIDTH=5.8;
export const BOOT_CLEARANCE=.35;
const dot=(a:{x:number;y:number},b:{x:number;y:number})=>
  a.x*b.x+a.y*b.y;
const axes=(yaw:number)=>{
  const forward={x:Math.cos(-yaw),y:Math.sin(-yaw)};
  return [forward,{x:-forward.y,y:forward.x}] as const;
};
export function projectedBootHalfWidth(yaw:number,facing:number){
  const [forward,side]=axes(yaw);
  const lateral={x:-Math.sin(facing),y:Math.cos(facing)};
  return Math.abs(dot(lateral,forward))*BOOT_LENGTH/2+
    Math.abs(dot(lateral,side))*BOOT_WIDTH/2;
}
/** SAT signed clearance between two rotated boot outlines (negative means overlap).
 * It tests all four boot axes; unlike center separation it recognizes
 * a harmless forward stagger as clearance. */
export function bootOutlineClearance(a:GroundBoot,b:GroundBoot){
  const aa=axes(a.worldYaw),bb=axes(b.worldYaw);
  const offset={x:b.position.x-a.position.x,
    y:b.position.y-a.position.y};
  let clearance=-Infinity;
  for(const axis of [...aa,...bb]){
    const projection=Math.abs(dot(offset,axis));
    const extent=(boot:readonly {x:number;y:number}[])=>
      Math.abs(dot(boot[0],axis))*BOOT_LENGTH/2+
      Math.abs(dot(boot[1],axis))*BOOT_WIDTH/2;
    clearance=Math.max(clearance,projection-extent(aa)-extent(bb));
  }
  return clearance;
}
export function gaitFootDiagnostic(
  feet:readonly [GroundBoot,GroundBoot],facing:number){
  const axis={x:-Math.sin(facing),y:Math.cos(facing)};
  const between={x:feet[1].position.x-feet[0].position.x,
    y:feet[1].position.y-feet[0].position.y};
  return {
    centerGap:Math.hypot(between.x,between.y),
    lateralGap:dot(between,axis),
    outlineClearance:bootOutlineClearance(feet[0],feet[1]),
    facing
  };
}
