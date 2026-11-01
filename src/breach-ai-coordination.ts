/** Deterministic role separation among allies who actually heard a report. */
import type {Pt} from './breach-core.ts';
export type GroupRole='investigate'|'watch';
export function groupResponse(heard:readonly {id:string;p:Pt}[],
 estimatedThreat:Pt):Record<string,GroupRole>{
 const roles:Record<string,GroupRole>={};
 const sorted=[...heard].sort((a,b)=>{
  const da=Math.hypot(a.p.x-estimatedThreat.x,a.p.y-estimatedThreat.y);
  const db=Math.hypot(b.p.x-estimatedThreat.x,b.p.y-estimatedThreat.y);
  return da-db||a.id.localeCompare(b.id);
 });
 sorted.forEach((a,i)=>roles[a.id]=i===0?'investigate':'watch');
 return roles;
}
