/** Bounded spatial fitting of a building's semantic floor program.
 * Rearranges compatible rooms before authoritative walls and doors exist.
 * No role may disappear, the entrance stays fixed, and apartments/motels keep
 * their self-contained units. The physical compiler still owns navigation.
 */
import type {Blueprint} from './architectural-program.ts';
import {relationshipScore} from './room-relationships.ts';

const publicRooms=new Set(['foyer','vestibule','waiting','reception','lobby','sales','checkout','dining','living']);
const privateRooms=new Set(['bedroom','bathroom','restroom','guest','exam','treatment']);
const serviceRooms=new Set(['stockroom','storage','kitchen','pantry','service',
 'staff','supply','break','laundry','mudroom','maintenance','packing','parts','workshop',
 'equipment','control','office','meeting','utility']);
const daylight=new Set(['bedroom','living','guest','dining','office','exam','waiting']);
const access=new Set(['bay','loading','sales','reception','lobby','checkout']);
const category=(role:string|null)=>{
 if(!role)return 'empty';
 if(publicRooms.has(role))return 'public';
 if(privateRooms.has(role))return 'private';
 if(serviceRooms.has(role))return 'service';
 return role;
};
type Cell=string|null;

/** Critical practical adjacencies: both rooms must share a wall long enough
 * for a circulation door, not merely touch at a corner or narrow partition.
 * Missing roles are ignored: small businesses may have fewer departments.
 * These remain weighted rather than absolute constraints on tiny footprints.
 */
export const criticalContacts:Partial<Record<Blueprint['kind'],readonly (readonly [string,string])[]>>={
 house:[['kitchen','dining'],['foyer','living']],
 townhouse:[['kitchen','dining'],['foyer','living']],
 retail:[['checkout','sales'],['stockroom','sales']],
 office:[['reception','lobby'],['hallway','office']],
 garage:[['bay','workshop'],['bay','aisle'],['reception','waiting']],
 warehouse:[['loading','storage'],['loading','packing']],
 restaurant:[['kitchen','service'],['kitchen','pantry'],['dining','reception']],
 utility:[['equipment','control'],['service','maintenance']],
 clinic:[['waiting','reception'],['hallway','exam'],['hallway','treatment']]
};
const adjacentCells=(b:Blueprint,r:number,c:number,rr:number,cc:number)=>
 Math.abs(r-rr)+Math.abs(c-cc)===1&&
 (r===rr?b.depths[r]:b.widths[c])>=68;
/** Reports missing essential door-capable room contacts before walls exist. */
export function missingCriticalRoomContacts(b:Blueprint):
 {a:string;b:string}[]{
 const present=new Set(b.cells.flat().filter((v):v is string=>v!==null));
 const cells=b.cells.flatMap((row,r)=>row.map((role,c)=>({role,r,c})))
   .filter((cell):cell is {role:string;r:number;c:number}=>cell.role!==null);
 return (criticalContacts[b.kind]??[])
   .filter(([a,z])=>present.has(a)&&present.has(z))
   .filter(([a,z])=>!cells.some(c=>c.role===a&&cells.some(other=>
     other.role===z&&adjacentCells(b,c.r,c.c,other.r,other.c))))
   .map(([a,b])=>({a,b}));
}
const contiguousRoles=new Set(['sales','dining','living','kitchen','stockroom',
 'cubicles','waiting','reception','equipment']);
/** Track clusters, not just inventories: spatial fitting must not split an
 * open working room into disconnected islands while optimizing adjacency.
 */
