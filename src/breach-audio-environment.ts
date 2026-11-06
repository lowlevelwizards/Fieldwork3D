/** Presentation-only, position-aware environmental acoustics for Fieldwork.
 * Uses the SAME authored map geometry already used for tactical movement.
 * Never writes to AI hearing, fog, mission events, or replay evidence.
 */
import {segmentsCross,type Pt,type Door,type Segment} from './breach-core.ts';
import type {Site,Room} from './breach-site.ts';
import type {AcousticResponse} from './sound-room-filter.ts';

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
function containingRoom(site:Site,p:Pt):Room|null{
 let best:Room|null=null,area=Infinity;
 for(const room of site.rooms){
  if(p.x<room.x-3||p.x>room.x+room.w+3||
     p.y<room.y-3||p.y>room.y+room.h+3)continue;
  const size=room.w*room.h;
  if(size<area){best=room;area=size;}
 }
 return best;
}
function hardness(room:Room,site:Site):number{
 const purpose=(room.purpose??'').toLowerCase();
 if(/bath|toilet|wash|shower|tile|utility|mechanical/.test(purpose))return .87;
 if(/garage|storage|warehouse|workshop|service|stair/.test(purpose))return .79;
 if(/bed|lounge|living|motel|office|closet|carpet/.test(purpose))return .42;
 if(/kitchen|lobby|hall|corridor|retail|dining/.test(purpose))return .67;
 if(site.archetype==='warehouse'||site.archetype==='garage')return .78;
 return room.kind==='hall'?.67:.58;
}
/** Sound identities share a source but respond differently to physical space. */
export function acousticResponseForCue(site:Site|undefined,source:Pt,
 id:string,listener?:Pt,doors:readonly Door[]=site?.doors??[],
 walls:readonly Segment[]=site?.walls??[]):AcousticResponse|null{
 // No synthetic tails on frequent UI and planning signals.
 if(id.startsWith('ui.')||id.startsWith('orders.')||
    id.startsWith('mission.')||id.startsWith('replay.'))return null;
 // Gunshots and blasts reveal acoustics most; human handling less.
 const shot=id.startsWith('weapons.');
 const flash=id==='combat.flash';
 const door=id.startsWith('doors.');
 const foot=id.startsWith('movement.');
 const impact=id.startsWith('impacts.');
 const handling=id.startsWith('equipment.');
 const amount=flash?1.08:shot?1:door ? .59 :impact ? .39 :handling ? .32 :foot ? .16 : .28;
 if(!site||!site.rooms.length)return null;
 const room=containingRoom(site,source);
 const isExterior=!room;
 // Outside is not one acoustic preset: an enclosed courtyard has more
 // nearby surfaces than an open yard. Cheap point-to-segment distances are
 // evaluated only for real sound events, never during simulation updates.
 const nearbyWalls=isExterior?walls.reduce((count,w)=>{
  const dx=w.b.x-w.a.x,dy=w.b.y-w.a.y;
  const t=clamp(((source.x-w.a.x)*dx+(source.y-w.a.y)*dy)/
   Math.max(1,dx*dx+dy*dy),0,1);
  const distance=Math.hypot(source.x-(w.a.x+t*dx),source.y-(w.a.y+t*dy));
  return count+(distance<150?1:0);
 },0):0;
 const exteriorEnclosure=clamp(nearbyWalls/4,0,1);
 const area=room?Math.max(1,room.w*room.h):0;
 const dimension=Math.sqrt(area);
 const size=isExterior?'exterior':
  dimension<115?'small':dimension<220?'medium':'large';
 const hardnessValue=room?hardness(room,site):.2;
 const openNear=doors.some(d=>d.open&&(d.openFraction??1)>.5&&
   Math.hypot((d.a.x+d.b.x)*.5-source.x,(d.a.y+d.b.y)*.5-source.y)<95);
 const openness=isExterior?1:(openNear ? .19 : 0);
 // Early wall returns are rapid in small, hard rooms; warehouse interiors
 // produce longer/looser tails. Outdoors are mostly direct sound.
 const sizeIndex=size==='small'?0:size==='medium'?1:size==='large'?2:3;
 const early=isExterior ? .024+exteriorEnclosure*.035 :clamp(.019+dimension*.00011,.018,.082);
 const wet=(isExterior ? .024+exteriorEnclosure*.155 :(.12+sizeIndex*.055)*hardnessValue*
   (1-openness*.45))*amount;
 const tail=isExterior ? .055+exteriorEnclosure*.18 :(.075+.00185*dimension)*
   (.61+hardnessValue*.67)*(1-openness*.4);
 const bass=isExterior ? .014+exteriorEnclosure*.025 :clamp((.045+sizeIndex*.038)*
   (.55+hardnessValue*.7)*amount,0,.22);
 let obstruction=0;
 if(listener&&walls.length){
  const ray={a:source,b:listener};
  const wallHits=walls.reduce((n,w)=>n+(segmentsCross(ray,w)?1:0),0);
  const doorHits=doors.reduce((n,d)=>n+
   (segmentsCross(ray,d)&&!(d.open&&(d.openFraction??1)>.5)?1:0),0);
  obstruction=clamp(wallHits*.22+doorHits*.17,0,.7);
  // Same room = not acoustically separated by any opaque partition.
  if(room&&containingRoom(site,listener)?.id===room.id)obstruction=0;
 }
 const damp=isExterior ? .7 :clamp(1-hardnessValue+.16,0,.9);
 // Cache quantized acoustic profiles rather than every tiny position move.
 const q=(x:number,step:number)=>Math.round(x/step)*step;
 const response={
  space:size,early:q(early,.007),wet:q(wet,.027),
  tail:q(tail,.07),bass:q(bass,.025),
  damping:q(damp,.16),occlusion:q(obstruction,.15)
 } as const;
 const key=[id.startsWith('weapons.')?'w':flash?'b':door?'d':foot?'f':'o',
  response.space,...[response.early,response.wet,response.tail,
   response.bass,response.damping,response.occlusion].map(x=>x.toFixed(3))].join(':');
 return {...response,key};
}
