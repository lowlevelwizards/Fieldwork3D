/** One coherent geometry-only audit of entrances, room engagement spaces
 * and objective/first-contact pacing. This is Map Lab/offline diagnostics,
 * NOT player live intel, and never alters/opens physical architecture.
 */
import type {Site,Room,WindowOpening} from '../breach-site.ts';
import type {Door,Pt} from '../breach-core.ts';
import {accessibleExteriorWall} from '../breach-site-footprint.ts';
import {initializeWindows} from '../breach-windows.ts';
import {windowClimbAvailability} from '../breach-mantle.ts';
import type {DeploymentChoice} from '../breach-deployment.ts';

const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const middle=(d:{a:Pt;b:Pt}):Pt=>({x:(d.a.x+d.b.x)/2,
 y:(d.a.y+d.b.y)/2});
const inRoom=(r:Room,p:Pt)=>p.x>=r.x&&p.x<=r.x+r.w&&
 p.y>=r.y&&p.y<=r.y+r.h;
const roomAt=(s:Site,p:Pt)=>s.rooms.find(r=>r.kind==='room'&&inRoom(r,p));
const nearBoundary=(r:Room,p:Pt,margin=8)=>
 p.x>=r.x-margin&&p.y>=r.y-margin&&
 p.x<=r.x+r.w+margin&&p.y<=r.y+r.h+margin&&
 (Math.min(Math.abs(p.x-r.x),Math.abs(p.x-r.x-r.w),
   Math.abs(p.y-r.y),Math.abs(p.y-r.y-r.h))<margin);
const windowSegment=(w:WindowOpening)=>{
 const h=w.width/2;
 return w.vertical?{a:{x:w.x,y:w.y-h},b:{x:w.x,y:w.y+h}}:
  {a:{x:w.x-h,y:w.y},b:{x:w.x+h,y:w.y}};
};
export type EntryOpportunity={id:string;kind:'primary'|'secondary'|'shutter'|'window';
 at:Pt;distanceFromFront:number;status:'door'|'open-first'|'break-first';
 verified:boolean};
export type TacticalRoomOpportunity={
 roomId:string;purpose:string;doorways:number;windows:number;
 coverPieces:number;solidFraction:number;entryPressure:number;
};
export type TacticalOpportunityAudit={
 entryOptions:EntryOpportunity[];exteriorDoors:number;alternativeDoors:number;
 potentialWindowEntries:number;distinctApproachSides:number;
 verifiedApproaches:number;verifiedAlternateDoors:number;verifiedWindows:number;
 objectiveRoom:string;objectivePurpose:string;objectiveEntryDistance:number;
 closestHostileToEntry:number;hostilesNearObjective:number;
 roomOpportunities:TacticalRoomOpportunity[];
 roomsWithCoverAndDoor:number;emptyEngagementRooms:number;
 warnings:string[];
};
const uniqueDoor=(a:Door,b:Door)=>a.pairedWith===b.id&&
 b.pairedWith===a.id;
