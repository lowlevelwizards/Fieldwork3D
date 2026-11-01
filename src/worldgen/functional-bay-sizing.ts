/** Structural space budgets derived from room function and REAL fixture
 * footprints, applied before rooms, walls, doors and windows are constructed.
 * A minimum is a planning constraint, not a claim that furnishings fit;
 * authoritative placement and room-contract audits still decide completion.
 */
import type {Blueprint} from './architectural-program.ts';
import {ROOM_CONTRACTS} from './room-contracts.ts';
import {propDefinition} from './asset-catalog.ts';

type Extent={w:number;d:number};
const operationalMinima:Record<string,Extent>={
 kitchen:{w:119,d:119},bathroom:{w:111,d:118},
 restroom:{w:99,d:104},exam:{w:127,d:124},
 treatment:{w:128,d:126},guest:{w:112,d:114},
 bedroom:{w:109,d:113},studio:{w:126,d:120},
 bay:{w:163,d:144},workshop:{w:125,d:126},
 packing:{w:116,d:109},loading:{w:142,d:130},
 equipment:{w:131,d:125},dining:{w:120,d:112},
 meeting:{w:116,d:110},checkout:{w:109,d:96}
};
export function roomCapacityTarget(purpose:string):Extent{
 const groups=ROOM_CONTRACTS[purpose]?.required??[];
 const sizes=groups.map(group=>{
  const assets=group.map(propDefinition).filter(
    (a):a is NonNullable<typeof a>=>!!a?.solid);
  return assets.sort((a,b)=>a.width*a.depth-b.width*b.depth)[0];
 }).filter((a):a is NonNullable<typeof a>=>!!a);
 const area=sizes.reduce((sum,a)=>sum+a.width*a.depth,0);
 // The fixture body cannot be the entire room: preserve working clearance
 // and door access. For an L-shaped multi-cell zone, each cell is still real.
 const areaSpan=Math.sqrt(area*1.8);
 const dynamic={
  w:Math.ceil(Math.max(72,areaSpan*.88,...sizes.map(a=>a.width+25))),
  d:Math.ceil(Math.max(72,areaSpan*.88,...sizes.map(a=>a.depth+25)))
 };
 const authored=operationalMinima[purpose]??{w:0,d:0};
 return {w:Math.max(dynamic.w,authored.w),d:Math.max(dynamic.d,authored.d)};
}
export function fitFunctionalBaySizes(plan:Blueprint):Blueprint{
 const widths=plan.widths.map((width,col)=>{
  // Never turn a narrow public corridor into a broad square room.
  if(plan.cells.some(row=>row[col]==='hallway'||row[col]==='aisle'))
   return width;
  const target=Math.max(0,...plan.cells.map(row=>row[col]?
    roomCapacityTarget(row[col]!).w:0));
  return Math.round(Math.max(width,Math.min(width+36,target)));
 });
 const depths=plan.depths.map((depth,row)=>{
  const roles=plan.cells[row].filter((r):r is string=>r!==null);
  if(!roles.some(r=>r!=='hallway'&&r!=='aisle'))return depth;
  const target=Math.max(0,...roles.filter(r=>r!=='hallway'&&r!=='aisle')
   .map(role=>roomCapacityTarget(role).d));
  return Math.round(Math.max(depth,Math.min(depth+36,target)));
 });
 if(widths.every((w,i)=>w===plan.widths[i])&&
    depths.every((d,i)=>d===plan.depths[i]))return plan;
 return {...plan,widths,depths,family:plan.family+' / capacity-fit'};
}
