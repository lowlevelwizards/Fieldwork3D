/** Deterministic room composition placement.
 * Keeps door swings, enemy/objective positions and circulation clear.
 * Room-centric layout replaces arbitrary scattered cover boxes. */
import {type Site,type Room,seeded} from '../breach-site.ts';
import {type Obstacle,type Pt} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
type Anchor='nw'|'ne'|'sw'|'se'|'west'|'east';
type Item={id:string;anchor:Anchor};
const compositions:Record<string,readonly Item[]>={
 studio:[{id:'bed',anchor:'nw'},{id:'sofa',anchor:'se'}],
 dining:[{id:'dining-table',anchor:'west'},{id:'chair',anchor:'se'}],
 study:[{id:'desk',anchor:'nw'},{id:'bookcase',anchor:'se'}],
 'garage-storage':[{id:'shelf',anchor:'nw'},{id:'tire-stack',anchor:'se'}],
 sales:[{id:'gondola-shelf',anchor:'nw'},{id:'gondola-shelf',anchor:'se'}],
 checkout:[{id:'checkout',anchor:'nw'},{id:'display-rack',anchor:'se'}],
 stockroom:[{id:'rack',anchor:'nw'},{id:'box',anchor:'se'}],
 pantry:[{id:'shelf',anchor:'nw'},{id:'box',anchor:'se'}],
 restroom:[{id:'toilet',anchor:'nw'},{id:'sink',anchor:'se'}],
 service:[{id:'rack',anchor:'nw'},{id:'cart',anchor:'se'}],
 equipment:[{id:'generator',anchor:'nw'},{id:'tank',anchor:'se'}],
 control:[{id:'control-panel',anchor:'nw'},{id:'desk',anchor:'se'}],
 lobby:[{id:'desk',anchor:'nw'},{id:'armchair',anchor:'se'}],
 living:[{id:'sofa',anchor:'nw'},{id:'tv-stand',anchor:'se'},{id:'coffee-table',anchor:'west'}],
 kitchen:[{id:'counter',anchor:'nw'},{id:'fridge',anchor:'se'},{id:'stove',anchor:'west'}],
 bedroom:[{id:'bed',anchor:'nw'},{id:'nightstand',anchor:'ne'},{id:'dresser',anchor:'se'}],
 guest:[{id:'bed',anchor:'nw'},{id:'nightstand',anchor:'se'}],
 bathroom:[{id:'toilet',anchor:'nw'},{id:'sink',anchor:'se'}],
 reception:[{id:'desk',anchor:'nw'},{id:'chair',anchor:'se'}],
 office:[{id:'desk',anchor:'nw'},{id:'filing-cabinet',anchor:'se'}],
 cubicles:[{id:'desk',anchor:'nw'},{id:'desk',anchor:'se'}],
 meeting:[{id:'meeting-table',anchor:'west'}],
 break:[{id:'dining-table',anchor:'west'},{id:'counter',anchor:'se'}],
 storage:[{id:'shelf',anchor:'nw'},{id:'crate',anchor:'se'}],
 utility:[{id:'shelf',anchor:'nw'}],
 laundry:[{id:'laundry-machine',anchor:'nw'},{id:'shelf',anchor:'se'}],
 maintenance:[{id:'workbench',anchor:'nw'},{id:'shelf',anchor:'se'}],
 bay:[{id:'vehicle-lift',anchor:'west'},{id:'tool-chest',anchor:'se'}],
 workshop:[{id:'workbench',anchor:'nw'},{id:'tool-chest',anchor:'se'}],
 parts:[{id:'rack',anchor:'nw'},{id:'crate',anchor:'se'}],
 loading:[{id:'pallet',anchor:'nw'},{id:'crate',anchor:'se'}],
 aisle:[{id:'rack',anchor:'nw'},{id:'rack',anchor:'se'}],
 packing:[{id:'workbench',anchor:'nw'},{id:'box',anchor:'se'}],
 waiting:[{id:'chair',anchor:'nw'},{id:'chair',anchor:'se'}],
 exam:[{id:'exam-bed',anchor:'nw'},{id:'cabinet',anchor:'se'}],
 treatment:[{id:'exam-bed',anchor:'nw'},{id:'cart',anchor:'se'}],
 staff:[{id:'desk',anchor:'nw'},{id:'locker',anchor:'se'}],
 supply:[{id:'shelf',anchor:'nw'},{id:'cart',anchor:'se'}]
};
/** Large connected spaces get compositions rather than a duplicated
 * sofa/fridge/lift in every underlying floor rectangle. */
