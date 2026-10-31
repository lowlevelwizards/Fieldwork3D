/** Pure motion instrumentation. Never changes gameplay or render transforms. */
export type Point2={x:number;y:number};
export const wrappedAngle=(a:number,b:number)=>
  Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const angularErrorDegrees=(physical:number,requested:number)=>
  Math.abs(wrappedAngle(physical,requested))*180/Math.PI;
export type FootTruth={requested:Point2;rendered:Point2;
  phase:string;contact:boolean;reachError:number};
export function footTruth(a:FootTruth,b:FootTruth){
  const inspect=(f:FootTruth)=>({
    offset:Math.hypot(f.requested.x-f.rendered.x,
      f.requested.y-f.rendered.y),
    reach:f.reachError,
    phase:f.phase,contact:f.contact
  });
  return [inspect(a),inspect(b)] as const;
}
export function weaponTruth(barrelYaw:number,requestedYaw:number,
  shotYaw?:number){
  const error=angularErrorDegrees(barrelYaw,requestedYaw);
  return {barrelYaw,requestedYaw,
    aimErrorDeg:error,
    shotErrorDeg:shotYaw===undefined?null:
      angularErrorDegrees(barrelYaw,shotYaw),
    aligned:error<3};
}

/** Physical reach telemetry: the IK limit is a 3D sphere, not a flat
 * horizontal distance from the operator origin. Diagnostics never clamp
 * or change an authored foot target. */
export function legReachTruth(input:{
  hip:{x:number;y:number;z:number};
  ankle:{x:number;y:number;z:number};
  upper:number;lower:number;minBend?:number
}){
  const {hip,ankle,upper,lower}=input;
  const dx=ankle.x-hip.x,dy=ankle.y-hip.y,dz=ankle.z-hip.z;
  const requested=Math.hypot(dx,dy,dz);
  const bend=input.minBend??.08;
  const maximum=Math.sqrt(upper*upper+lower*lower+
    2*upper*lower*Math.cos(bend));
  const horizontal=Math.hypot(dx,dz);
  const horizontalMaximum=Math.sqrt(Math.max(0,
    maximum*maximum-dy*dy));
  return {requested,maximum,horizontal,horizontalMaximum,
    reachError:Math.max(0,requested-maximum),
    reachable:requested<=maximum+1e-5};
}
