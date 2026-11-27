/** Revision-scoped, session-owned semantic scene data. This is not a
 * navigation engine: candidate destinations still require the live motor. */
import type {Pt,Door,Obstacle} from './breach-core.ts';
import type {Site} from './breach-site.ts';
import type {SessionWorldGeometry} from './breach-world-context.ts';
export type SceneAnchor={p:Pt;radius:number;kind:'fixture'|'room'|'door'};
export type SceneArea={id:string;kind:'room'|'hall'|'exterior';x:number;y:number;w:number;h:number;center:Pt};
export type ScenePortal={id:string;kind:'door'|'opening'|'window';center:Pt;areas:readonly string[]};
export type SceneObservation={p:Pt;areaId:string;kind:'window'|'area'};
export type AiSiteIndex={anchors:readonly SceneAnchor[];areas:readonly SceneArea[];portals:readonly ScenePortal[];observations:readonly SceneObservation[]};
const center=(a:Pt,b:Pt):Pt=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const contains=(a:SceneArea,p:Pt)=>p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h;
const area=(r:{id:string;x:number;y:number;w:number;h:number},kind:SceneArea['kind']):SceneArea=>
 ({id:r.id,kind,x:r.x,y:r.y,w:r.w,h:r.h,center:{x:r.x+r.w/2,y:r.y+r.h/2}});
