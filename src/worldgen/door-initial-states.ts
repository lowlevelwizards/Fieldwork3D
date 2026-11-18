/** D3.29H — deterministic initial door poses, not an inferred actor history.
 * Each door uses a separate seed+stable-ID hash. Sampling cannot move an
 * enemy spawn, consume worldgen RNG, or manufacture an OPEN event.
 * Live collision safety is enforced later by initDoor's actual hinge sweep.
 */
import type {Door,Pt} from '../breach-core.ts';
import type {Site,Room} from '../breach-site.ts';

const privateRooms=new Set(['bathroom','restroom','bedroom','guest',
 'exam','treatment','staff','supply']);
const activeRooms=new Set(['hallway','lobby','reception','waiting',
 'living','dining','sales','aisle','service','loading','workshop']);
const center=(d:Door):Pt=>({x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2});
function neighboring(site:Site,door:Door):[Room|undefined,Room|undefined]{
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const n=Math.hypot(dx,dy)||1,m=center(door),nx=-dy/n,ny=dx/n;
 const roomAt=(sign:number)=>site.rooms.find(r=>{
  const p={x:m.x+nx*sign*14,y:m.y+ny*sign*14};
  return p.x>r.x+1&&p.x<r.x+r.w-1&&
   p.y>r.y+1&&p.y<r.y+r.h-1;
 });
 return [roomAt(1),roomAt(-1)];
}
function sample(seed:number,id:string,salt:number):number{
 let hash=(seed^salt^0x811c9dc5)>>>0;
 for(let i=0;i<id.length;i++){
  hash=Math.imul(hash^id.charCodeAt(i),0x01000193)>>>0;
 }
 hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d)>>>0;
 hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b)>>>0;
 return ((hash^(hash>>>16))>>>0)/4294967296;
}
export function seededInitialDoorPose(site:Site,door:Door):Door{
 // Keep authored OPEN states and any deliberately posed leaves untouched.
 // Locks, physical holds, and wedges are always initially closed.
 if(door.locked||door.wedged||door.heldBy||door.open||
    door.openFraction!==undefined)return door;
 const [a,b]=neighboring(site,door);
 const exterior=!a||!b,roles=[a?.purpose??'',b?.purpose??''];
 let probability=exterior?.08:
   roles.some(x=>privateRooms.has(x))?.11:
   roles.some(x=>activeRooms.has(x))?.38:.29;
 if(site.condition==='vacant')probability*=.58;
 if(site.condition==='busy')probability*=1.18;
 if(site.scenarioStyle==='disrupted')probability*=1.10;
 if(door.kind==='shutter')probability=Math.min(probability,.06);
 if(door.style==='reinforced')probability*=.35;
 if(sample(site.seed,door.id,0x4d3b2a10)>=probability)return door;
 const angle=sample(site.seed,door.id,0x7b5a129f);
 // Wide, mid and ajar states each have stable physical angles.
 const fraction=angle<.24?1:angle<.55?
   .52+angle*.32:.18+angle*.33;
 return {...door,open:true,openFraction:fraction};
}
export function applySeededDoorStarts(site:Site,doors:readonly Door[]):Door[]{
 return doors.map(d=>seededInitialDoorPose(site,d));
}
