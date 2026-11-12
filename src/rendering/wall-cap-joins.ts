/** Connected cap end geometry. Only exact authored wall endpoints are joined.
 * Physical colliders, pathfinding and window apertures are never modified.
 */
import type {Segment,Pt} from '../breach-core.ts';
export type CapJoint={p:Pt;owner:number};
export type WallCapJoinPlan={trims:[number,number][];junctions:CapJoint[]};
export function planWallCapJoins(walls:readonly Segment[]):WallCapJoinPlan{
 const trims:[number,number][]=walls.map(()=>[0,0]);
 const byPosition=new Map<string,Array<{index:number;end:0|1}>>();
 const key=(p:Pt)=>Math.round(p.x*100)+':'+Math.round(p.y*100);
 for(const [index,wall] of walls.entries()){
   for(const end of [0,1] as const){
     const p=end===0?wall.a:wall.b,k=key(p);
     const refs=byPosition.get(k)??[];
     refs.push({index,end});
     byPosition.set(k,refs);
   }
 }
 const junctions:CapJoint[]=[];
 for(const refs of byPosition.values()){
   if(refs.length<2)continue;
   const first=walls[refs[0].index];
   const p=refs[0].end===0?first.a:first.b;
   junctions.push({p:{...p},owner:refs[0].index});
   for(const {index,end} of refs){
     const wall=walls[index],length=Math.hypot(
       wall.b.x-wall.a.x,wall.b.y-wall.a.y);
     trims[index][end]=Math.min(5.5,length*.30);
   }
 }
 return {trims,junctions};
}
