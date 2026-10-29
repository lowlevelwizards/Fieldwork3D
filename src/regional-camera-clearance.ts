/**
 * Close cameras must never intersect the terrain they're filming.
 * The old orbit radius was shorter than adjacent valley slopes, producing
 * enormous diagonally clipped ground faces across the iPhone view.
 * Correct the *eye* above the same physical heightfield as the operator,
 * preserving its x/z framing and avoiding near-plane clipping.
 */
export type CameraPoint={x:number;y:number;z:number};
export function clearCameraFromGround(eye:CameraPoint,target:CameraPoint,
 sampleGround:(x:number,z:number)=>number,
 clearance=2.0):CameraPoint{
 const initialY=eye.y;
 let lift=0;
 // The first 10% is the subject itself; nearby ground may rise gently,
 // and the subject's own head remains unobscured by the land.
 for(let i=1;i<=16;i++){
  const t=i/16;
  const x=target.x+(eye.x-target.x)*t;
  const z=target.z+(eye.z-target.z)*t;
  const lineY=target.y+(initialY-target.y)*t;
  const ground=sampleGround(x,z);
  if(!Number.isFinite(ground))continue;
  const missing=ground+clearance-lineY;
  if(missing>0)lift=Math.max(lift,missing/t);
 }
 // At very steep overhangs a reasonable aerial view is safer than
 // placing the camera underground. This doesn't move the actor.
 return {...eye,y:initialY+Math.min(220,lift)};
}
export function cameraGroundClearance(eye:CameraPoint,target:CameraPoint,
 sampleGround:(x:number,z:number)=>number):number{
 let minimum=Infinity;
 for(let i=1;i<=16;i++){
  const t=i/16,x=target.x+(eye.x-target.x)*t;
  const z=target.z+(eye.z-target.z)*t;
  const y=target.y+(eye.y-target.y)*t;
  minimum=Math.min(minimum,y-sampleGround(x,z));
 }
 return minimum;
}
