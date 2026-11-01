/** Deterministic room composition placement.
 * Keeps door swings, enemy/objective positions and circulation clear.
 * Room-centric layout replaces arbitrary scattered cover boxes. */
import {type Site,type Room,seeded} from '../breach-site.ts';
import {type Obstacle,type Pt} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
import {relatedFurniturePositions} from './room-composition.ts';
import {activityClusterCandidates} from './activity-clusters.ts';
import {withinOptionalFurnitureBudget} from './furniture-density.ts';
import {orientFurnishings} from './prop-orientation.ts';
import {ROOM_CONTRACTS} from './room-contracts.ts';
import {recoverRoomEssentials} from './room-essential-recovery.ts';
import {placeServiceQueues} from './service-queue-layout.ts';
import {planKitchenWorklines} from './kitchen-workline.ts';
import {circulationReservations,overlapsCirculationReservation} from './circulation-reservations.ts';
type Anchor='nw'|'ne'|'sw'|'se'|'west'|'east'|'center';
type Item={id:string;anchor:Anchor};
const compositions:Record<string,readonly Item[]>={
 studio:[{id:'bed',anchor:'nw'},{id:'sofa',anchor:'se'}],
 dining:[{id:'dining-table',anchor:'center'},{id:'chair',anchor:'se'}],
 foyer:[{id:'entry-bench',anchor:'nw'},{id:'coat-rack',anchor:'se'}],
 vestibule:[{id:'entry-bench',anchor:'nw'},{id:'coat-rack',anchor:'se'}],
 mudroom:[{id:'shoe-cubby',anchor:'nw'},{id:'entry-bench',anchor:'se'},
   {id:'coat-rack',anchor:'east'}],
 study:[{id:'desk',anchor:'nw'},{id:'bookcase',anchor:'se'}],
 'garage-storage':[{id:'shelf',anchor:'nw'},{id:'tire-stack',anchor:'se'}],
 sales:[{id:'gondola-shelf',anchor:'nw'},{id:'gondola-shelf',anchor:'se'}],
 checkout:[{id:'transaction-counter',anchor:'nw'},{id:'display-rack',anchor:'se'}],
 stockroom:[{id:'rack',anchor:'nw'},{id:'box',anchor:'se'}],
 pantry:[{id:'shelf',anchor:'nw'},{id:'box',anchor:'se'}],
 restroom:[{id:'toilet',anchor:'nw'},{id:'sink',anchor:'se'}],
 'half-bath':[{id:'toilet',anchor:'nw'},{id:'sink',anchor:'se'}],
 closet:[{id:'shelf',anchor:'nw'}],
 'utility-closet':[{id:'cabinet',anchor:'nw'}],
 service:[{id:'rack',anchor:'nw'},{id:'cart',anchor:'se'}],
 equipment:[{id:'generator',anchor:'nw'},{id:'tank',anchor:'se'}],
 control:[{id:'control-panel',anchor:'nw'},{id:'desk',anchor:'se'}],
 lobby:[{id:'desk',anchor:'nw'},{id:'armchair',anchor:'se'}],
 living:[{id:'sofa',anchor:'nw'},{id:'tv-stand',anchor:'se'},{id:'coffee-table',anchor:'west'}],
 kitchen:[{id:'counter',anchor:'nw'},{id:'fridge',anchor:'se'},{id:'stove',anchor:'west'}],
 bedroom:[{id:'bed',anchor:'nw'},{id:'nightstand',anchor:'ne'},{id:'dresser',anchor:'se'}],
 guest:[{id:'bed',anchor:'nw'},{id:'nightstand',anchor:'se'}],
 bathroom:[{id:'toilet',anchor:'nw'},{id:'sink',anchor:'se'}],
 reception:[{id:'reception-desk',anchor:'nw'},{id:'office-chair',anchor:'se'}],
 office:[{id:'desk',anchor:'nw'},{id:'filing-cabinet',anchor:'se'}],
 cubicles:[{id:'desk',anchor:'nw'},{id:'desk',anchor:'se'}],
 meeting:[{id:'meeting-table',anchor:'center'}],
 break:[{id:'dining-table',anchor:'center'},{id:'counter',anchor:'se'}],
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
  [{id:'reception-desk',anchor:'nw'},{id:'office-chair',anchor:'se'}],
  [{id:'chair',anchor:'nw'},{id:'plant',anchor:'se'}]],
 waiting:[
  [{id:'chair',anchor:'nw'},{id:'chair',anchor:'se'}],
  [{id:'bench',anchor:'west'},{id:'chair',anchor:'se'}]]
};
const overlap=(a:Obstacle,b:Obstacle,clearance=10)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+clearance&&Math.abs(a.y-b.y)<(a.h+b.h)/2+clearance;
function position(room:Room,w:number,h:number,side:Anchor):Pt{
 const left=room.x+w/2+13,right=room.x+room.w-w/2-13;
 const top=room.y+h/2+13,bottom=room.y+room.h-h/2-13;
 const midY=(top+bottom)/2;
 switch(side){
 case 'center':return {x:room.x+room.w/2,y:room.y+room.h/2};
 case 'nw':return {x:left,y:top};
 case 'ne':return {x:right,y:top};
 case 'sw':return {x:left,y:bottom};
 case 'se':return {x:right,y:bottom};
 case 'west':return {x:left,y:midY};
 case 'east':return {x:right,y:midY};
 }
}
/** Occupancy and activity determine furniture quantities, not only room labels.
 * Repeated chairs and storage banks are intentional separate objects.
 */
