/** Landscape assets follow site use and existing lot edges.
 * Candidate generation is pure, bounded and intentionally asymmetrical:
 * no duplicated mirrored shrubs and no trees in parking aisles.
 */
import type {ExteriorZone} from '../breach-site.ts';
export type LandscapeCandidate={x:number;y:number;fixture:string};
const palette:Partial<Record<ExteriorZone['kind'],readonly string[]>>={
 garden:['shrub-round','planter','tree-scrub','shrub-tall','picnic-table'],
 yard:['planter','shrub-round','mailbox'],
 patio:['planter','shrub-round','patio-chair'],
 parking:['planter']
};
export function landscapeEdgeCandidates(zone:ExteriorZone,seed:number):
 LandscapeCandidate[]{
 const choices=palette[zone.kind];
 if(!choices||zone.w<78||zone.h<48)return [];
 const broad=zone.w>=zone.h;
 const longer=broad?zone.w:zone.h;
 const count=Math.min(zone.kind==='parking'?1:3,Math.max(1,Math.floor(longer/140)));
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
