/** Roadmap 2 / Stage 2: read-only physical integrity contracts for compiled sites.
 * This is a deliberate, on-demand deep audit. Do not run route() for every
 * room during ordinary generation, in the render frame, or in the 60 Hz tick.
 * No solver-specific shortcuts: the real tactical passable/route predicates
 * decide whether actors can physically occupy and reach these locations.
 */
import type {Site} from '../breach-site.ts';
import {passable,route,pointToSegment,withTemporarySiteGeometry,
  type Pt,type Segment} from '../breach-core.ts';
import {auditTacticalMobility} from './tactical-mobility-audit.ts';
import {auditFixtureService} from './fixture-service-clearance.ts';
import {assessRoomContracts,ROOM_CONTRACTS} from './room-contracts.ts';

export type PhysicalIntegrityFinding={
 code:'invalid-geometry'|'invalid-position'|'unreachable-position'|
  'duplicate-door'|'blocked-portal'|'missing-window-collider'|
  'unreachable-room'|'blocked-swing'|'blocked-flow'|
  'tight-approach'|'blocked-approach'|'pinched-threshold'|
  'blocked-service-face'|'missing-essential';
 entity:string;
 detail:string;
};
export type PhysicalIntegrityReport={
 seed:number;archetype:string;checkedRooms:number;checkedDoors:number;
 checkedPositions:number;blocking:PhysicalIntegrityFinding[];
 warnings:PhysicalIntegrityFinding[];
};
const finite=(p:Pt)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const length=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const hasObstructingWall=(p:Pt,walls:readonly Segment[])=>
 walls.some(w=>pointToSegment(p,w)<1.1);
const portalBlocked=(s:{a:Pt;b:Pt},walls:readonly Segment[])=>[.3,.5,.7]
 .some(t=>hasObstructingWall({x:s.a.x+(s.b.x-s.a.x)*t,
  y:s.a.y+(s.b.y-s.a.y)*t},walls));
/** Require a physically usable point within each room, not its arbitrary
 * center (which may intentionally hold a sofa, lift, counter or bed).
 * A clear-looking point is insufficient: it must connect to the insertion.
 */
