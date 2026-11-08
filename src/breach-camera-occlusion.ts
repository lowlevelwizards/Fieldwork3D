/** VIS-07: Camera-only cuts must not grant physical sight or intelligence. */
import {segmentsCross,type Pt,type Segment} from './breach-core.ts';
export function wallOccludesFriendly(wall:Segment,operator:Pt,
 cameraDirection:Pt,maxDistance:number):boolean{
 const length=Math.hypot(cameraDirection.x,cameraDirection.y);
 if(length<.001||maxDistance<=0)return false;
 const nx=cameraDirection.x/length,ny=cameraDirection.y/length;
 for(const offset of [-6,0,6]){
  const from={x:operator.x-ny*offset,y:operator.y+nx*offset};
  const to={x:from.x+nx*maxDistance,y:from.y+ny*maxDistance};
  if(segmentsCross({a:from,b:to},wall))return true;
 }
 return false;
}
export function transitionWallOpacity(previous:number,cut:boolean,dt:number,
 cutOpacity=.38):number{
 const target=cut?Math.max(.12,Math.min(.65,cutOpacity)):1,
 rate=cut?12:8;
 const alpha=1-Math.exp(-Math.max(0,dt)*rate);
 const next=previous+(target-previous)*alpha;
 return Math.abs(next-target)<.008?target:next;
}
