/** Build 153: room- and doorway-aware acoustic distance.
 * Only real physical geometry is consulted; sound never reports an exact
 * hidden enemy position. Deterministic, pure and independent of rendering.
 */
import {doorCenter,segmentsCross,type Door,type Pt,type Segment}
 from './breach-core.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const penalty=(a:Pt,b:Pt,doors:readonly Door[])=>doors.reduce(
 (sum,d)=>sum+(segmentsCross({a,b},d)?
   (d.open&&(d.openFraction??1)>.5?9:82):0),0);
export function acousticDistance(from:Pt,to:Pt,
 doors:readonly Door[],walls:readonly Segment[]):number{
 const ray={a:from,b:to};
 const direct=distance(from,to)+walls.filter(w=>segmentsCross(ray,w)).length*95+
   penalty(from,to,doors);
 if(!walls.some(w=>segmentsCross(ray,w)))return direct;
 const points:Pt[]=[from,to];
 // A real door creates acoustic portals on either side of a partition.
 // Route around corners through these apertures before falling back to
 // heavily muffled transmission straight through solid walls.
 for(const door of doors.slice(0,18)){
   const c=doorCenter(door);
   const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
   const len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
   points.push({x:c.x+nx*8,y:c.y+ny*8});
   points.push({x:c.x-nx*8,y:c.y-ny*8});
 }
 const length=points.length,best=Array(length).fill(Infinity),
   visited=Array(length).fill(false);
 best[0]=0;
 for(let i=0;i<length;i++){
   let at=-1;
   for(let j=0;j<length;j++)
     if(!visited[j]&&(at<0||best[j]<best[at]))at=j;
   if(at<0||!Number.isFinite(best[at])||at===1)break;
   visited[at]=true;
   for(let j=0;j<length;j++){
     if(j===at||visited[j])continue;
     const seg={a:points[at],b:points[j]};
     if(walls.some(w=>segmentsCross(seg,w)))continue;
     const cost=distance(seg.a,seg.b)+penalty(seg.a,seg.b,doors);
     best[j]=Math.min(best[j],best[at]+cost);
   }
 }
 return Math.min(direct,best[1]);
}
export function heardIntensity(from:Pt,to:Pt,radius:number,
 doors:readonly Door[],walls:readonly Segment[]){
 const cost=acousticDistance(from,to,doors,walls);
 return Math.max(0,Math.min(1,(radius-cost)/Math.max(1,radius)));
}