function roomSamples(room:Site['rooms'][number]):Pt[]{
 const first=[[.5,.5],[.27,.27],[.73,.27],[.27,.73],[.73,.73],
  [.5,.27],[.5,.73],[.27,.5],[.73,.5]];
 // A desk/bed can occupy every sparse diagnostic point while a real
 // traversable lane still runs beside it. Inspect the remaining operator-
 // sized room floor on a denser, bounded lattice before declaring failure.
 const fractions=[.14,.26,.38,.5,.62,.74,.86];
 const all=[...first,...fractions.flatMap(y=>fractions.map(x=>[x,y]))];
 return all.map(([x,y])=>({
   x:room.x+room.w*x,y:room.y+room.h*y
 }));
}
export function auditSitePhysicalIntegrity(site:Site):PhysicalIntegrityReport{
 const blocking:PhysicalIntegrityFinding[]=[],warnings:PhysicalIntegrityFinding[]=[];
 const add=(severity:'blocking'|'warning',
  code:PhysicalIntegrityFinding['code'],entity:string,detail:string)=>{
  (severity==='blocking'?blocking:warnings).push({code,entity,detail});
 };
 let checkedRooms=0,checkedPositions=0;
 // All geometry validation is independent of whatever mission was previously
 // active. A corrupt fixture must not crash route finding or be silently ignored.
 for(const [i,w] of site.walls.entries())
  if(!finite(w.a)||!finite(w.b)||length(w.a,w.b)<.01)
   add('blocking','invalid-geometry','wall:'+i,'nonfinite or zero-length wall');
 for(const [i,o] of site.cover.entries())
  if(!Number.isFinite(o.x)||!Number.isFinite(o.y)||
    !Number.isFinite(o.w)||!Number.isFinite(o.h)||o.w<=0||o.h<=0)
   add('blocking','invalid-geometry','cover:'+i,'nonfinite or nonpositive footprint');
 const ids=new Set<string>();
 for(const door of site.doors){
  if(ids.has(door.id))add('blocking','duplicate-door',door.id,'door id repeats');
  ids.add(door.id);
  if(!finite(door.a)||!finite(door.b)||length(door.a,door.b)<.01)
   add('blocking','invalid-geometry',door.id,'invalid door endpoints');
  else if(portalBlocked(door,site.walls))
   add('blocking','blocked-portal',door.id,'a structural wall crosses its opening');
 }
 for(const opening of site.openings??[])
  if(!finite(opening.a)||!finite(opening.b)||length(opening.a,opening.b)<.01)
   add('blocking','invalid-geometry',opening.id,'invalid opening endpoints');
  else if(portalBlocked(opening,site.walls))
   add('blocking','blocked-portal',opening.id,'a wall occupies the open passage');
 for(const win of site.windows??[]){
  const fixture=win.sillHeight===0?'glass-barrier':'window-sill';
  if(!site.cover.some(o=>o.fixture===fixture&&
    length({x:o.x,y:o.y},{x:win.x,y:win.y})<1))
   add('blocking','missing-window-collider',win.id,
     'visible window missing its authoritative '+fixture);
 }
 const mobility=auditTacticalMobility(site,site.doors.length);
 for(const issue of mobility.issues){
  const code=issue.kind;
  add(['pinched-threshold'].includes(code)?'blocking':'warning',
    code,issue.doorId+(issue.side===undefined?'':':'+issue.side),
    'physical door sweep/approach: '+code);
 }
 for(const issue of auditFixtureService(site)){
  const room=site.rooms.find(r=>r.id===issue.roomId);
  const required=(ROOM_CONTRACTS[room?.purpose??'']?.required??[])
   .some(group=>group.includes(issue.fixture));
  if(required)add('warning','blocked-service-face',issue.roomId+':'+issue.index,
    issue.fixture+': '+issue.reason);
 }
 for(const contract of assessRoomContracts(site))
  for(const group of contract.missing)
   add('warning','missing-essential',contract.zoneId,group.join(' or '));
 // Route lookups temporarily activate the site. The scope restores even
 // displaced live cover and previous geometry if a path query throws.
 if(!blocking.some(i=>i.code==='invalid-geometry')){
  withTemporarySiteGeometry(site,()=>{
   const origin=site.spawn[0];
   const reachable=(p:Pt)=>finite(p)&&passable(p)&&
     (origin&&length(origin,p)<.1||!!(origin&&route(origin,p).length));
   const landmarks:[string,Pt][]=[
    ...site.spawn.map((p,i)=>['spawn:'+i,p] as [string,Pt]),
    ...site.enemies.map((p,i)=>['enemy:'+i,p] as [string,Pt]),
    ['objective',site.objective],['extraction',site.extract]
   ];
   for(const [name,p] of landmarks){
    checkedPositions++;
    if(!finite(p)||!passable(p)){
     add('blocking','invalid-position',name,'no operator-sized standing point');
     continue;
    }
    if(name.startsWith('spawn:'))continue;
    if(!origin||!passable(origin)||!reachable(p))
     add('blocking','unreachable-position',name,
       'not connected to first operator insertion');
   }
   for(const room of site.rooms.filter(r=>r.kind==='room')){
    checkedRooms++;
    // Distinguish a missing navigable room from a furnishing issue: every
    // candidate point is checked against real walls and real cover.
    const samples=roomSamples(room);
    const legal=samples.filter(p=>finite(p)&&passable(p));
    if(!legal.some(reachable))
     add('blocking','unreachable-room',room.id,
       'no route from insertion across '+legal.length+
       ' operator-sized clear samples in '+room.w+'x'+room.h+' room');
   }
  });
 }
 return {seed:site.seed,archetype:site.archetype??'untyped',
  checkedRooms,checkedDoors:mobility.checkedDoors,checkedPositions,
  blocking,warnings};
}