export function roleFragmentCount(b:Blueprint,role:string):number{
 const rows=b.cells.length,cols=b.widths.length;
 const visited=new Set<string>();
 let groups=0;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  if(b.cells[r][c]!==role||visited.has(r+':'+c))continue;
  groups++;
  const pending=[[r,c]];
  while(pending.length){
   const [y,x]=pending.pop()!,id=y+':'+x;
   if(visited.has(id)||b.cells[y]?.[x]!==role)continue;
   visited.add(id);
   for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]])
    if(b.cells[y+dy]?.[x+dx]===role)pending.push([y+dy,x+dx]);
  }
 }
 return groups;
}
export function blueprintRelationshipCost(b:Blueprint):number{
 const cells=b.cells,rows=cells.length,cols=b.widths.length;
 let cost=0;
 const at=(r:number,c:number):Cell=>r>=0&&r<rows&&c>=0&&c<cols?cells[r][c]:null;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const role=at(r,c);if(!role)continue;
  for(const [dy,dx] of [[0,1],[1,0]]){
   const other=at(r+dy,c+dx);
   if(other)cost+=relationshipScore(b.kind,role,other);
  }
  // Rooms needing daylight or loading approach benefit from a real perimeter.
  const exposed=at(r-1,c)===null||at(r+1,c)===null||
    at(r,c-1)===null||at(r,c+1)===null;
  if(daylight.has(role)&&!exposed)cost+=24;
  if(access.has(role)&&!exposed)cost+=34;
  const frontDist=Math.abs(r-b.front.row)+Math.abs(c-b.front.col);
  if(privateRooms.has(role)&&frontDist<=1)cost+=38;
  if(publicRooms.has(role)&&frontDist>2)cost+=Math.min(18,(frontDist-2)*4);
 }
 // A working doorway between key spaces matters more than a label match.
 cost+=missingCriticalRoomContacts(b).length*48;
 return cost;
}
export function fitSpatialProgram(b:Blueprint,maxSwaps=3):Blueprint{
 // A multi-unit apartment's coordinates are part of its property boundary.
 if(b.unitIds||b.kind==='apartment'||b.kind==='motel'||maxSwaps<=0)return b;
 const cells=b.cells.map(row=>[...row]),n=cells.length,m=b.widths.length;
 const originalRoles=b.cells.flat();
 const preservedFragments=new Map([...contiguousRoles].map(role=>
  [role,roleFragmentCount(b,role)]));
 let changed=0;
 let current:Blueprint={...b,cells};
 let bestCost=blueprintRelationshipCost(current);
 for(let pass=0;pass<Math.min(4,maxSwaps);pass++){
  let best:{r:number;c:number;rr:number;cc:number;cost:number}|undefined;
  for(let r=0;r<n;r++)for(let c=0;c<m;c++){
   const role=cells[r][c];
   if(!role||r===b.front.row&&c===b.front.col)continue;
   if(role==='hallway'||role==='aisle')continue;
   for(let rr=r;rr<n;rr++)for(let cc=rr===r?c+1:0;cc<m;cc++){
    const other=cells[rr][cc];
    if(!other||other===role||rr===b.front.row&&cc===b.front.col)continue;
    if(category(role)!==category(other))continue;
    cells[r][c]=other;cells[rr][cc]=role;
    const fragmentation=[role,other].some(active=>contiguousRoles.has(active)&&
      roleFragmentCount(current,active)>(preservedFragments.get(active)??0));
    const score=fragmentation?Infinity:blueprintRelationshipCost(current);
    cells[r][c]=role;cells[rr][cc]=other;
    // Strict improvement: original authored layouts are stable on ties.
    if(score<bestCost-4&&(!best||score<best.cost)){
     best={r,c,rr,cc,cost:score};
    }
   }
  }
  if(!best)break;
  [cells[best.r][best.c],cells[best.rr][best.cc]]=
   [cells[best.rr][best.cc],cells[best.r][best.c]];
  bestCost=best.cost;changed++;
 }
 // The cost is additive, but the original role inventory is a hard invariant.
 if(cells.flat().slice().sort().join('|')!==
    originalRoles.slice().sort().join('|'))throw Error('spatial fitting altered room inventory');
 return changed?{...current,cells,family:b.family+' / spatial-fit'}:b;
}
