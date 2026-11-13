/** V1 long-range LOS broadphase.
 * A segment can intersect a ray only if that ray points into the angular
 * interval subtended by the segment's two endpoints. Build small buckets
 * once per fog polygon, then exact ray/segment tests remain authoritative.
 * No geometric simplification, disclosure approximation, or cached world truth.
 */
import type {Pt,Segment} from './breach-core.ts';

export type RayAngleBucketIndex={
 candidates:(delta:number)=>readonly Segment[];
 totalEntries:number;
};
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));

export function angularRayBuckets(origin:Pt,heading:number,
 segments:readonly Segment[],halfAngle:number,bucketCount=96
):RayAngleBucketIndex{
 const span=halfAngle*2;
 const buckets:Segment[][]=Array.from({length:bucketCount},()=>[]);
 let totalEntries=0;
 const add=(start:number,end:number,edge:Segment)=>{
  const a=Math.max(0,Math.floor((start+halfAngle)*bucketCount/span)-1);
  const b=Math.min(bucketCount-1,
    Math.floor((end+halfAngle)*bucketCount/span)+1);
  for(let bin=a;bin<=b;bin++){
   buckets[bin].push(edge);totalEntries++;
  }
 };
 for(const edge of segments){
  let a=wrap(Math.atan2(edge.a.y-origin.y,edge.a.x-origin.x)-heading);
  let b=wrap(Math.atan2(edge.b.y-origin.y,edge.b.x-origin.x)-heading);
  // Choose the short angular arc, not a false 360-degree interval around
  // the observer's back. A segment through the observer is a special case.
  const ax=edge.a.x-origin.x,ay=edge.a.y-origin.y;
  const bx=edge.b.x-origin.x,by=edge.b.y-origin.y;
  const cross=ax*by-ay*bx;
  if(Math.abs(cross)<1e-8&&ax*bx+ay*by<=0){
   add(-halfAngle,halfAngle,edge);continue;
  }
  if(a-b>Math.PI)b+=Math.PI*2;
  else if(b-a>Math.PI)a+=Math.PI*2;
  const lo=Math.min(a,b),hi=Math.max(a,b);
  if(hi< -halfAngle||lo>halfAngle)continue;
  add(Math.max(-halfAngle,lo),Math.min(halfAngle,hi),edge);
 }
 return {
  candidates:(delta:number)=>{
   const n=Math.min(bucketCount-1,Math.max(0,
     Math.floor((delta+halfAngle)*bucketCount/span)));
   return buckets[n];
  },
  totalEntries
 };
}
