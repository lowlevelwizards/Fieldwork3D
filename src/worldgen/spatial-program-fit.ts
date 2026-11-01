/** Bounded spatial fitting of a building's semantic floor program.
 * Rearranges compatible rooms before authoritative walls and doors exist.
 * No role may disappear, the entrance stays fixed, and apartments/motels keep
 * their self-contained units. The physical compiler still owns navigation.
 */
import type {Blueprint} from './architectural-program.ts';
import {relationshipScore} from './room-relationships.ts';

const publicRooms=new Set(['waiting','reception','lobby','sales','checkout','dining','living']);
const privateRooms=new Set(['bedroom','bathroom','restroom','guest','exam','treatment']);
const serviceRooms=new Set(['stockroom','storage','kitchen','pantry','service',
 'staff','supply','break','laundry','maintenance','packing','parts','workshop',
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
 return cost;
}
export function fitSpatialProgram(b:Blueprint,maxSwaps=3):Blueprint{
 // A multi-unit apartment's coordinates are part of its property boundary.
 if(b.unitIds||b.kind==='apartment'||b.kind==='motel'||maxSwaps<=0)return b;
 const cells=b.cells.map(row=>[...row]),n=cells.length,m=b.widths.length;
 const originalRoles=b.cells.flat();
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
    const score=blueprintRelationshipCost(current);
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