export function buildAiSiteIndex(site:Site|null,cover:readonly Obstacle[],doors:readonly Door[]):AiSiteIndex{
 const anchors:SceneAnchor[]=[];
 const add=(p:Pt,radius:number,kind:SceneAnchor['kind'])=>anchors.push({p,radius,kind});
 // Preserve legacy candidate order and radii for a behavior-neutral cache.
 for(const f of cover){
  add({x:f.x-f.w/2-19,y:f.y},220,'fixture');
  add({x:f.x+f.w/2+19,y:f.y},220,'fixture');
  add({x:f.x,y:f.y-f.h/2-19},220,'fixture');
  add({x:f.x,y:f.y+f.h/2+19},220,'fixture');
 }
 for(const r of site?.rooms??[{x:112,y:100,w:478,h:432}]){
  for(const x of [r.x+29,r.x+r.w-29])
   for(const y of [r.y+29,r.y+r.h-29])add({x,y},240,'room');
  for(const x of [r.x+29,r.x+r.w-29])add({x,y:r.y+r.h/2},215,'room');
  for(const y of [r.y+29,r.y+r.h-29])add({x:r.x+r.w/2,y},215,'room');
 }
 const areas:SceneArea[]=[...(site?.rooms??[]).map(r=>area(r,r.kind)),
  ...(site?.exteriorZones??[]).map(r=>area(r,'exterior'))];
 const portals:ScenePortal[]=[];
 const observations:SceneObservation[]=areas.map(a=>({p:{...a.center},areaId:a.id,kind:'area'}));
 const portal=(id:string,kind:ScenePortal['kind'],a:Pt,b:Pt)=>{
  const p=center(a,b),len=Math.hypot(b.x-a.x,b.y-a.y);
  const adjacent:string[]=[];
  if(len>0)for(const sign of [-1,1]){
   for(const offset of [12,24,40]){
    const probe={x:p.x+sign*(b.y-a.y)/len*offset,y:p.y-sign*(b.x-a.x)/len*offset};
    const found=areas.find(r=>contains(r,probe));
    if(found){
     if(!adjacent.includes(found.id))adjacent.push(found.id);
     if(kind==='window'){
      // A window provides a possible observation location, never a
      // movement edge. The live passability/route checks remain mandatory.
      const point={x:p.x+sign*(b.y-a.y)/len*38,y:p.y-sign*(b.x-a.x)/len*38};
      if(contains(found,point))observations.push({p:point,areaId:found.id,kind:'window'});
     }
     break;
    }
   }
  }
  portals.push({id,kind,center:p,areas:adjacent});
 };
 for(const d of doors){
  const p=center(d.a,d.b);
  for(const x of [-38,38])for(const y of [-38,38])add({x:p.x+x,y:p.y+y},195,'door');
  portal(d.id,'door',d.a,d.b);
 }
 for(const o of site?.openings??[])portal(o.id,'opening',o.a,o.b);
 for(const w of site?.windows??[]){
  const dx=w.vertical?0:w.width/2,dy=w.vertical?w.width/2:0;
  portal(w.id,'window',{x:w.x-dx,y:w.y-dy},{x:w.x+dx,y:w.y+dy});
 }
 return {anchors,areas,portals,observations};
}
type DoorThreshold={id:string;ax:number;ay:number;bx:number;by:number};
const indexes=new WeakMap<SessionWorldGeometry,{revision:number;thresholds:DoorThreshold[];site:Site|null;index:AiSiteIndex}>();
function sameThresholds(previous:readonly DoorThreshold[],doors:readonly Door[]):boolean{
 if(previous.length!==doors.length)return false;
 for(let i=0;i<doors.length;i++){
  const old=previous[i],door=doors[i];
  if(old.id!==door.id||old.ax!==door.a.x||old.ay!==door.a.y||old.bx!==door.b.x||old.by!==door.b.y)return false;
 }
 return true;
}
export function aiSiteIndex(world:SessionWorldGeometry,doors:readonly Door[]):AiSiteIndex{
 const revision=world.revision,site=world.site;
 const cached=indexes.get(world);
 // Read scalar thresholds directly on a cache hit. No per-query strings,
 // nested arrays or map allocations. In-place geometry edits still invalidate.
 if(cached&&cached.revision===revision&&cached.site===site&&sameThresholds(cached.thresholds,doors))return cached.index;
 const index=buildAiSiteIndex(site,world.cover,doors);
 const thresholds=doors.map(d=>({id:d.id,ax:d.a.x,ay:d.a.y,bx:d.b.x,by:d.b.y}));
 indexes.set(world,{revision,thresholds,site,index});
 return index;
}
const adjacencyCache=new WeakMap<AiSiteIndex,ReadonlyMap<string,readonly string[]>>();
function adjacencyFor(index:AiSiteIndex){
 const cached=adjacencyCache.get(index);if(cached)return cached;
 const map=new Map<string,Set<string>>();
 for(const p of index.portals){
  if(p.kind==='window')continue;
  for(const id of p.areas){
   let set=map.get(id);if(!set)map.set(id,set=new Set());
   for(const other of p.areas)if(other!==id)set.add(other);
  }
 }
 const adjacency=new Map([...map].map(([id,ids])=>[id,[...ids]]));
 adjacencyCache.set(index,adjacency);return adjacency;
}
/** Adjacent area proposals only; windows are never treated as walkable edges. */
function connectedAreaIds(index:AiSiteIndex,from:Pt,maxHops:number):string[]{
 const current=index.areas.find(a=>contains(a,from));
 if(!current)return [];
 const visited=new Set([current.id]),result:string[]=[];
 let frontier=[current.id];
 for(let hop=0;hop<Math.min(3,Math.max(0,Math.floor(maxHops)))&&frontier.length;hop++){
  const next=new Set<string>();
  const adjacency=adjacencyFor(index);
  for(const current of frontier)
   for(const id of adjacency.get(current)??[])if(!visited.has(id))next.add(id);
  frontier=index.areas.filter(a=>next.has(a.id)).map(a=>a.id);
  for(const id of frontier){visited.add(id);result.push(id);}
 }
 return result;
}
export function connectedAreaCenters(index:AiSiteIndex,from:Pt,maxHops=1):Pt[]{
 return connectedAreaIds(index,from,maxHops).map(id=>({...index.areas.find(a=>a.id===id)!.center}));
}
/** Bounded game-space observation proposals near personally known evidence.
 * No live opponent query; no teleport; a window never supplies connectivity. */
export function groupObservationProposals(index:AiSiteIndex,from:Pt,estimate:Pt,
 reservations:readonly Pt[],maxHops=2):Pt[]{
 const current=index.areas.find(a=>contains(a,from));
 if(!current)return [];
 const connected=new Set(connectedAreaIds(index,from,maxHops));
 const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
 return index.observations.filter(o=>
   (connected.has(o.areaId)||o.areaId===current.id&&o.kind==='window')&&
   distance(o.p,from)>45&&distance(o.p,from)<350&&
   reservations.every(q=>distance(q,o.p)>50))
  .map((o,i)=>({o,i,score:distance(o.p,estimate)+distance(o.p,from)*.25}))
  .sort((a,b)=>a.score-b.score||a.i-b.i).slice(0,4).map(({o})=>({...o.p}));
}
