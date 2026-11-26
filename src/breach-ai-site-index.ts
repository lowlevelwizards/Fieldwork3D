/** Revision-scoped, session-owned semantic scene data. This is not a
 * navigation engine: candidate destinations still require the live motor. */
import type {Pt,Door,Obstacle} from './breach-core.ts';
import type {Site} from './breach-site.ts';
import type {SessionWorldGeometry} from './breach-world-context.ts';
export type SceneAnchor={p:Pt;radius:number;kind:'fixture'|'room'|'door'};
export type SceneArea={id:string;kind:'room'|'hall'|'exterior';x:number;y:number;w:number;h:number;center:Pt};
export type ScenePortal={id:string;kind:'door'|'opening'|'window';center:Pt;areas:readonly string[]};
export type AiSiteIndex={anchors:readonly SceneAnchor[];areas:readonly SceneArea[];portals:readonly ScenePortal[]};
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
 const portal=(id:string,kind:ScenePortal['kind'],a:Pt,b:Pt)=>{
  const p=center(a,b),len=Math.hypot(b.x-a.x,b.y-a.y);
  const adjacent:string[]=[];
  if(len>0)for(const sign of [-1,1]){
   for(const offset of [12,24,40]){
    const probe={x:p.x+sign*(b.y-a.y)/len*offset,y:p.y-sign*(b.x-a.x)/len*offset};
    const found=areas.find(r=>contains(r,probe));
    if(found){if(!adjacent.includes(found.id))adjacent.push(found.id);break;}
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
 return {anchors,areas,portals};
}
const indexes=new WeakMap<SessionWorldGeometry,{revision:number;doorKey:string;site:Site|null;index:AiSiteIndex}>();
export function aiSiteIndex(world:SessionWorldGeometry,doors:readonly Door[]):AiSiteIndex{
 const revision=world.revision;
 // Leaves opening/closing do not alter their threshold. Geometry edits do.
 const doorKey=doors.map(d=>[d.id,d.a.x,d.a.y,d.b.x,d.b.y].join(':')).join('|');
 const cached=indexes.get(world);
 if(cached&&cached.revision===revision&&cached.doorKey===doorKey&&cached.site===world.site)return cached.index;
 const index=buildAiSiteIndex(world.site,world.cover,doors);
 indexes.set(world,{revision,doorKey,site:world.site,index});
 return index;
}
/** Adjacent area proposals only; windows are never treated as walkable edges. */
export function connectedAreaCenters(index:AiSiteIndex,from:Pt):Pt[]{
 const current=index.areas.find(a=>contains(a,from));
 if(!current)return [];
 const ids=new Set<string>();
 for(const p of index.portals)
  if(p.kind!=='window'&&p.areas.includes(current.id))
   for(const id of p.areas)if(id!==current.id)ids.add(id);
 return index.areas.filter(a=>ids.has(a.id)).map(a=>({...a.center}));
}
