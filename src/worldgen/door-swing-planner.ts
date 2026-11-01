/** Door swing selection from actual room purposes and final geometry.
 * Uses the existing authoritative hinge/swing mechanics; avoids choosing
 * visually plausible but physically obstructed arcs. Never converts sliding
 * doors or shutters into hinged leaves.
 *
 * Preferences are architectural heuristics, not full building-code approval:
 * occupant load, fire ratings, panic hardware and local rules vary.
 */
import type {Site,Room} from '../breach-site.ts';
import {doorLeafSegment,type Door,type Pt,type Obstacle,type Segment} from '../breach-core.ts';
const center=(d:Door):Pt=>({x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2});
const inside=(r:Room,p:Pt)=>p.x>r.x+1&&p.y>r.y+1&&
 p.x<r.x+r.w-1&&p.y<r.y+r.h-1;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function adjoining(site:Site,door:Door):[Room|undefined,Room|undefined]{
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const size=Math.hypot(dx,dy)||1,normal={x:-dy/size,y:dx/size},p=center(door);
 const at=(sign:number)=>site.rooms.find(r=>
  inside(r,{x:p.x+normal.x*sign*17,y:p.y+normal.y*sign*17}));
 return [at(1),at(-1)];
}
function sideFor(room:Room,door:Door):1|-1{
 const m=center(door),dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const toward={x:room.x+room.w/2-m.x,y:room.y+room.h/2-m.y};
 return dx*toward.y-dy*toward.x>=0?1:-1;
}
const privateUses=new Set(['bedroom','guest','exam','treatment','bathroom',
 'restroom','study','supply','laundry','pantry','storage','staff','utility']);
const circulationUses=new Set(['hallway','aisle','foyer','vestibule','lobby',
 'waiting','reception','sales','dining','checkout']);
const publicFacility=new Set(['retail','restaurant','office','clinic',
 'warehouse','garage','motel','utility']);
function preferredSwingSide(site:Site,door:Door):1|-1{
 const [left,right]=adjoining(site,door),only=left??right;
 if(!left||!right){
  if(!only)return -1;
  const insideSide=sideFor(only,door);
  // High-traffic commercial exits generally open along evacuation travel.
  // Ordinary small dwelling entrances generally swing into the home.
  if(door.id==='FRONT')return publicFacility.has(site.archetype??'house')?
    (insideSide===1?-1:1):insideSide;
  if(door.id==='SERVICE'&&publicFacility.has(site.archetype??'house'))
   return insideSide===1?-1:1;
  return insideSide;
 }
 const choose=(r:Room)=>sideFor(r,door);
 const sensitive=[left,right].find(r=>privateUses.has(r.purpose??''));
 const corridor=[left,right].find(r=>circulationUses.has(r.purpose??''));
 // Swing into the private room instead of leaving an open leaf across a hall.
 if(sensitive&&corridor)return choose(sensitive);
 const service=[left,right].find(r=>['service','kitchen','workshop','parts',
  'stockroom','loading','maintenance'].includes(r.purpose??''));
 const publicSide=[left,right].find(r=>['dining','sales','lobby','waiting',
  'reception'].includes(r.purpose??''));
 if(service&&publicSide)return choose(service);
 // Prefer the less cramped side if no specific door-use rule applies.
 return choose(left.w*left.h>=right.w*right.h?left:right);
}
function pointSegmentDistance(p:Pt,s:Segment):number{
 const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y;
 const t=Math.max(0,Math.min(1,((p.x-s.a.x)*dx+(p.y-s.a.y)*dy)/
   (dx*dx+dy*dy||1)));
 return distance(p,{x:s.a.x+dx*t,y:s.a.y+dy*t});
}
function overlapsFixture(p:Pt,o:Obstacle):boolean{
 const x=Math.max(o.x-o.w/2,Math.min(o.x+o.w/2,p.x));
 const y=Math.max(o.y-o.h/2,Math.min(o.y+o.h/2,p.y));
 return distance(p,{x,y})<3.5;
}
function arcPenalty(site:Site,door:Door):number{
 let penalty=0;
 // Sample physical travel of the complete leaf, not only its open endpoint.
 // Ignore 15% nearest the hinge because its own frame naturally touches it.
 for(const fraction of [.25,.5,.75,1]){
  const segment=doorLeafSegment({...door,open:true,openFraction:fraction});
  const dx=segment.b.x-segment.a.x,dy=segment.b.y-segment.a.y;
  for(const t of [.3,.5,.75,1]){
   const p={x:segment.a.x+dx*t,y:segment.a.y+dy*t};
   if(site.cover.some(o=>overlapsFixture(p,o)))penalty+=18;
   if(site.walls.some(w=>pointSegmentDistance(p,w)<3.5))penalty+=24;
   // Door leaves are not supposed to sweep across operator-critical points.
   if([...site.spawn,...site.enemies,site.objective].some(q=>distance(q,p)<10))
     penalty+=12;
  }
 }
 return penalty;
}
function openedSide(door:Door):1|-1{
 const leaf=doorLeafSegment({...door,open:true,openFraction:1});
 const m=center(door),p={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 return dx*(p.y-m.y)-dy*(p.x-m.x)>=0?1:-1;
}
function choiceScore(site:Site,door:Door,preferred:1|-1):number{
 return arcPenalty(site,door)+(openedSide(door)===preferred?0:60);
}
export function planDoorSwings(site:Site):Site{
 const proposed=site.doors.map(d=>({...d}));
 const used=new Set<string>();
 for(let i=0;i<proposed.length;i++){
  const current=proposed[i];
  if(used.has(current.id)||current.kind==='sliding'||current.kind==='shutter')continue;
  const preferred=preferredSwingSide(site,current);
  if(current.pairedWith){
   const j=proposed.findIndex(d=>d.id===current.pairedWith);
   if(j>=0&&!used.has(proposed[j].id)&&proposed[j].kind!=='sliding'){
    const other=proposed[j],flipped=[false,true].map(flip=>{
     const a={...current,hinge:current.hinge??'a',
      swing:(flip?-(current.swing??-1):(current.swing??-1)) as -1|1};
     const b={...other,hinge:other.hinge??'b',
      swing:(flip?-(other.swing??1):(other.swing??1)) as -1|1};
     return {a,b,score:choiceScore(site,a,preferred)+
       choiceScore(site,b,preferred)};
    }).sort((a,b)=>a.score-b.score)[0];
    proposed[i]=flipped.a;proposed[j]=flipped.b;
    used.add(current.id);used.add(other.id);continue;
   }
  }
  const options:(Door&{hinge:'a'|'b';swing:-1|1})[]=[];
  for(const hinge of ['a','b'] as const)
   for(const swing of [-1,1] as const)
    options.push({...current,hinge,swing});
  const ranked=options.sort((a,b)=>
   choiceScore(site,a,preferred)-choiceScore(site,b,preferred)||
   // Stable hinge preference, no random swing changes between regenerations.
   (a.hinge==='a'?0:1)-(b.hinge==='a'?0:1));
  proposed[i]=ranked[0];used.add(current.id);
 }
 return {...site,doors:proposed};
}
