/** Build 114: pure planar stance clearance, independent of render rate. */
export type Foot2={x:number;y:number};
export type FootConstraint={position:Foot2;outOfBounds:boolean;distance:number};
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
export function constrainFoot(world:Foot2,hip:Foot2,yaw:number,side:number,
  forward=9,lateral=8):FootConstraint{
  const dx=world.x-hip.x,dy=world.y-hip.y;
  const c=Math.cos(yaw),s=Math.sin(yaw);
  const localX=c*dx+s*dy,localY=-s*dx+c*dy;
  const x=clamp(localX,-forward,forward);
  const y=side*clamp(side*localY,3.5,lateral);
  const outOfBounds=Math.abs(x-localX)>.001||Math.abs(y-localY)>.001;
  const position={x:hip.x+c*x-s*y,y:hip.y+s*x+c*y};
  return {position,outOfBounds,distance:Math.hypot(localX,localY)};
}
export function needsRecoveryStep(f:FootConstraint,moving:boolean):boolean{
  return moving&&(f.outOfBounds||f.distance>11.2);
}
