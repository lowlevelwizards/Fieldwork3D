/** Deterministic semantic dressing. Decorations never invent collision. */
import {type Site,seeded} from '../breach-site.ts';
import {surfaceDetailBudget} from './environment-composition.ts';
import {compatibleDecoration,visibleSurfaceHeight,surfaceOffset,
  type SurfaceDetail} from './decoration-anchors.ts';
export type SiteCondition='occupied'|'busy'|'neglected'|'vacant'|'renovation'|'disturbed';
export type DecorativeDetail={
 id:string;roomId:string;kind:SurfaceDetail|'floor-lamp'|'rug'|'bedside-rug'|'bath-mat'|'welcome-mat'|'runner';
 x:number;y:number;elevation:number;angle:number;
 placement?:'surface'|'floor';supportFixture?:string;
 width?:number;depth?:number;
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
 const condition=site.identity?.condition??styles[(seed>>>0)%styles.length];
 const density:Record<SiteCondition,number>={
  occupied:.64,busy:.89,neglected:.42,vacant:.15,renovation:.49,disturbed:.70
 };
 const dressing:DecorativeDetail[]=[];
 for(const room of site.rooms){
  // Floor textiles are independent of cover and decoration sockets.
  // They can sit beneath furniture without adding collision.
  const addTextile=(kind:DecorativeDetail['kind'],x:number,y:number,
    width:number,depth:number)=>{
   dressing.push({id:room.id+':textile:'+dressing.length,roomId:room.id,
     kind,x,y,elevation:0,angle:0,placement:'floor',width,depth});
  };
  if(room.kind==='hall'){
   const w=Math.min(19,room.w-16),h=Math.min(78,room.h-16);
   if(w>10&&h>20&&random()<.55)addTextile('runner',
     room.x+room.w/2,room.y+room.h/2,w,h);
   continue;
  }
  const inRoom=site.cover.filter(c=>c.fixture&&
   c.x>=room.x&&c.x<=room.x+room.w&&c.y>=room.y&&c.y<=room.y+room.h);
  if(room.purpose==='living'||room.purpose==='studio'){
   const anchor=inRoom.find(c=>c.fixture==='coffee-table')??
     inRoom.find(c=>c.fixture==='sofa');
   if(anchor&&room.w>95&&room.h>90&&random()<.87)
     addTextile('rug',anchor.x,anchor.y,
       Math.min(room.w-18,Math.max(anchor.w+12,65)),
       Math.min(room.h-18,Math.max(anchor.h+20,43)));
  }
  if(['bedroom','guest'].includes(room.purpose??'')){
   const bed=inRoom.find(c=>c.fixture==='bed');
   if(bed&&room.w>83&&room.h>85&&random()<.74){
     const y=bed.y+bed.h/2+8;
     if(y+8<room.y+room.h)
       addTextile('bedside-rug',bed.x,y,Math.min(46,bed.w),13);
   }
  }
  if(['bathroom','restroom'].includes(room.purpose??'')){
   const sink=inRoom.find(c=>c.fixture==='sink');
   const target=sink??inRoom.find(c=>c.fixture==='bathtub');
   if(target){
     const y=target.y+target.h/2+9;
     if(y+6<room.y+room.h)
       addTextile('bath-mat',target.x,y,Math.min(30,target.w),13);
   }
  }

  const vocab=choices[room.purpose??'']??['papers'];
  const detailBudget=surfaceDetailBudget(room,condition);
  let detailsAdded=0;
  const usedKinds=new Set<SurfaceDetail>();
  const supports=site.cover.filter(c=>c.fixture&&
   c.x>=room.x&&c.x<=room.x+room.w&&c.y>=room.y&&c.y<=room.y+room.h&&
   c.w>=18&&c.h>=16);
  for(const [i,item] of supports.entries()){
   if(detailsAdded>=detailBudget)break;
   if(random()>density[condition])continue;
   const compatible=vocab.filter(kind=>compatibleDecoration(kind,item.fixture!));
   if(!compatible.length)continue; // A sofa is not a side table.
   const novel=compatible.filter(kind=>!usedKinds.has(kind));
   const pool=novel.length?novel:compatible;
   const kind=pool[Math.floor(random()*pool.length)];
   usedKinds.add(kind);detailsAdded++;
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
 // The public entrance gets an actual mat, not a decoration on a door leaf.
 const front=site.doors.find(door=>door.id==='FRONT');
 if(front){
  const mx=(front.a.x+front.b.x)/2,my=(front.a.y+front.b.y)/2;
  const closest=site.rooms.slice().sort((a,b)=>{
   const da=Math.hypot(a.x+a.w/2-mx,a.y+a.h/2-my);
   const db=Math.hypot(b.x+b.w/2-mx,b.y+b.h/2-my);
   return da-db;
  })[0];
  if(closest){
   const cx=closest.x+closest.w/2,cy=closest.y+closest.h/2;
   const dx=cx-mx,dy=cy-my,len=Math.hypot(dx,dy)||1;
   const x=mx+dx/len*18,y=my+dy/len*18;
   if(x>closest.x+10&&x<closest.x+closest.w-10&&
      y>closest.y+10&&y<closest.y+closest.h-10)
    dressing.push({id:'entry:welcome-mat',roomId:closest.id,
      kind:'welcome-mat',x,y,elevation:0,angle:0,placement:'floor',
      width:Math.min(35,Math.hypot(front.a.x-front.b.x,
        front.a.y-front.b.y)-6),depth:12});
  }
 }
 return {...site,condition,dressing};
}