function activityFurniture(purpose:string,room:Room,items:readonly Item[],subtype=''):Item[]{
 const spacious=room.w*room.h>=22000;
 const large=room.w*room.h>=34000;
 const extras:Item[]=[];
 const add=(id:string,anchor:Anchor)=>extras.push({id,anchor});
 switch(purpose){
  case 'dining':
   // A table suggests seating; don't force a full four-place dining set.
   if(spacious)add('chair','ne');
   if(large)add('chair','sw');
   break;
  case 'meeting':
   add('chair','nw');
   if(spacious)add('chair','ne');
   if(large)add('chair','sw');
   break;
  case 'waiting':
   if(spacious)add('chair','sw');
   break;
  case 'office':case 'reception':case 'study':
   add('office-chair','ne');break;
  case 'cubicles':
   add('office-chair','ne');
   if(spacious)add('office-chair','sw');
   break;
  case 'sales':
   if(large)add('gondola-shelf','sw');
   break;
  case 'stockroom':case 'storage':
   if(spacious)add('rack','sw');
   break;
  case 'guest':
   if(spacious)add('dresser','sw');
   break;
  case 'workshop':
   if(spacious)add('compressor','sw');
   break;
  case 'exam':case 'treatment':
   if(spacious)add('handwash-station','ne');
   if(large)add('instrument-cart','sw');
   break;
  case 'packing':
   if(spacious)add('cart','sw');
   break;
  case 'parts':
   if(spacious)add('tire-stack','sw');
   break;
 }
 // Industrial and institutional fixtures are placed as primary equipment
 // below, not sprinkled on top of a domestic kitchen composition.
 if(purpose==='kitchen'&&['cafe','diner','sit-down-restaurant'].includes(subtype)){
   if(large)add('cart','sw');
 }
 if(purpose==='sales'&&large)add('retail-endcap','sw');
 if(purpose==='sales'&&subtype==='convenience-store')add('cooler','se');
 if(purpose==='sales'&&subtype==='hardware-store')add('wall-shelf','ne');
 if(purpose==='bay'&&subtype==='tire-service')add('tire-stack','sw');
 if(purpose==='workshop'&&subtype==='fabrication-shop')add('compressor','ne');
 if(purpose==='treatment'&&subtype==='urgent-care')add('cart','sw');
 return [...items,...extras];
}
/** Deterministic wall-parallel candidates fill the space left by coarse corner anchors.
 * Only near-wall positions are offered; the navigable centre is protected.
 */
