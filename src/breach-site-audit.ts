/** Integrated seed audit for procedural encounters. No renderer required.
 * Runs in deterministic world space; a CLI can exercise thousands of maps
 * without incurring browser startup on every CI run. */
import {activateSite,passable,route,type Pt} from './breach-core.ts';
import {generateSite,type SiteScale} from './breach-site.ts';
import {assessArchitecture} from './worldgen/architecture-quality.ts';
import {auditRoomRelationships,type SpatialRelationshipDiagnostic} from './worldgen/room-relationships.ts';
import {assessRoomContracts,type RoomContractResult} from './worldgen/room-contracts.ts';
import {assessUnitContracts,type UnitContractResult} from './worldgen/unit-contracts.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type SiteAudit={seed:number;archetype:string;layout:string;
  rooms:number;doors:number;enemies:number;windows:number;
  archOpenings:number;exteriorZones:number;dressing:number;
  condition:string;typedProps:number;functionalRooms:number;
  roomFill:{id:string;role:string;fixtures:number;areaM2:number}[];emptyRooms:string[];
  roomContracts:RoomContractResult[];incompleteZones:string[];
  furnishingIssues:{roomId:string;fixture:string;reason:string}[];
  undesirableDoorways:SpatialRelationshipDiagnostic[];
  unitContracts:UnitContractResult[];
  errors:string[]};
export function auditGeneratedSite(seed:number,scale:SiteScale='standard'):SiteAudit{
  const site=generateSite(seed,scale);
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
      const width=dist(door.a,door.b);
      if(door.kind==='shutter'?
         width<80||width>114:Math.abs(width-48)>1e-5)
        errors.push('door width '+door.id);
    }
    for(const w of site.windows??[]){
      const sill=site.cover.find(c=>c.fixture==='window-sill'&&
        dist({x:c.x,y:c.y},{x:w.x,y:w.y})<1);
      if(!sill)errors.push('window lacks sill '+w.id);
    }
    if(site.archetype===undefined)errors.push('archetype not assigned');
    errors.push(...assessArchitecture(site).errors);
    if(site.rooms.some(r=>!r.purpose))errors.push('untyped room');
    const roomIds=new Set<string>();
    for(const room of site.rooms){
      if(roomIds.has(room.id))errors.push('duplicate room '+room.id);
      roomIds.add(room.id);
      if(!Number.isFinite(room.x)||!Number.isFinite(room.y)||
         !Number.isFinite(room.w)||!Number.isFinite(room.h)||
         room.w<=0||room.h<=0)errors.push('invalid room '+room.id);
    }
    for(const opening of site.openings??[]){
      if(!Number.isFinite(dist(opening.a,opening.b))||
        dist(opening.a,opening.b)<=48)errors.push('invalid open passage '+opening.id);
    }
    for(const detail of site.dressing??[]){
      if(!roomIds.has(detail.roomId))errors.push('orphan detail '+detail.id);
      if(!Number.isFinite(detail.x)||!Number.isFinite(detail.y)||
        !Number.isFinite(detail.elevation))errors.push('invalid detail '+detail.id);
    }
    if(site.enemyHeadings && (site.enemyHeadings.length!==site.enemies.length||
      site.enemyHeadings.some(h=>!Number.isFinite(h))))
      errors.push('invalid enemy orientations');
  }finally{activateSite(null);}
  const roomFill=site.rooms.filter(r=>r.kind==='room').map(room=>({
    id:room.id,role:room.purpose??'untyped',
    areaM2:Math.round(room.w*room.h/400*10)/10,
    fixtures:site.cover.filter(o=>o.fixture&&o.fixture!=='window-sill'&&
      o.x>room.x&&o.x<room.x+room.w&&o.y>room.y&&o.y<room.y+room.h).length
  }));
  const roomContracts=assessRoomContracts(site);
  return {seed,archetype:site.archetype??'untyped',
    layout:site.layout,rooms:site.rooms.length,
    doors:site.doors.length,enemies:site.enemies.length,
    windows:site.windows?.length??0,
    archOpenings:site.openings?.length??0,
    exteriorZones:site.exteriorZones?.length??0,
    dressing:site.dressing?.length??0,
    condition:site.condition??'unknown',
    typedProps:site.cover.filter(c=>!!c.fixture).length,
    functionalRooms:roomFill.length,roomFill,
    emptyRooms:roomFill.filter(r=>r.fixtures===0).map(r=>r.id),
    roomContracts,incompleteZones:roomContracts.filter(r=>!r.complete).map(r=>r.zoneId),
    furnishingIssues:site.furnishingIssues??[],
    undesirableDoorways:auditRoomRelationships(site),
    unitContracts:assessUnitContracts(site),errors};
}
