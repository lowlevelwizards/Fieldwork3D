/** Front doors lead to a public function, not patient exam rooms or
 * stockrooms. Preserve the room program's multiset: swap roles rather than
 * inventing/removing departments. Interior circulation remains authoritative.
 */
import type {BuildingArchetype,Site} from '../breach-site.ts';
import {entryInteriorPoint} from './site-orientation.ts';
const allowed:Record<BuildingArchetype,readonly string[]>={
 clinic:['waiting','reception','vestibule'],motel:['reception'],retail:['sales','checkout','vestibule'],
 office:['reception','lobby','vestibule'],restaurant:['dining','vestibule'],
 house:['living','studio','foyer'],townhouse:['living','studio','foyer'],
 apartment:['lobby','living','studio'],garage:['waiting','bay'],
 warehouse:['loading','aisle'],utility:['control','service']
};
export function entrancePurpose(site:Site,assigned:Map<string,string>):string{
 const door=site.doors.find(d=>d.id==='FRONT');
 if(!door)return 'unknown';
 const p=entryInteriorPoint(site);if(!p)return 'unknown';
 const room=site.rooms.find(r=>p.x>r.x&&p.x<r.x+r.w&&
   p.y>r.y&&p.y<r.y+r.h);
 return room?.kind==='hall'?'hallway':assigned.get(room?.id??'')??'unknown';
}
export function correctPublicEntrance(site:Site,kind:BuildingArchetype,
  assignments:Map<string,string>):Map<string,string>{
 const door=site.doors.find(d=>d.id==='FRONT');
 if(!door)return assignments;
 const p=entryInteriorPoint(site);if(!p)return assignments;
 const room=site.rooms.find(r=>r.kind==='room'&&p.x>r.x&&p.x<r.x+r.w&&
   p.y>r.y&&p.y<r.y+r.h);
 if(!room)return assignments;
 const existing=assignments.get(room.id);
 if(!existing||allowed[kind].includes(existing))return assignments;
 const candidate=site.rooms.filter(r=>r.kind==='room'&&r.id!==room.id)
  .filter(r=>allowed[kind].includes(assignments.get(r.id)??''))
  .sort((a,b)=>allowed[kind].indexOf(assignments.get(a.id)??'')-
    allowed[kind].indexOf(assignments.get(b.id)??'')||
    Math.hypot(a.x-room.x,a.y-room.y)-Math.hypot(b.x-room.x,b.y-room.y))[0];
 if(!candidate)return assignments;
 const result=new Map(assignments);
 result.set(room.id,assignments.get(candidate.id)!);
 result.set(candidate.id,existing);
 return result;
}