function perimeterPositions(room:Room,w:number,h:number):Pt[]{
 const left=room.x+w/2+12,right=room.x+room.w-w/2-12;
 const top=room.y+h/2+12,bottom=room.y+room.h-h/2-12;
 if(left>right||top>bottom)return [];
 const candidates:Pt[]=[];
 const divisionsX=Math.min(5,Math.max(1,Math.floor((right-left)/28)));
 const divisionsY=Math.min(5,Math.max(1,Math.floor((bottom-top)/28)));
 for(let i=0;i<=divisionsX;i++){
  const x=left+(right-left)*i/divisionsX;
  candidates.push({x,y:top},{x,y:bottom});
 }
 for(let i=0;i<=divisionsY;i++){
  const y=top+(bottom-top)*i/divisionsY;
  candidates.push({x:left,y},{x:right,y});
 }
 return candidates;
}
export function furnishRooms(site:Site,seed:number):Site{
 const rng=seeded(seed^0x4f012f32);
 const reservedCirculation=circulationReservations(site);
 // Preserve architectural sills and outdoor fixtures while furnishing interiors.
 const output:Obstacle[]=[...site.cover];
 const furnishingIssues:NonNullable<Site['furnishingIssues']>=[];
 const reserved:Pt[]=[...site.spawn,...site.enemies,site.objective,site.extract];
 // Integrated kitchen equipment is reserved as a practical continuous work line.
 output.push(...planKitchenWorklines(site,output));
 // Reserve a complete bar installation BEFORE generic furnishing occupies the
 // useful circulation-adjacent space. Only compatible dining plans receive one.
 if(site.archetype==='restaurant'&&
   ['cafe','diner','sit-down-restaurant'].includes(site.identity?.subtype??'')){
   for(const room of site.rooms.filter(r=>r.kind==='room'&&r.purpose==='dining'&&
     r.w>=105&&r.h>=90)){
     let installed=false;
     for(const side of [1,-1]){
       for(const shift of [0,-.18,.18]){
         const x=room.x+room.w*(.5+shift);
         const y=room.y+room.h/2+side*(room.h/2-29);
         const counter:Obstacle={x,y,w:66,h:22,fixture:'bar-counter',
            low:propDefinition('bar-counter')?.cover==='low'};
         const stools:Obstacle[]=[-.27,.27].map(ratio=>({
           x:x+ratio*66,y:y-side*27,w:15,h:15,
           fixture:'bar-stool',low:true
         }));
         const group=[counter,...stools];
         const within=(o:Obstacle)=>o.x-o.w/2>room.x+9&&
           o.x+o.w/2<room.x+room.w-9&&o.y-o.h/2>room.y+9&&
           o.y+o.h/2<room.y+room.h-9;
         if(!group.every(within))continue;
         if(group.some(o=>[...site.doors].some(d=>
           Math.hypot(o.x-(d.a.x+d.b.x)/2,o.y-(d.a.y+d.b.y)/2)<38)))continue;
         if(group.some(o=>reserved.some(p=>Math.abs(p.x-o.x)<o.w/2+15&&
           Math.abs(p.y-o.y)<o.h/2+15)))continue;
         if(group.some(o=>output.some(other=>overlap(o,other,3))))continue;
         output.push(...group);installed=true;break;
       }
       if(installed)break;
     }
     if(installed)break;
   }
 }



 // Paired booth seating is a single authoritative footprint: no operator
 // can squeeze through the table/bench gap that is not actually walkable.
 if(site.archetype==='restaurant'&&
    ['diner','sit-down-restaurant'].includes(site.identity?.subtype??'')){
   for(const room of site.rooms.filter(r=>r.kind==='room'&&
     r.purpose==='dining'&&r.w>=112&&r.h>=96)){
     let placed=0;
     for(const [fx,fy] of [[.32,.26],[.68,.74],[.68,.26],[.32,.74]]){
       if(placed>=2)break;
       const w=56,h=38,x=room.x+room.w*fx,y=room.y+room.h*fy;
       const booth:Obstacle={x,y,w,h,fixture:'diner-booth',low:true};
       if(x-w/2<=room.x+11||x+w/2>=room.x+room.w-11||
         y-h/2<=room.y+11||y+h/2>=room.y+room.h-11)continue;
       if(site.doors.some(d=>Math.hypot(x-(d.a.x+d.b.x)/2,
         y-(d.a.y+d.b.y)/2)<45))continue;
       if((site.openings??[]).some(d=>Math.hypot(x-(d.a.x+d.b.x)/2,
         y-(d.a.y+d.b.y)/2)<50))continue;
       if(reserved.some(p=>Math.abs(x-p.x)<w/2+8&&
         Math.abs(y-p.y)<h/2+8))continue;
       if(output.some(o=>overlap(o,booth,4)))continue;
       output.push(booth);placed++;
     }
     if(placed>=2)break;
   }
 }

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
  const multi=(zoneCounts.get(zone)??0)>1;
  const defaultItems=multi&&alternate?
    alternate[Math.min(index,alternate.length-1)]:ordinary;
  const restaurant=site.archetype==='restaurant'&&
    ['cafe','diner','sit-down-restaurant'].includes(site.identity?.subtype??'');
  // Assign complete working stations to *functional* rooms. The home kitchen,
  // medical exam, shipping and service shop do not share one random furniture
  // pool simply because all contain counters and shelving.
  const kitchenWorkline=restaurant&&room.purpose==='kitchen'&&
    output.some(c=>c.fixture==='prep-table'&&c.x>room.x&&c.x<room.x+room.w&&
      c.y>room.y&&c.y<room.y+room.h);
  const specialized:readonly Item[]|undefined=
    kitchenWorkline?[{id:'fridge',anchor:'se'}]:
    restaurant&&room.purpose==='kitchen'?
      (multi?(index%2===0?
        [{id:'prep-table',anchor:'nw'},{id:'commercial-range',anchor:'se'}]:
        [{id:'dish-station',anchor:'nw'},{id:'fridge',anchor:'se'}]):
       [{id:'prep-table',anchor:'nw'},{id:'commercial-range',anchor:'se'},
        {id:'dish-station',anchor:'west'},{id:'fridge',anchor:'ne'}]):
    restaurant&&room.purpose==='service'?
      [{id:'dish-station',anchor:'nw'},{id:'cart',anchor:'se'}]:
    site.archetype==='clinic'&&['exam','treatment'].includes(room.purpose??'')?
      [{id:'exam-bed',anchor:'nw'},{id:'handwash-station',anchor:'se'},
       {id:'instrument-cart',anchor:'west'}]:
    site.archetype==='warehouse'&&room.purpose==='packing'?
      [{id:'packing-station',anchor:'nw'},{id:'box',anchor:'se'}]:
    site.archetype==='garage'&&room.purpose==='parts'?
      [{id:'parts-counter',anchor:'nw'},{id:'parts-bin',anchor:'se'}]:
    site.archetype==='retail'&&room.purpose==='checkout'?
      [{id:'transaction-counter',anchor:'nw'},{id:'display-rack',anchor:'se'}]:
    site.archetype==='retail'&&room.purpose==='sales'&&multi&&index%2===1?
      [{id:'retail-endcap',anchor:'nw'},{id:'display-rack',anchor:'se'}]:
    undefined;
  const available=specialized??defaultItems;
  const placed:Obstacle[]=[];
  const compact=room.w<108||room.h<104;
  const roomItems=compact?available.slice(0,1):available;
  // Complete required functional groups in single-cell zones. Multi-cell
  // zones already receive complementary authored compositions.
  const required=((zoneCounts.get(zone)??0)===1?
    (ROOM_CONTRACTS[room.purpose??'']?.required??[]):[]).filter(group=>
      !group.some(id=>output.some(c=>c.fixture===id&&
        c.x>room.x&&c.x<room.x+room.w&&c.y>room.y&&c.y<room.y+room.h)));
  const essential:Item[]=required.map(group=>{
    const commercialKitchen=room.purpose==='kitchen'&&
      ['cafe','diner','sit-down-restaurant'].includes(site.identity?.subtype??'');
    const favorite=commercialKitchen?
      group.find(id=>['prep-table','commercial-range','dish-station'].includes(id)):undefined;
    if(favorite)return {id:favorite,anchor:'nw' as Anchor};
    const existing=roomItems.find(item=>group.includes(item.id));
    if(existing)return existing;
    const assetId=group.find(id=>{
      const prop=propDefinition(id);
      return prop?.solid&&prop.width<=room.w-24&&prop.depth<=room.h-24;
    })??group[0];
    return {id:assetId,anchor:'nw' as Anchor};
  });
  const essentialIds=new Set(essential.map(item=>item.id));
  // Preserve repeated seating and shelving; only de-duplicate an item's
  // first authored instance when the required contract already added it.
  const remaining=activityFurniture(room.purpose??'',room,roomItems,site.identity?.subtype);
  const seenRequired=new Set<string>();
  const equipment:Item[]=[...essential];
  for(const item of remaining){
    if(essentialIds.has(item.id)&&!seenRequired.has(item.id)){
      seenRequired.add(item.id);continue;
    }
    equipment.push(item);
  }
  // Compact rooms still need defining fixtures (a toilet in a restroom,
  // an exam bed in a clinic), but never force large furniture inside them.
  if(room.w<72||room.h<72)continue;
  for(const [i,item] of equipment.entries()){
   const asset=propDefinition(item.id);
   if(!asset||!asset.solid){furnishingIssues.push({roomId:room.id,fixture:item.id,reason:'missing-solid-asset'});continue;}
   // Reject an oversized furnishing instead of shrinking it into a toy.
   const w=asset.width,h=asset.depth;
   if(w>room.w-24||h>room.h-24){
    furnishingIssues.push({roomId:room.id,fixture:item.id,reason:'insufficient-room-size'});continue;
   }
   const positions:Anchor[]=[item.anchor,'ne','sw','se','nw','west','east'];
   const rotation=Math.floor(rng()*4);
   const order=i===0?positions:[positions[0],...positions.slice(1+rotation),...positions.slice(1,1+rotation)];
   const candidates=[
     ...activityClusterCandidates(room,item.id,w,h,
       [...output,...placed].filter(o=>o.fixture)),
     ...relatedFurniturePositions(room,item.id,w,h,
       [...output,...placed].filter(o=>o.fixture&&site.rooms.some(r=>
         r.kind==='room'&&(r.zoneId??r.id)===zone&&
         o.x>r.x&&o.x<r.x+r.w&&o.y>r.y&&o.y<r.y+r.h))),
     ...order.map(anchor=>position(room,w,h,anchor)),
     ...perimeterPositions(room,w,h),
   ];
   let chosen:Obstacle|undefined;
   for(const p of candidates){
    if(p.x-w/2<room.x+9||p.x+w/2>room.x+room.w-9||
       p.y-h/2<room.y+9||p.y+h/2>room.y+room.h-9)continue;
    const candidate:Obstacle={...p,w,h,fixture:item.id,low:asset.cover==='low'};
    // Only optional additions obey the soft density budget. Never remove
    // mandatory sanitary fixtures or equipment to satisfy a furniture ratio.
    if(i>=essential.length&&!withinOptionalFurnitureBudget(
      room,[...output,...placed],w*h))continue;
    // Required groups retain access to this space; reject optional
    // extras that would eat an everyday pedestrian approach.
    if(i>=essential.length&&overlapsCirculationReservation(
      candidate,reservedCirculation,room.id))continue;
    if(site.doors.some(d=>Math.hypot(p.x-(d.a.x+d.b.x)/2,p.y-(d.a.y+d.b.y)/2)<Math.max(compact?39:54,Math.max(w,h)/2+(compact?19:30))))continue;
    if((site.openings??[]).some(o=>Math.hypot(p.x-(o.a.x+o.b.x)/2,
      p.y-(o.a.y+o.b.y)/2)<Math.max(65,Math.max(w,h)/2+32)))continue;
    if(reserved.some(q=>Math.abs(q.x-p.x)<w/2+24&&Math.abs(q.y-p.y)<h/2+24))continue;
    if([...output,...placed].some(o=>overlap(o,candidate)))continue;
    chosen=candidate;break;
   }
   if(chosen)placed.push(chosen);
   else furnishingIssues.push({roomId:room.id,fixture:item.id,reason:'all-placements-blocked'});
  }
  if(placed.length)output.push(...placed);
 }
 const completed=recoverRoomEssentials(site,output);
 return {...placeServiceQueues({...site,
  cover:orientFurnishings(site,completed.cover)}),
  furnishingIssues:[...furnishingIssues,...completed.issues]};
}
