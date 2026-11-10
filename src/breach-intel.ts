import type {SessionWorldGeometry} from './breach-world-context.ts';
/** 140: Player intelligence is not the same as physical world truth.
 * Architecture may be prebriefed; cover and moving objects are only known
 * after observation. All modes share the same discovered state. */
import {WALLS,COVER,activeWorldBounds,pointToSegment,route,type Door,type Pt,
  type Segment,someWallNearPoint,someCoverNearPoint} from './breach-core.ts';
import type {Site} from './breach-site.ts';
import {isFootstepObstacle} from './breach-traversal-surfaces.ts';
import {insideSiteFootprint,accessibleExteriorWall} from './breach-site-footprint.ts';
import {groundKnowledgeAt,groundFogLevel} from './breach-ground-knowledge.ts';
export type IntelMode='true-blind'|'exterior-known'|'floor-plan'|'full-view';
export type IntelState={
 mode:IntelMode;
 walls:Set<number>;doors:Set<string>;cover:Set<number>;
 rooms:Set<string>;doorMemory:Map<string,number>;
};
/** Each live intel snapshot reads only its owning world. Weak binding
 * stays out of serialized fog/replay schemas and permits old sessions to GC.
 */
const intelWorlds=new WeakMap<IntelState,SessionWorldGeometry>();
export function bindIntelWorld(intel:IntelState,world:SessionWorldGeometry):void{
 intelWorlds.set(intel,world);
}
const ownerWorld=(intel:IntelState,world?:SessionWorldGeometry)=>
 world??intelWorlds.get(intel);
export const INTEL_MODES:readonly IntelMode[]=[
 'true-blind','exterior-known','floor-plan','full-view'];
export function insideBuilding(site:Site|undefined,p:Pt):boolean{
 if(!site)return p.x>112&&p.x<590&&p.y>100&&p.y<532;
 return insideSiteFootprint(site,p);
}
export const exteriorAt=(site:Site|undefined,p:Pt)=>
 !insideBuilding(site,p);
