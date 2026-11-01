/** Bounded topology synthesis: move a real room module into a neighboring
 * footprint void, creating a notch, setback or service-court frontage BEFORE
 * authoritative walls, windows, doors and furnishing are compiled.
 * This is not a decorative cutaway: null cells have no floor or walls.
 */
import type {Blueprint} from './architectural-program.ts';
import {blueprintRelationshipCost} from './spatial-program-fit.ts';

type Point={r:number;c:number};
const neighbors=(r:number,c:number):Point[]=>[
 {r:r-1,c},{r:r+1,c},{r,c:c-1},{r,c:c+1}];
const cell=(grid:readonly (readonly (string|null)[])[],r:number,c:number)=>
 grid[r]?.[c]??null;
const connected=(grid:readonly (readonly (string|null)[])[]):boolean=>{
 const first:Point|undefined=grid.flatMap((row,r)=>row.map((role,c)=>
  role?{r,c}:null)).find((x):x is Point=>!!x);
 if(!first)return false;
 const visited=new Set<string>(),pending=[first];
 while(pending.length){
  const p=pending.pop()!,key=p.r+':'+p.c;
  if(visited.has(key))continue;
  visited.add(key);
  for(const n of neighbors(p.r,p.c))if(cell(grid,n.r,n.c)&&
    !visited.has(n.r+':'+n.c))pending.push(n);
 }
 return visited.size===grid.reduce((total,row)=>total+row.filter(Boolean).length,0);
};
const protectedRoles=new Set(['hallway','aisle','guest','bathroom','restroom',
 'bedroom','exam','treatment']);
export function synthesizeFootprint(plan:Blueprint,seed:number):Blueprint{
 // One physical module per iteration. Flats and motel suites require stricter
 // privacy/ownership and remain exactly as authored until unit-aware synthesis.
 if(plan.unitIds||plan.kind==='apartment'||plan.kind==='motel')return plan;
 const count=(role:string)=>plan.cells.flat().filter(x=>x===role).length;
 const n=plan.cells.length,m=plan.widths.length;
 const blank=plan.cells.flatMap((row,r)=>row.map((role,c)=>
  role===null?{r,c}:null)).filter((x):x is Point=>x!==null);
 if(!blank.length)return plan;
 const start=blueprintRelationshipCost(plan);
 type Choice={grid:(string|null)[][];cost:number;tie:number};
 let best:Choice|undefined;
 const base=plan.cells.map(row=>[...row]);
 for(let r=0;r<n;r++)for(let c=0;c<m;c++){
  const role=base[r][c];
  if(!role||protectedRoles.has(role)||count(role)!==1)continue;
  if(r===plan.front.row&&c===plan.front.col)continue;
  // Relocate a peripheral module, never excavate the heart of the building.
  const occupied=neighbors(r,c).filter(p=>cell(base,p.r,p.c)).length;
  if(occupied>2)continue;
  for(const to of blank){
   // New rooms must share a real wall with at least one existing room.
   if(neighbors(to.r,to.c).every(p=>!cell(base,p.r,p.c)||
     p.r===r&&p.c===c))continue;
   const next=base.map(row=>[...row]);
   next[r][c]=null;next[to.r][to.c]=role;
   if(!connected(next))continue;
   // Main front wall must remain exterior or the FRONT door cannot be cut.
   if(cell(next,plan.front.row+1,plan.front.col)!==null)continue;
   // Avoid isolated singleton zones if an authored role was previously grouped.
   const candidate={...plan,cells:next};
   const score=blueprintRelationshipCost(candidate);
   const penalty=score-start;
   // Controlled relaxation buys genuine massing variety, not nonsensical
   // adjacency or a hidden kitchen through the clinical exam wing.
   if(penalty>18)continue;
   const tie=((Math.imul(seed^0x37a1f0d,r*67+c*113+to.r*127+to.c*179))>>>0)%101;
   const objective=penalty*100+tie;
   if(!best||objective<best.cost*100+best.tie)
    best={grid:next,cost:penalty,tie};
  }
 }
 if(!best)return plan;
 return {...plan,cells:best.grid,
  family:plan.family+' / synthesized setback'};
}
