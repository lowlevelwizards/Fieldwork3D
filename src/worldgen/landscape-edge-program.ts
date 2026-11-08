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
 // Landscaping has a rhythm: paired shrubs around occasional canopy
 // trees, separated into two edge beds. Not a random scatter of identical
 // bushes across the middle of a lawn.
 const planted=zone.kind==='yard'||zone.kind==='garden';
 const count=zone.kind==='garden'?
   Math.min(6,Math.max(3,Math.floor(longer/47))):
   zone.kind==='yard'?
   Math.min(5,Math.max(3,Math.floor(longer/54))):1;
 const choicesOut:LandscapeCandidate[]=[];
 const hash=(n:number)=>
   (Math.imul(seed>>>0^Math.imul(n,1103515245),2654435761)>>>0)/
     4294967295;
 for(let i=0;i<count;i++){
   const along=(i+.5)/count-.5;
   // Small controlled asymmetry avoids perfect hedge-like repetition.
   const t=along*.82+(hash(i+2)-.5)*.038;
   const pair=Math.floor(i/2);
   const edge=hash(pair+12)>.49?1:-1;
   const across=edge*(.33+(hash(i+21)-.5)*.065);
   const x=zone.x+(broad?t*zone.w:across*zone.w);
   const y=zone.y+(broad?across*zone.h:t*zone.h);
   let fixture=choices[Math.floor(hash(i+31)*choices.length)];
   if(planted){
     // One canopy or larger shrub starts each garden group. The adjacent
     // plant is a lower shrub, giving a recognizable ground-to-canopy scale.
     if(i%2===1)fixture=hash(i+51)>.44?'shrub-round':'shrub-tall';
     else if(zone.kind==='garden')
       fixture=hash(i+42)>.64?'tree-broadleaf':
         hash(i+52)>.60?'tree-scrub':'shrub-tall';
     else fixture=hash(i+52)>.74?'tree-scrub':'shrub-round';
   }
   choicesOut.push({x,y,fixture});
 }
 return choicesOut;
}
