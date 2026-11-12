/** A local fixture can justify quiet visual inspection, not a fictional
 * seated/tool-handling animation. Use the actor's own room and real objects.
 * Called at initialization or on arrival, never every render frame. */
import type {Pt} from './breach-core.ts';
type Fixture={x:number;y:number;fixture?:string};
type RoomBounds={x:number;y:number;w:number;h:number};
const inspectable=new Set(['shelf','rack','gondola-shelf',
 'bookcase','filing-cabinet','storage-shelf','display-rack',
 'control-panel','workbench','packing-station','tool-chest']);
export function localFixtureObservation(from:Pt,
 fixtures:readonly Fixture[],rooms:readonly RoomBounds[]):Pt|null{
 const room=rooms.find(r=>from.x>=r.x&&from.x<=r.x+r.w&&
   from.y>=r.y&&from.y<=r.y+r.h);
 if(!room)return null;
 let best:Fixture|null=null,bestDist=105;
 for(const f of fixtures){
  if(!inspectable.has(f.fixture??'')||
     f.x<room.x||f.y<room.y||f.x>room.x+room.w||f.y>room.y+room.h)continue;
  const range=Math.hypot(f.x-from.x,f.y-from.y);
  if(range<18||range>=bestDist)continue;
  best=f;bestDist=range;
 }
 return best?{x:best.x,y:best.y}:null;
}