export function auditTacticalOpportunities(site:Site,
 verified:readonly DeploymentChoice[]=[]):TacticalOpportunityAudit{
 const verifiedIds=new Set(verified.map(c=>c.id));
 const front=site.doors.find(d=>d.id==='FRONT');
 const frontP=front?middle(front):site.entrance;
 const entries:EntryOpportunity[]=[];
 const consumed=new Set<string>();
 for(const door of site.doors){
  if(consumed.has(door.id))continue;
  if(!accessibleExteriorWall(site,door))continue;
  if(door.pairedWith){
   const twin=site.doors.find(d=>uniqueDoor(door,d));
   if(twin)consumed.add(twin.id);
  }
  consumed.add(door.id);
  const at=middle(door);
  entries.push({id:door.id,kind:door.id==='FRONT'?'primary':
    door.kind==='shutter'?'shutter':'secondary',
    at,distanceFromFront:Math.round(dist(at,frontP)),status:'door',
    verified:verifiedIds.has(door.id)});
 }
 for(const window of initializeWindows(site.windows??[])){
  const segment=windowSegment(window);
  if(!accessibleExteriorWall(site,segment))continue;
  const status=windowClimbAvailability(window);
  if(status!=='open-first'&&status!=='break-first')continue;
  const at={x:window.x,y:window.y};
  entries.push({id:window.id,kind:'window',at,
    distanceFromFront:Math.round(dist(at,frontP)),status,
    verified:verifiedIds.has(window.id)});
 }
 const sides=new Set<string>();
 const bounds=site.rooms.length?{
  minX:Math.min(...site.rooms.map(r=>r.x)),
  maxX:Math.max(...site.rooms.map(r=>r.x+r.w)),
  minY:Math.min(...site.rooms.map(r=>r.y)),
  maxY:Math.max(...site.rooms.map(r=>r.y+r.h))}:null;
 if(bounds)for(const option of entries){
  const x=(option.at.x-bounds.minX)/Math.max(1,bounds.maxX-bounds.minX);
  const y=(option.at.y-bounds.minY)/Math.max(1,bounds.maxY-bounds.minY);
  const edge=Math.min(x,1-x,y,1-y);
  if(edge===x)sides.add('west');
  else if(edge===1-x)sides.add('east');
  else if(edge===y)sides.add('north');
  else sides.add('south');
 }
 const roomOpportunities=site.rooms.filter(r=>r.kind==='room').map(r=>{
  const furnishings=site.cover.filter(o=>
   o.fixture!=='window-sill'&&o.fixture!=='glass-barrier'&&
   inRoom(r,{x:o.x,y:o.y}));
  const area=Math.max(1,r.w*r.h);
  const fill=Math.min(1,furnishings.reduce((n,o)=>n+
   Math.max(0,Math.min(r.x+r.w,o.x+o.w/2)-Math.max(r.x,o.x-o.w/2))*
   Math.max(0,Math.min(r.y+r.h,o.y+o.h/2)-Math.max(r.y,o.y-o.h/2)),0)/area);
  const doorways=site.doors.filter(d=>nearBoundary(r,middle(d))).length+
    (site.openings??[]).filter(o=>nearBoundary(r,middle(o))).length;
  const windows=(site.windows??[]).filter(w=>nearBoundary(r,{
    x:w.x,y:w.y})).length;
  const coverPieces=furnishings.filter(o=>o.low||o.h>=12).length;
  return {roomId:r.id,purpose:r.purpose??'untyped',doorways,windows,
    coverPieces,solidFraction:Math.round(fill*100)/100,
    entryPressure:doorways+(windows>0?1:0)};
 });
 const objective=roomAt(site,site.objective);
 const firstEnemy=Math.min(Infinity,...site.enemies.map(p=>dist(site.entrance,p)));
 const objectiveDistance=dist(site.entrance,site.objective);
 const alternativeDoors=entries.filter(e=>
   e.kind==='secondary'||e.kind==='shutter').length;
 const windowEntries=entries.filter(e=>e.kind==='window').length;
 const warnings:string[]=[];
 if(!entries.some(e=>e.kind==='primary'))warnings.push('no observable primary exterior entrance');
 if(entries.length===1)warnings.push('single observed entry approach');
 if(objectiveDistance<120)warnings.push('objective too close to entry');
 if(firstEnemy<125)warnings.push('early hostile too near insertion');
 if(!roomOpportunities.some(r=>r.coverPieces&&r.doorways>0))
  warnings.push('no furnished room with a tactical threshold');
 return {entryOptions:entries,exteriorDoors:entries.filter(e=>e.kind!=='window').length,
  alternativeDoors,potentialWindowEntries:windowEntries,
  verifiedApproaches:verified.length,
  verifiedAlternateDoors:verified.filter(e=>e.kind==='secondary'||e.kind==='shutter').length,
  verifiedWindows:verified.filter(e=>e.kind==='window').length,
  distinctApproachSides:sides.size,
  objectiveRoom:objective?.id??'outside',
  objectivePurpose:objective?.purpose??'unknown',
  objectiveEntryDistance:Math.round(objectiveDistance),
  closestHostileToEntry:Number.isFinite(firstEnemy)?Math.round(firstEnemy):0,
  hostilesNearObjective:site.enemies.filter(p=>dist(p,site.objective)<95).length,
  roomOpportunities,roomsWithCoverAndDoor:roomOpportunities.filter(r=>
    r.coverPieces>0&&r.doorways>0).length,
  emptyEngagementRooms:roomOpportunities.filter(r=>
    r.doorways>0&&r.coverPieces===0).length,
  warnings};
}
