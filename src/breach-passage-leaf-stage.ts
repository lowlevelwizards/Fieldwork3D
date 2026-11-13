/** Q4: one-time, physically verified staging outside a hinged leaf sweep.
 * This proposes a short target; the existing motor must approve EVERY step.
 */
import {doorCenter,OPERATOR_RADIUS,type Door,type Pt} from './breach-core.ts';
import {doorWouldStrikeActors} from './breach-door.ts';
export const MAX_PASSAGE_STAGE_TRAVEL=60;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const depth=(p:Pt,d:Door,side:-1|1)=>{
 const dx=d.b.x-d.a.x,dy=d.b.y-d.a.y,
  length=Math.hypot(dx,dy)||1,c=doorCenter(d);
 return ((p.x-c.x)*-dy+(p.y-c.y)*dx)/length*side;
};
export function threatenedByOpeningLeaf(door:Door,point:Pt,
 side:-1|1):boolean{
 if(door.kind==='sliding'||door.kind==='shutter'||door.wedged||
    (door.openFraction??0)>.88)return false;
 const measured=depth(point,door,side);
 if(measured<OPERATOR_RADIUS||measured>OPERATOR_RADIUS+45)return false;
 return doorWouldStrikeActors({...door,openFraction:0},1.03,
   [point],OPERATOR_RADIUS+1);
}
export function chooseLeafStage(door:Door,point:Pt,side:-1|1,
 canTraverse:(from:Pt,to:Pt)=>boolean,peers:readonly Pt[]):Pt|null{
 if(!threatenedByOpeningLeaf(door,point,side))return null;
 const center=doorCenter(door);
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const width=Math.hypot(dx,dy)||1,tx=dx/width,ty=dy/width;
 const nx=-ty,ny=tx;
 const lateral=(point.x-center.x)*tx+(point.y-center.y)*ty;
 const fromDepth=depth(point,door,side);
 const edge=Math.max(width/2+OPERATOR_RADIUS+5,
   Math.abs(lateral)+OPERATOR_RADIUS+6);
 const towardsJamb=lateral>=0?1:-1;
 let best:Pt|null=null,bestScore=Infinity;
 // A tiny fixed exercise: two ends of the jamb, at four known setbacks.
 // Reject obstructed points and preserve the real hinge obstruction.
 for(const lateralTarget of [towardsJamb*edge,-towardsJamb*edge]){
  for(const back of [0,8,17,26]){
   const at={x:center.x+tx*lateralTarget+nx*side*(fromDepth+back),
    y:center.y+ty*lateralTarget+ny*side*(fromDepth+back)};
   const travel=distance(point,at);
   if(travel<3||travel>MAX_PASSAGE_STAGE_TRAVEL||
      threatenedByOpeningLeaf(door,at,side)||
      peers.some(peer=>distance(peer,at)<OPERATOR_RADIUS*2+4)||
      !canTraverse(point,at))continue;
   const score=travel+back*.4;
   if(score<bestScore){best=at;bestScore=score;}
  }
 }
 return best;
}
export function leafStageStride(from:Pt,target:Pt,normalStride:number):Pt{
 const length=distance(from,target);
 if(length<.25)return from;
 const step=Math.min(length,Math.max(0,normalStride));
 return {x:from.x+(target.x-from.x)*step/length,
  y:from.y+(target.y-from.y)*step/length};
}
