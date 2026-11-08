/** Loading/service facade accessories must be tied to an EXISTING
 * exterior door. Never invent a truck dock or falsely imply access through
 * a blank building wall. Presentation only: real door and actor clearance
 * remain authoritative.
 */
import type {Site} from '../breach-site.ts';

type ServiceSite=Pick<Site,'archetype'|'doors'|'exteriorZones'>;
export type DockBumper={x:number;y:number;span:number;
 axis:'x'|'y';outward:1|-1};
export function planServiceDockBumpers(site:ServiceSite):DockBumper[]{
 if(!['garage','warehouse','utility'].includes(site.archetype??''))return [];
 const marks:DockBumper[]=[];
 for(const zone of site.exteriorZones??[]){
   if(zone.kind!=='service')continue;
   const broad=zone.w>=zone.h;
   for(const door of site.doors){
     if(door.id==='FRONT')continue;
     const x=(door.a.x+door.b.x)/2,y=(door.a.y+door.b.y)/2;
     const width=Math.hypot(door.b.x-door.a.x,door.b.y-door.a.y);
     // Too small for a meaningful industrial loading/service guard.
     if(width<24||width>115)continue;
     const aligned=broad?
       Math.abs(door.b.y-door.a.y)<2:
       Math.abs(door.b.x-door.a.x)<2;
     if(!aligned)continue;
     const along=broad?x:y;
     const center=broad?zone.x:zone.y;
     const length=broad?zone.w:zone.h;
     if(Math.abs(along-center)>length/2-14)continue;
     const axis=broad?'x':'y';
     const perpendicular=broad?y:x;
     const norm=broad?zone.y:zone.x;
     const depth=broad?zone.h:zone.w;
     // The door faces the strip from the edge of the building, and is
     // within 20 units of that strip. Ignore unrelated interior doors.
     const nearestEdge=depth/2-Math.abs(perpendicular-norm);
     if(nearestEdge< -20||nearestEdge>22)continue;
     const outward:1|-1=norm>=perpendicular?1:-1;
     marks.push({x,y,span:width,axis,outward});
   }
 }
 return marks;
}
