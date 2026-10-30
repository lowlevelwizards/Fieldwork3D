/** Integrated seed audit for procedural encounters. No renderer required.
 * Runs in deterministic world space; a CLI can exercise thousands of maps
 * without incurring browser startup on every CI run. */
import {activateSite,passable,route,type Pt} from './breach-core.ts';
import {generateSite} from './breach-site.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type SiteAudit={seed:number;archetype:string;layout:string;
  rooms:number;doors:number;enemies:number;windows:number;
  errors:string[]};
export function auditGeneratedSite(seed:number):SiteAudit{
  const site=generateSite(seed);
  activateSite(site);
  const errors:string[]=[];
  try{
    if(site.spawn.length!==4)errors.push('expected four operator spawns');
    if(site.enemies.length<2)errors.push('insufficient enemies');
    if(site.rooms.length<3)errors.push('site has too few rooms');
    for(const [label,p] of [
      ...site.spawn.map((p,i)=>['operator '+i,p] as const),
      ...site.enemies.map((p,i)=>['enemy '+i,p] as const),
      ['objective',site.objective] as const,
      ['extraction',site.extract] as const]){
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||
        !passable(p))errors.push(label+' is invalid');
    }
    const from=site.spawn[0];
    for(const [label,p] of [
      ['objective',site.objective] as const,
      ...site.enemies.map((p,i)=>['enemy '+i,p] as const)]){
      if(passable(p)&&!route(from,p).length)
        errors.push(label+' unreachable');
    }
    const ids=new Set<string>();
    for(const door of site.doors){
      if(ids.has(door.id))errors.push('duplicate door '+door.id);
      ids.add(door.id);
      if(Math.abs(dist(door.a,door.b)-48)>1e-5)
        errors.push('door width '+door.id);
    }
    for(const w of site.windows??[]){
      const sill=site.cover.find(c=>c.fixture==='window-sill'&&
        dist({x:c.x,y:c.y},{x:w.x,y:w.y})<1);
      if(!sill)errors.push('window lacks sill '+w.id);
    }
    if(site.archetype===undefined)errors.push('archetype not assigned');
    if(site.rooms.some(r=>!r.purpose))errors.push('untyped room');
  }finally{activateSite(null);}
  return {seed,archetype:site.archetype??'untyped',
    layout:site.layout,rooms:site.rooms.length,
    doors:site.doors.length,enemies:site.enemies.length,
    windows:site.windows?.length??0,errors};
}
