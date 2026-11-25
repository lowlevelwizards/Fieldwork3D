/** W7: compile the existing four static floor wear sources, never combat evidence. */
import type {Site,Room} from '../breach-site.ts';
import {effectiveCondition} from './condition-visual.ts';
import {planEnvironmentalWear,type WearKind,type WearMark} from './environment-wear.ts';
import {planActivityWear} from './wear-sources.ts';
import {planHistoryWear} from './surface-history.ts';
import {planThresholdTrafficWear} from './threshold-traffic-wear.ts';
import {roomPixelSurface} from './pixel-surface-selection.ts';
import {canWear} from './material-properties.ts';
export const FLOOR_WEAR_COLOR:Record<WearKind,number>={
  dust:0x92816c,stain:0x655e4b,scrape:0xb2ae9e,scuff:0x444d47,
  oil:0x373834,grease:0x4e4538,rust:0xa2693f,chip:0xbab0a0,
  crack:0x4c4a43,scratch:0xd1cab7,drip:0x6e7771,mud:0x6b5641,
  footprint:0x655647,mineral:0xd3cec1,fade:0xc6bfaa,
  soot:0x343c39,moss:0x59714e,'paint-peel':0xbdb19f,
  fray:0xc4b9aa,abrade:0x918878,
};
export function planStaticFloorWear(site:Site):WearMark[]{
 return [...planEnvironmentalWear(site),...planActivityWear(site),...planHistoryWear(site),...planThresholdTrafficWear(site)];
}
const water=['sink','utility-sink','handwash-station','dish-station','toilet','bathtub','shower','laundry-machine','ice-machine'];
const cooking=['stove','commercial-range','fryer','kitchen-island'];
const machinery=['vehicle-lift','compressor','generator','tank','workbench','tool-chest'];
const wetRoles=['bathroom','restroom','half-bath','utility','laundry','kitchen','service','exam','treatment'];
const industrialRoles=['bay','workshop','equipment','maintenance','loading','packing','control'];
const cookingRoles=['kitchen','pantry','service'];
type Fixture=Site['cover'][number];
const inside=(room:Room,f:Fixture)=>f.x>=room.x&&f.x<=room.x+room.w&&f.y>=room.y&&f.y<=room.y+room.h&&!f.destroyed&&!f.toppled;
function sourceFor(room:Room,f:Fixture):WearKind|undefined{
 const role=room.purpose??room.kind,id=f.fixture??'';
 if(wetRoles.includes(role)&&water.includes(id))return 'mineral';
 if(cookingRoles.includes(role)&&cooking.includes(id))return 'grease';
 if(industrialRoles.includes(role)&&machinery.includes(id))return id==='workbench'||id==='tool-chest'?'scratch':'oil';
 return undefined;
}
function approach(room:Room,f:Fixture,w:number,d:number):{x:number;y:number}{
 const [dx,dy]=[[0,1],[1,0],[0,-1],[-1,0]][f.orientation??0]??[0,1];
 const dist=(dx?f.w:f.h)/2+Math.max(3,(dx?w:d)*.25);
 const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
 return {x:clamp(f.x+dx*dist,room.x+w/2,room.x+room.w-w/2),
         y:clamp(f.y+dy*dist,room.y+d/2,room.y+room.h-d/2)};
}
// Grease on washable flooring is a removable surface deposit, not substrate corrosion.
const floorCanWear=(surface:Parameters<typeof canWear>[0],kind:WearKind)=>canWear(surface,kind)||kind==='grease'&&['tile','linoleum','sealed-concrete','concrete'].includes(surface);
export function planCompiledFloorWear(site:Site,level=effectiveCondition(site)):WearMark[]{
 if(level<=0)return [];
 const input=level===effectiveCondition(site)?site:{...site,conditionLevel:level};
 const rooms=new Map(site.rooms.map(r=>[r.id,r]));
 const sources=new Map<string,{fixture:Fixture;index:number;kind:WearKind}[]>();
 for(const [index,fixture] of site.cover.entries()){
  if(!fixture.fixture)continue;
  const room=site.rooms.find(r=>inside(r,fixture));if(!room)continue;
  const kind=sourceFor(room,fixture);if(!kind)continue;
  const list=sources.get(room.id)??[];list.push({fixture,index,kind});sources.set(room.id,list);
 }
 const used=new Set<number>();
 const anchoredDeposits=new Set<string>();
 const result=planStaticFloorWear(input).flatMap(mark=>{
  const room=rooms.get(mark.roomId);if(!room)return [];
  const surface=roomPixelSurface(site.archetype,room.purpose??room.kind);
  const kind=mark.kind;
  if(!['oil','grease','drip','mineral'].includes(kind))return [mark];
  const candidates=(sources.get(room.id)??[]).filter(s=>s.kind===kind||(s.kind==='mineral'&&kind==='drip'));
  candidates.sort((a,b)=>Math.hypot(a.fixture.x-mark.x,a.fixture.y-mark.y)-Math.hypot(b.fixture.x-mark.x,b.fixture.y-mark.y));
  const anchor=candidates[0];
  if(!anchor||!floorCanWear(surface,kind))return [{...mark,kind:'scuff' as const}];
  const depositKey=anchor.index+':'+kind;
  if(anchoredDeposits.has(depositKey))return [];
  anchoredDeposits.add(depositKey);used.add(anchor.index);
  // Several old planners can describe the same deposit. Keep one visible
  // witness per real source/kind rather than stacking identical dark stamps.
  return [{...mark,...approach(room,anchor.fixture,mark.width,mark.depth)}];
 });
 // Sparse explicit witnesses for real fixtures absent from legacy planners.
 let added=0;
 if(level>=30)for(const [roomId,list] of sources){
  const room=rooms.get(roomId)!;
  const surface=roomPixelSurface(site.archetype,room.purpose??room.kind);
  for(const {fixture,index,kind} of list){
   if(added>=8||used.has(index)||!floorCanWear(surface,kind))continue;
   const width=Math.min(22,Math.max(10,fixture.w*.48),room.w*.4);
   const depth=Math.min(16,width*.7,room.h*.4);
   result.push({id:'w7-source:'+index,roomId,kind,...approach(room,fixture,width,depth),width,depth,
    rotation:(fixture.orientation??0)*Math.PI/2,opacity:.12+.28*level/100});
   added++;used.add(index);break;
  }
 }
 return result;
}
export function indexFloorWear(marks:readonly WearMark[]){
 const map=new Map<string,WearMark[]>();
 for(const mark of marks){const list=map.get(mark.roomId)??[];list.push(mark);map.set(mark.roomId,list);}
 return map;
}