export function exteriorWall(site:Site|undefined,wall:Segment){
 const m={x:(wall.a.x+wall.b.x)*.5,y:(wall.a.y+wall.b.y)*.5};
 const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y;
 const length=Math.max(1,Math.hypot(dx,dy));
 const perp={x:-dy/length*10,y:dx/length*10};
 return insideBuilding(site,{x:m.x+perp.x,y:m.y+perp.y})!==
   insideBuilding(site,{x:m.x-perp.x,y:m.y-perp.y});
}
export function initialIntel(mode:IntelMode,site:Site|undefined,
  doors:Door[],world?:SessionWorldGeometry):IntelState{
 const bound=ownerWorld(intel,world);
 const walls=bound?.walls??WALLS,cover=bound?.cover??COVER;
 const intel:IntelState={mode,walls:new Set(),doors:new Set(),
   cover:new Set(),rooms:new Set(),doorMemory:new Map()};
 if(mode==='full-view'){
   walls.forEach((_,i)=>intel.walls.add(i));
   doors.forEach(d=>intel.doors.add(d.id));
   cover.forEach((_,i)=>intel.cover.add(i));
   site?.rooms.forEach(r=>intel.rooms.add(r.id));
 }else if(mode==='floor-plan'){
   walls.forEach((_,i)=>intel.walls.add(i));
   doors.forEach(d=>intel.doors.add(d.id));
   site?.rooms.forEach(r=>intel.rooms.add(r.id));
 }else if(mode==='exterior-known'){
   walls.forEach((w,i)=>{if(accessibleExteriorWall(site,w))intel.walls.add(i)});
   doors.forEach(d=>{
     if(accessibleExteriorWall(site,d))intel.doors.add(d.id);
   });
 }
 return intel;
}
export function observeIntel(intel:IntelState,site:Site|undefined,
  doors:Door[],visible:(p:Pt)=>boolean,world?:SessionWorldGeometry){
 const walls=world?.walls??WALLS,cover=world?.cover??COVER;
 const observesSegment=(seg:Segment)=>{
   const dx=seg.b.x-seg.a.x,dy=seg.b.y-seg.a.y;
   const n=Math.max(1,Math.hypot(dx,dy));
   for(const t of [.25,.5,.75]){
     const p={x:seg.a.x+dx*t,y:seg.a.y+dy*t};
     const nx=-dy/n*12,ny=dx/n*12;
     if(visible(p)||visible({x:p.x+nx,y:p.y+ny})||
       visible({x:p.x-nx,y:p.y-ny}))return true;
   }
   return false;
 };
 // Structural/fixture knowledge is monotonic. Once discovered, it cannot
 // improve by re-running 3-9 LOS rays every observation interval.
 walls.forEach((w,i)=>{
   if(!intel.walls.has(i)&&observesSegment(w))intel.walls.add(i);
 });
 doors.forEach(d=>{
   if(observesSegment(d)){
     intel.doors.add(d.id);
     intel.doorMemory.set(d.id,d.openFraction??(d.open?1:0));
   }
 });
 cover.forEach((o,i)=>{
   if(intel.cover.has(i))return;
   // Exposed sample points are outside the collidable/occluding box.
   const x=o.w/2+2.5,y=o.h/2+2.5;
   const samples=[
     {x:o.x-x,y:o.y},{x:o.x+x,y:o.y},
     {x:o.x,y:o.y-y},{x:o.x,y:o.y+y},
     {x:o.x-x,y:o.y-y},{x:o.x+x,y:o.y-y},
     {x:o.x-x,y:o.y+y},{x:o.x+x,y:o.y+y},
   ];
   if(samples.some(visible))intel.cover.add(i);
 });
 site?.rooms.forEach(r=>{
   if(intel.rooms.has(r.id))return;
   if(visible({x:r.x+r.w/2,y:r.y+r.h/2})||
      visible({x:r.x+12,y:r.y+12}))intel.rooms.add(r.id);
 });
}
/** Direct physical contact reveals only the touched furniture, never remote cover. */
export function discoverContactCover(intel:IntelState,at:Pt,reach=12,
 world?:SessionWorldGeometry){
 const cover=ownerWorld(intel,world)?.cover??COVER;
 const found:number[]=[];
 cover.forEach((o,i)=>{
   const dx=Math.max(0,Math.abs(at.x-o.x)-o.w/2);
   const dy=Math.max(0,Math.abs(at.y-o.y)-o.h/2);
   if(Math.hypot(dx,dy)<=reach&&!intel.cover.has(i)){
     intel.cover.add(i);found.push(i);
   }
 });
 return found;
}
export const wallKnown=(intel:IntelState,i:number)=>intel.walls.has(i);
export const doorKnown=(intel:IntelState,id:string)=>intel.doors.has(id);
export const coverKnown=(intel:IntelState,i:number)=>intel.cover.has(i);
export const roomKnown=(intel:IntelState,id:string)=>intel.rooms.has(id);
export function intelPassable(p:Pt,intel:IntelState,clearance=8,
 world?:SessionWorldGeometry):boolean{
 world=ownerWorld(intel,world);
 const bounds=world?.bounds??activeWorldBounds();
 if(p.x<bounds.minX+13||p.y<bounds.minY+20||
   p.x>bounds.maxX-13||p.y>bounds.maxY-13)return false;
 if((world?.someWallNearPoint.bind(world)??someWallNearPoint)(p,clearance+1,(w,i)=>intel.walls.has(i)&&
   pointToSegment(p,w)<clearance+1))return false;
 if((world?.someCoverNearPoint.bind(world)??someCoverNearPoint)(p,clearance,(o,i)=>isFootstepObstacle(o)&&intel.cover.has(i)&&
   Math.abs(p.x-o.x)<o.w/2+clearance&&
   Math.abs(p.y-o.y)<o.h/2+clearance))return false;
 return true;
}
export const routeWithIntel=(intel:IntelState,from:Pt,to:Pt,
 world?:SessionWorldGeometry)=>
 (world??intelWorlds.get(intel))?
 (world??intelWorlds.get(intel))!.route(from,to,p=>intelPassable(p,intel,8,world)):
 route(from,to,p=>intelPassable(p,intel));
export function intelFogLevel(intel:IntelState,site:Site|undefined,
  p:Pt,currentlyVisible:boolean,everSeen:boolean){
 return groundFogLevel(groundKnowledgeAt(intel.mode,site,p,currentlyVisible,everSeen));
}
export const intelSnapshot=(intel:IntelState)=>({
 mode:intel.mode,walls:[...intel.walls],doors:[...intel.doors],
 cover:[...intel.cover],rooms:[...intel.rooms],
 doorMemory:[...intel.doorMemory] as [string,number][]
});
export function intelRestore(f:ReturnType<typeof intelSnapshot>):IntelState{
 return {mode:f.mode,walls:new Set(f.walls),doors:new Set(f.doors),
 cover:new Set(f.cover),rooms:new Set(f.rooms),
 doorMemory:new Map(f.doorMemory)};
}
