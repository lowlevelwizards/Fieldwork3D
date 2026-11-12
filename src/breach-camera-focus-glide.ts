/** Critically damped, frame-rate independent camera translation.
 * Pure presentation: no world, simulation, hit testing or intel edits.
 * The cursor starts AND stops gently. One target replacement keeps velocity
 * for seamless consecutive operator switches without queuing animations.
 */
export type CameraPoint={x:number;y:number};
export type CameraFocusGlide={
  target:CameraPoint;
  velocity:CameraPoint;
};
export type CameraFocusStep={
  point:CameraPoint;
  velocity:CameraPoint;
  finished:boolean;
};
/** smoothTime=.14s produces a quick ~.35-.5s glide for ordinary jumps. */
export function stepCameraFocusGlide(current:CameraPoint,target:CameraPoint,
  velocity:CameraPoint,dt:number,smoothTime=.14):CameraFocusStep{
  const safeDt=Math.min(.08,Math.max(0,Number.isFinite(dt)?dt:0));
  const omega=2/Math.max(.06,smoothTime);
  const decay=Math.exp(-omega*safeDt);
  const x=current.x-target.x,y=current.y-target.y;
  const tx=(velocity.x+omega*x)*safeDt;
  const ty=(velocity.y+omega*y)*safeDt;
  const point={
    x:target.x+(x+tx)*decay,
    y:target.y+(y+ty)*decay
  };
  const nextVelocity={
    x:(velocity.x-omega*tx)*decay,
    y:(velocity.y-omega*ty)*decay
  };
  const finished=Math.hypot(point.x-target.x,point.y-target.y)<.12&&
    Math.hypot(nextVelocity.x,nextVelocity.y)<1;
  return {
    point:finished?{x:target.x,y:target.y}:point,
    velocity:finished?{x:0,y:0}:nextVelocity,
    finished
  };
}
