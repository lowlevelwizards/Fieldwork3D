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
