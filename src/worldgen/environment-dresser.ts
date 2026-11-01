/** Deterministic semantic dressing. Decorations never invent collision. */
import {type Site,seeded} from '../breach-site.ts';
import {compatibleDecoration,visibleSurfaceHeight,surfaceOffset,
  type SurfaceDetail} from './decoration-anchors.ts';
export type SiteCondition='occupied'|'busy'|'neglected'|'vacant'|'renovation'|'disturbed';
export type DecorativeDetail={
 id:string;roomId:string;kind:SurfaceDetail|'floor-lamp';
 x:number;y:number;elevation:number;angle:number;
 placement?:'surface'|'floor';supportFixture?:string;
};
const styles:readonly SiteCondition[]=['occupied','busy','neglected','vacant','renovation','disturbed'];
const choices:Record<string,readonly SurfaceDetail[]>={
 living:['books','mug','plant','lamp'],bedroom:['books','lamp','plant'],
 kitchen:['mug','papers'],dining:['mug','plant'],studio:['books','mug'],
 office:['papers','mug','lamp'],reception:['papers','plant'],cubicles:['papers','mug'],
 meeting:['papers','mug'],sales:['packages','papers'],checkout:['papers','mug'],
 storage:['packages','papers'],stockroom:['packages','tools'],
 bay:['tools','papers'],workshop:['tools','mug'],loading:['packages','tools'],
 packing:['packages','papers'],equipment:['tools','papers'],control:['papers','mug'],
 guest:['books','lamp'],waiting:['papers','plant'],
};
export function dressSite(site:Site,seed:number):Site{
 const random=seeded(seed^0x1d7e5a5a);
 const condition=styles[(seed>>>0)%styles.length];
 const density:Record<SiteCondition,number>={
  occupied:.64,busy:.89,neglected:.42,vacant:.15,renovation:.49,disturbed:.70
 };
 const dressing:DecorativeDetail[]=[];
 for(const room of site.rooms){
  if(room.kind==='hall')continue;
  const vocab=choices[room.purpose??'']??['papers'];
  const supports=site.cover.filter(c=>c.fixture&&
   c.x>=room.x&&c.x<=room.x+room.w&&c.y>=room.y&&c.y<=room.y+room.h&&
   c.w>=18&&c.h>=16);
  for(const [i,item] of supports.entries()){
   if(random()>density[condition])continue;
   const compatible=vocab.filter(kind=>compatibleDecoration(kind,item.fixture!));
   if(!compatible.length)continue; // A sofa is not a side table.
   const kind=compatible[Math.floor(random()*compatible.length)];
   const offset=surfaceOffset(item.fixture!,item.w,item.h,random);
   dressing.push({
    id:room.id+':detail:'+i,roomId:room.id,kind,
    x:item.x+offset.x,y:item.y+offset.y,
    elevation:visibleSurfaceHeight(item.fixture!)+.5,
    angle:random()*Math.PI*2,placement:'surface',supportFixture:item.fixture
   });
  }
  // Freestanding floor lamps belong next to, not on, seating.
  if(['living','studio','guest','bedroom'].includes(room.purpose??'')&&
    random()<density[condition]*.8){
   const sofas=supports.filter(c=>c.fixture==='sofa'||c.fixture==='armchair');
   for(const sofa of sofas){
    const sides=random()<.5?[-1,1]:[1,-1];
    let placed=false;
    for(const sign of sides){
     const x=sofa.x+sign*(sofa.w/2+10),y=sofa.y;
     if(x<room.x+10||x>room.x+room.w-10||
       y<room.y+10||y>room.y+room.h-10)continue;
     if(site.cover.some(o=>Math.abs(o.x-x)<o.w/2+7&&
       Math.abs(o.y-y)<o.h/2+7))continue;
     if(site.doors.some(d=>Math.hypot(x-(d.a.x+d.b.x)/2,
       y-(d.a.y+d.b.y)/2)<43))continue;
     dressing.push({id:room.id+':floor-lamp:'+dressing.length,roomId:room.id,
       kind:'floor-lamp',x,y,elevation:0,angle:0,placement:'floor'});
     placed=true;break;
    }
    if(placed)break;
   }
  }
 }
 return {...site,condition,dressing};
}
