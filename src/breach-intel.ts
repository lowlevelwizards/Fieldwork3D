/** 140: Player intelligence is not the same as physical world truth.
 * Architecture may be prebriefed; cover and moving objects are only known
 * after observation. All modes share the same discovered state. */
import {WALLS,COVER,activeWorldBounds,pointToSegment,route,type Door,type Pt,
  type Segment} from './breach-core.ts';
import type {Site} from './breach-site.ts';
export type IntelMode='true-blind'|'exterior-known'|'floor-plan'|'full-view';
export type IntelState={
 mode:IntelMode;
 walls:Set<number>;doors:Set<string>;cover:Set<number>;
 rooms:Set<string>;doorMemory:Map<string,number>;
};
export const INTEL_MODES:readonly IntelMode[]=[
 'true-blind','exterior-known','floor-plan','full-view'];
export function insideBuilding(site:Site|undefined,p:Pt):boolean{
 if(!site)return p.x>112&&p.x<590&&p.y>100&&p.y<532;
 return site.rooms.some(room=>p.x>=room.x&&p.x<=room.x+room.w&&
   p.y>=room.y&&p.y<=room.y+room.h);
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
  doors:Door[]):IntelState{
 const intel:IntelState={mode,walls:new Set(),doors:new Set(),
   cover:new Set(),rooms:new Set(),doorMemory:new Map()};
 if(mode==='full-view'){
   WALLS.forEach((_,i)=>intel.walls.add(i));
   doors.forEach(d=>intel.doors.add(d.id));
   COVER.forEach((_,i)=>intel.cover.add(i));
   site?.rooms.forEach(r=>intel.rooms.add(r.id));
 }else if(mode==='floor-plan'){
   WALLS.forEach((_,i)=>intel.walls.add(i));
   doors.forEach(d=>intel.doors.add(d.id));
   site?.rooms.forEach(r=>intel.rooms.add(r.id));
 }else if(mode==='exterior-known'){
   WALLS.forEach((w,i)=>{if(exteriorWall(site,w))intel.walls.add(i)});
   doors.forEach(d=>{
     if(exteriorAt(site,{x:(d.a.x+d.b.x)*.5,y:(d.a.y+d.b.y)*.5})||
        exteriorWall(site,d))intel.doors.add(d.id);
   });
 }
 return intel;
}
export function observeIntel(intel:IntelState,site:Site|undefined,
  doors:Door[],visible:(p:Pt)=>boolean){
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
 WALLS.forEach((w,i)=>{if(observesSegment(w))intel.walls.add(i)});
 doors.forEach(d=>{
   if(observesSegment(d)){
     intel.doors.add(d.id);
     intel.doorMemory.set(d.id,d.openFraction??(d.open?1:0));
   }
 });
 COVER.forEach((o,i)=>{
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
   if(visible({x:r.x+r.w/2,y:r.y+r.h/2})||
      visible({x:r.x+12,y:r.y+12}))intel.rooms.add(r.id);
 });
}
/** Direct physical contact reveals only the touched furniture, never remote cover. */
export function discoverContactCover(intel:IntelState,at:Pt,reach=12){
 const found:number[]=[];
 COVER.forEach((o,i)=>{
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
export function intelPassable(p:Pt,intel:IntelState,clearance=8):boolean{
 const bounds=activeWorldBounds();
 if(p.x<bounds.minX+13||p.y<bounds.minY+20||
   p.x>bounds.maxX-13||p.y>bounds.maxY-13)return false;
 if(WALLS.some((w,i)=>intel.walls.has(i)&&
   pointToSegment(p,w)<clearance+1))return false;
 if(COVER.some((o,i)=>intel.cover.has(i)&&
   Math.abs(p.x-o.x)<o.w/2+clearance&&
   Math.abs(p.y-o.y)<o.h/2+clearance))return false;
 return true;
}
export const routeWithIntel=(intel:IntelState,from:Pt,to:Pt)=>
 route(from,to,p=>intelPassable(p,intel));
export function intelFogLevel(intel:IntelState,site:Site|undefined,
  p:Pt,currentlyVisible:boolean,everSeen:boolean){
 if(intel.mode==='full-view'||currentlyVisible)return 0;
 if(everSeen)return 1;
 if(intel.mode==='floor-plan')return 1;
 if(intel.mode==='exterior-known'&&exteriorAt(site,p))return 1;
 return 2;
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
