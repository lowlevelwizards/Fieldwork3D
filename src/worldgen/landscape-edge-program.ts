/** Landscape assets follow site use and existing lot edges.
 * Candidate generation is pure, bounded and intentionally asymmetrical:
 * no duplicated mirrored shrubs and no trees in parking aisles.
 */
import type {ExteriorZone} from '../breach-site.ts';
export type LandscapeCandidate={x:number;y:number;fixture:string};
const palette:Partial<Record<ExteriorZone['kind'],readonly string[]>>={
 // Garden beds and lot edges get layered vegetation, never picnic furniture.
 garden:['shrub-round','shrub-tall','tree-scrub','shrub-round',
   'tree-broadleaf','shrub-tall'],
 yard:['shrub-round','shrub-tall','tree-broadleaf','shrub-round',
   'tree-scrub'],
 // Paved areas need an actual container; no magically rooted shrubs.
 patio:['planter'],
 parking:['planter']
};
export function landscapeEdgeCandidates(zone:ExteriorZone,seed:number):
 LandscapeCandidate[]{
 const choices=palette[zone.kind];
 if(!choices||zone.w<78||zone.h<48)return [];
 const broad=zone.w>=zone.h;
 const longer=broad?zone.w:zone.h;
 // Meaningful vegetation groups rather than one isolated shrub per lot.
 // Larger sites get denser edges, but parking remains intentionally sparse.
 const max=zone.kind==='garden'?5:zone.kind==='yard'?4:
   zone.kind==='parking'?1:2;
 const minimum=zone.kind==='garden'?3:zone.kind==='yard'?3:1;
 const count=Math.min(max,Math.max(minimum,Math.floor(longer/65)));
 const choicesOut:LandscapeCandidate[]=[];
 const hash=(n:number)=>(Math.imul(seed>>>0^Math.imul(n,1103515245),2654435761)>>>0)/4294967295;
 for(let i=0;i<count;i++){
  const along=(i+.5)/count-.5;
  const t=along*.7+(hash(i+2)-.5)*.11;
  const edge=hash(i+12)>.45?1:-1;
  const across=edge*(.5-(.13+hash(i+21)*.09));
  const x=zone.x+(broad?t*zone.w:across*zone.w);
  const y=zone.y+(broad?across*zone.h:t*zone.h);
  const fixture=choices[Math.floor(hash(i+31)*choices.length)];
  choicesOut.push({x,y,fixture});
 }
 return choicesOut;
}