const zoneCompositions:Record<string,readonly (readonly Item[])[]>={
 living:[
  [{id:'sofa',anchor:'nw'},{id:'tv-stand',anchor:'se'}],
  [{id:'coffee-table',anchor:'west'},{id:'armchair',anchor:'se'}],
  [{id:'bookcase',anchor:'nw'},{id:'armchair',anchor:'se'}]],
 kitchen:[
  [{id:'counter',anchor:'nw'},{id:'fridge',anchor:'se'}],
  [{id:'stove',anchor:'nw'},{id:'sink',anchor:'se'},{id:'kitchen-island',anchor:'west'}]],
 bay:[
  [{id:'vehicle-lift',anchor:'west'},{id:'tool-chest',anchor:'se'}],
  [{id:'workbench',anchor:'nw'},{id:'tire-stack',anchor:'se'}]],
 sales:[
  [{id:'gondola-shelf',anchor:'nw'}],
  [{id:'gondola-shelf',anchor:'se'},{id:'display-rack',anchor:'nw'}]],
 reception:[
  [{id:'desk',anchor:'nw'},{id:'office-chair',anchor:'se'}],
  [{id:'chair',anchor:'nw'},{id:'plant',anchor:'se'}]],
 waiting:[
  [{id:'chair',anchor:'nw'},{id:'chair',anchor:'se'}],
  [{id:'bench',anchor:'west'},{id:'chair',anchor:'se'}]]
};
const inside=(p:Pt,r:Room)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
const overlap=(a:Obstacle,b:Obstacle,clearance=13)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+clearance&&Math.abs(a.y-b.y)<(a.h+b.h)/2+clearance;
function position(room:Room,w:number,h:number,side:Anchor):Pt{
 const left=room.x+w/2+13,right=room.x+room.w-w/2-13;
 const top=room.y+h/2+13,bottom=room.y+room.h-h/2-13;
 const midY=(top+bottom)/2;
 switch(side){
 case 'nw':return {x:left,y:top};
 case 'ne':return {x:right,y:top};
 case 'sw':return {x:left,y:bottom};
 case 'se':return {x:right,y:bottom};
 case 'west':return {x:left,y:midY};
 case 'east':return {x:right,y:midY};
 }
}
export function furnishRooms(site:Site,seed:number):Site{
 const rng=seeded(seed^0x4f012f32);
 const output:Obstacle[]=[];
 const reserved:Pt[]=[...site.spawn,...site.enemies,site.objective,site.extract];
 const exterior=site.cover.filter(o=>!site.rooms.some(r=>inside(o,r)));
 output.push(...exterior);
 const zoneCounts=new Map<string,number>(),zoneSeen=new Map<string,number>();
 for(const room of site.rooms){
  const key=room.zoneId??room.id;
  zoneCounts.set(key,(zoneCounts.get(key)??0)+1);
 }
 for(const room of site.rooms){
  if(room.kind==='hall')continue;
  const zone=room.zoneId??room.id,index=zoneSeen.get(zone)??0;
  zoneSeen.set(zone,index+1);
  const ordinary=compositions[room.purpose??'']??[{id:'crate',anchor:'nw'}];
  const alternate=zoneCompositions[room.purpose??''];
  const available=(zoneCounts.get(zone)??0)>1&&alternate?
   alternate[Math.min(index,alternate.length-1)]:ordinary;
  const placed:Obstacle[]=[];
  // Compact rooms still need defining fixtures (a toilet in a restroom,
  // an exam bed in a clinic), but never force large furniture inside them.
  if(room.w<72||room.h<72){
   output.push(...site.cover.filter(o=>inside(o,room)));continue;
  }
  const compact=room.w<108||room.h<104;
  const equipment=compact?available.slice(0,1):available;
  for(const [i,item] of equipment.entries()){
   const asset=propDefinition(item.id);if(!asset||!asset.solid)continue;
   const w=Math.min(asset.width,room.w*.40);
   const h=Math.min(asset.depth,room.h*.38);
   if(w<12||h<10)continue;
   const positions:Anchor[]=[item.anchor,'ne','sw','se','nw','west','east'];
   const rotation=Math.floor(rng()*4);
   const order=i===0?positions:[positions[0],...positions.slice(1+rotation),...positions.slice(1,1+rotation)];
   let chosen:Obstacle|undefined;
   for(const anchor of order){
    const p=position(room,w,h,anchor);
    const candidate:Obstacle={...p,w,h,fixture:item.id,low:asset.cover==='low'};
    if(site.doors.some(d=>Math.hypot(p.x-(d.a.x+d.b.x)/2,p.y-(d.a.y+d.b.y)/2)<Math.max(compact?39:54,Math.max(w,h)/2+(compact?19:30))))continue;
    if((site.openings??[]).some(o=>Math.hypot(p.x-(o.a.x+o.b.x)/2,
      p.y-(o.a.y+o.b.y)/2)<Math.max(65,Math.max(w,h)/2+32)))continue;
    if(reserved.some(q=>Math.abs(q.x-p.x)<w/2+24&&Math.abs(q.y-p.y)<h/2+24))continue;
    if([...output,...placed].some(o=>overlap(o,candidate)))continue;
    chosen=candidate;break;
   }
   if(chosen)placed.push(chosen);
  }
  if(placed.length)output.push(...placed);
  else output.push(...site.cover.filter(o=>inside(o,room)));
 }
 return {...site,cover:output};
}
