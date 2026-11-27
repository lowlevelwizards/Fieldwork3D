/** CT4: bounded path-following drag. Trail contains committed positions
 * from the body to the carrier; rejected proposals never enter history. */
import type {Pt} from './breach-core.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type DragTrail=Readonly<{patientId:string;points:readonly Pt[]}>;
export function proposeDragTrail(patientId:string,body:Pt,from:Pt,to:Pt,
 previous:DragTrail|undefined,clear:(a:Pt,b:Pt)=>boolean){
 const step=d(from,to);
 if(step<.00001)return {point:{...body},trail:previous};
 let points=previous?.patientId===patientId&&previous.points.length>=2&&
  d(previous.points[0],body)<.1&&d(previous.points.at(-1)!,from)<.1?
  previous.points.map(p=>({...p})):[{...body},{...from}];
 // Coalesce straight samples; preserve bends and actual travelled segments.
 const n=points.length,last=points[n-1],before=points[n-2];
 const ax=last.x-before.x,ay=last.y-before.y,bx=to.x-last.x,by=to.y-last.y;
 if(n>2&&Math.abs(ax*by-ay*bx)<.01&&ax*bx+ay*by>0)points[n-1]={...to};
 else points.push({...to});
 let length=0;
 for(let i=1;i<points.length;i++)length+=d(points[i-1],points[i]);
 let budget=Math.min(step*1.65,Math.max(0,length-25));
 let point={...body};
 while(budget>.00001&&points.length>1){
  const next=points[1],gap=d(point,next);
  if(gap<.00001){points.shift();continue;}
  const move=Math.min(gap,budget),f=move/gap;
  const candidate={x:point.x+(next.x-point.x)*f,y:point.y+(next.y-point.y)*f};
  if(!clear(point,candidate))return null;
  point=candidate;budget-=move;
  if(move>=gap-.00001)points.shift();
  points[0]={...point};
 }
 // Bounded history; pathological repeated turns must not grow indefinitely.
 if(points.length>96)return null;
 return {point,trail:{patientId,points}};
}
