/** V19.2: shared knowledge and stable physical owner eligibility.
 * Camera cutaway, depth, actual local pose, and optical point sight remain
 * separate presentation gates. A known owner is NOT proof of a known hit. */
import type {Session} from '../breach-game.ts';
import type {SurfaceAttachment} from '../breach-impact-surface.ts';
import {spatialSurfaceKnown} from '../breach-presentation.ts';
import {sessionWorldGeometry} from '../breach-world-context.ts';
export function markDoorOwner(s:Session,ref:SurfaceAttachment){
 if(ref.kind!=='door'||!ref.ownerId)return undefined;
 const indexed=s.doors[ref.index];
 return indexed?.id===ref.ownerId?indexed:s.doors.find(d=>d.id===ref.ownerId);
}
export function markWindowOwner(s:Session,ref:SurfaceAttachment){
 if(ref.kind!=='window'||!ref.ownerId)return undefined;
 const indexed=s.windows[ref.index];
 return indexed?.id===ref.ownerId?indexed:s.windows.find(w=>w.id===ref.ownerId);
}
export function markCoverOwnerKnown(s:Session,ref:SurfaceAttachment,omniscient:boolean):boolean{
 const authored=s.site?.cover[ref.index],current=s.coverState[ref.index];
 return ref.kind==='cover'&&!!ref.ownerId&&!!authored&&!!current&&
   authored.id===ref.ownerId&&current.id===ref.ownerId&&!current.destroyed&&
   spatialSurfaceKnown(s,'cover',ref.index,omniscient);
}
export function markWallOwnerKnown(s:Session,ref:SurfaceAttachment,omniscient:boolean):boolean{
 return ref.kind==='wall'&&!!sessionWorldGeometry(s).walls[ref.index]&&
   spatialSurfaceKnown(s,'wall',ref.index,omniscient);
}
