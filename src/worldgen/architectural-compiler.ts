/** Compiles a building-specific architectural program into one physical
 * authoritative site: contiguous floor rectangles, perimeter/partition wall
 * segments, actual 48-unit doors, and purposeful connected circulation.
 * One purpose can occupy an L-shaped union of several rectangular cells.
 */
import {architecturalBlueprint,type Blueprint} from './architectural-program.ts';
import {sizedBlueprint} from './size-blueprints.ts';
import {circulationFor,circulationScore,loopChance,type CirculationStyle} from './circulation-grammar.ts';
import {type Site,type Room,type BuildingArchetype,type SiteScale,seeded} from '../breach-site.ts';
import {type Pt,type Door,type Segment} from '../breach-core.ts';
type Cell={col:number;row:number;role:string;room:Room};
type Edge={a:number;b:number;wall:Segment;length:number;
  orientation:'horizontal'|'vertical';score:number;free:boolean;selected:boolean};
const openRoles=new Set(['living','kitchen','dining','sales','stockroom','loading',
 'storage','waiting','reception','lobby','hallway','aisle','cubicles','bay',
 'equipment']);
const protectedRoles=new Set(['exam','treatment','bathroom','bedroom','guest','restroom']);
const publicRoles=new Set(['waiting','reception','lobby','living','dining',
 'sales','checkout','aisle','loading']);
const center=(r:Room):Pt=>({x:r.x+r.w/2,y:r.y+r.h/2});
const span=(w:Segment)=>Math.hypot(w.a.x-w.b.x,w.a.y-w.b.y);
const side=(x:number,y:number,xx:number,yy:number):Segment=>
 ({a:{x,y},b:{x:xx,y:yy}});
const key=(row:number,col:number)=>row+':'+col;
const straight=(a:Cell,b:Cell)=>{
 if(a.role===b.role&&openRoles.has(a.role))return true;
 return a.room.kind==='hall'&&b.room.kind==='hall';
};
const weight=(a:Cell,b:Cell,rng:()=>number,style:CirculationStyle)=>{
 if(straight(a,b))return -120;
 const semantic=circulationScore(style,
  {role:a.role,hall:a.room.kind==='hall'},
  {role:b.role,hall:b.room.kind==='hall'});
 const sensitive=protectedRoles.has(a.role)&&protectedRoles.has(b.role)?38:0;
 return semantic+sensitive+rng()*6;
};
function cut(wall:Segment,id:string,walls:Segment[],doors:Door[]){
 const length=span(wall);
 if(length<55){walls.push(wall);return;}
 const vx=(wall.b.x-wall.a.x)/length,vy=(wall.b.y-wall.a.y)/length;
 const middle={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2};
 const a={x:middle.x-vx*24,y:middle.y-vy*24};
 const b={x:middle.x+vx*24,y:middle.y+vy*24};
 if(span({a:wall.a,b:a})>.05)walls.push({a:wall.a,b:a});
 if(span({a:b,b:wall.b})>.05)walls.push({a:b,b:wall.b});
 doors.push({id,a,b,open:false,openedAt:-1});
}
export function compileArchitecturalSite(kind:BuildingArchetype,seed:number,
 scale:SiteScale='expanded'):Site{
 const baseline=architecturalBlueprint(kind,seed);
 const authored:Blueprint=scale==='small'||scale==='large'?
   sizedBlueprint(kind,seed,scale,baseline):baseline;
 // Compact buildings use the identical architectural grammar, with smaller
 // habitable rooms but never shrink the 48-unit door or operator clearance.
 const b:Blueprint=scale!=='standard'?authored:{
  ...authored,
  family:authored.family+' / compact',
  widths:authored.widths.map((w,col)=>Math.round(Math.max(
   authored.cells.some(row=>row[col]==='hallway')?62:96,w*.79))),
  depths:authored.depths.map((h,row)=>Math.round(Math.max(
   authored.cells[row].every(role=>role==='hallway'||role===null)?63:86,h*.81)))
 };
 const rng=seeded(seed^0x2a33bedd);
 const circulationStyle=circulationFor(kind,seed);
 const xs=[80],ys=[92];
 for(const w of b.widths)xs.push(xs[xs.length-1]+w);
 for(const h of b.depths)ys.push(ys[ys.length-1]+h);
 const cells:Cell[]=[],lookup=new Map<string,number>();
 for(let row=0;row<b.cells.length;row++)for(let col=0;col<b.widths.length;col++){
  const role=b.cells[row][col];if(!role)continue;
  const id='R'+(cells.length+1);
  const room:Room={id,zoneId:openRoles.has(role)?'ZONE-'+role:id,
   x:xs[col],y:ys[row],w:b.widths[col],h:b.depths[row],
   purpose:role,kind:role==='hallway'?'hall':'room',
   tone:(role.length+(role.charCodeAt(0)||0))%4};
  lookup.set(key(row,col),cells.length);
  cells.push({row,col,role,room});
 }
 const internal:Edge[]=[],walls:Segment[]=[],doors:Door[]=[];
 const point=(x:number,y:number):Pt=>({x,y});
 const adj=(c:Cell,row:number,col:number,wall:Segment,orientation:Edge['orientation'])=>{
  const i=lookup.get(key(row,col));if(i===undefined)return false;
  const a=lookup.get(key(c.row,c.col))!,neighbor=cells[i];
  internal.push({a,b:i,wall,length:span(wall),orientation,
   score:weight(c,neighbor,rng,circulationStyle),
   free:straight(c,neighbor),selected:false});
  return true;
 };
 let frontFound=false;
 for(const c of cells){
  const x=xs[c.col],xx=xs[c.col+1],y=ys[c.row],yy=ys[c.row+1];
  if(!lookup.has(key(c.row-1,c.col)))walls.push(side(x,y,xx,y));
  if(!lookup.has(key(c.row,c.col-1)))walls.push(side(x,y,x,yy));
  const east=side(xx,y,xx,yy);
  if(!adj(c,c.row,c.col+1,east,'vertical'))walls.push(east);
  const south=side(x,yy,xx,yy);
  if(!adj(c,c.row+1,c.col,south,'horizontal')){
   if(c.col===b.front.col&&c.row===b.front.row){
    cut(south,'FRONT',walls,doors);frontFound=true;
   }else walls.push(south);
  }
 }
 if(!frontFound)throw Error('Blueprint front does not touch perimeter');
 const parent=cells.map((_,i)=>i);
 const root=(i:number):number=>{while(parent[i]!==i)i=parent[i];return i;};
 const union=(a:number,b:number)=>{const pa=root(a),pb=root(b);if(pa===pb)return false;
  parent[pb]=pa;return true;};
 for(const edge of internal)if(edge.free){edge.selected=true;union(edge.a,edge.b);}
 for(const edge of internal.slice().sort((a,b)=>a.score-b.score||
   a.a-b.a||a.b-b.b))if(!edge.selected&&edge.length>=68&&
   union(edge.a,edge.b))edge.selected=true;
 // A functional zone is a *connected* cluster of matching room rectangles.
 // Two garage bays divided by a service aisle are not one giant shared bay.
 const zoneParent=cells.map((_,i)=>i);
 const zoneRoot=(i:number):number=>{
  while(zoneParent[i]!==i)i=zoneParent[i];
  return i;
 };
 for(const edge of internal)if(edge.free&&cells[edge.a].role===cells[edge.b].role)
  zoneParent[zoneRoot(edge.b)]=zoneRoot(edge.a);
 for(let i=0;i<cells.length;i++)cells[i].room.zoneId=
  openRoles.has(cells[i].role)?
   'ZONE-'+cells[i].role+'-'+zoneRoot(i):cells[i].room.id;
 // In rare fragmented grammars, retain the legacy fallback instead of
 // manufacturing a disconnected room with no physical traversal.
 if(new Set(cells.map((_,i)=>root(i))).size!==1)
   throw Error('Blueprint circulation disconnected');
 let id=1;
 for(const edge of internal){
  if(edge.free)continue;
  const a=cells[edge.a],b=cells[edge.b];
  const optionalLoop=!edge.selected&&edge.length>=86&&
    rng()<loopChance(circulationStyle,a,b);
  if(edge.selected||optionalLoop)cut(edge.wall,'D'+id++,walls,doors);
  else walls.push(edge.wall);
 }
 const entry=cells[lookup.get(key(b.front.row,b.front.col))!];
 const frontY=ys[b.front.row+1],frontX=entry.room.x+entry.room.w/2;
 const entrance=point(frontX,frontY+53);
 const spawn=[point(frontX-18,frontY+45),point(frontX+18,frontY+45),
  point(frontX-18,frontY+74),point(frontX+18,frontY+74)];
 const habitable=cells.filter(c=>c.room.kind==='room');
 const far=habitable.filter(c=>!publicRoles.has(c.role))
   .sort((a,b)=>center(a.room).y-center(b.room).y);
 const target=far[0]??habitable[0],objective=center(target.room);
 const candidates=habitable.filter(c=>c!==target&&
   Math.hypot(center(c.room).x-entrance.x,center(c.room).y-entrance.y)>100);
 const enemies:Pt[]=[];
 for(const c of candidates.slice().sort((a,b)=>a.room.id.localeCompare(b.room.id))
   .sort(()=>0)){ // stable authored order, not a random shuffle
  const p=center(c.room);
  if(Math.hypot(p.x-objective.x,p.y-objective.y)>40&&
    enemies.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>40))enemies.push(p);
  if(enemies.length>=Math.min(6,Math.max(3,Math.floor(habitable.length/2))))break;
 }
 if(enemies.length<2)for(const c of habitable){
  const p=center(c.room);
  if(enemies.length>=2)break;
  if(Math.hypot(p.x-objective.x,p.y-objective.y)>40&&
    !enemies.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<40))enemies.push(p);
 }
 // A secondary legitimate way in changes tactical circulation and reflects
 // real rear kitchens, service bays, clinic staff doors and loading operations.
 // Only split a truly exterior wall, never a partition between occupied rooms.
 const accessRoles:Partial<Record<BuildingArchetype,readonly string[]>>={
  house:['kitchen','dining'],townhouse:['kitchen','dining'],
  apartment:['utility'],retail:['stockroom','service'],
  office:['storage','break'],garage:['bay','workshop'],
  warehouse:['loading','service'],restaurant:['kitchen','service'],
  motel:['laundry','maintenance'],utility:['equipment','service'],
  clinic:['staff','supply']
 };
 const preferred=accessRoles[kind]??[];
 const front=doors.find(d=>d.id==='FRONT')!;
 const frontMid={x:(front.a.x+front.b.x)/2,y:(front.a.y+front.b.y)/2};
 const interior=(p:Pt)=>cells.find(c=>p.x>c.room.x+1&&
   p.x<c.room.x+c.room.w-1&&p.y>c.room.y+1&&
   p.y<c.room.y+c.room.h-1);
 const choices=walls.map((wall,index)=>{
  const length=span(wall);
  const mid={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2};
  const dx=(wall.b.x-wall.a.x)/length,dy=(wall.b.y-wall.a.y)/length;
  const left=interior({x:mid.x-dy*16,y:mid.y+dx*16});
  const right=interior({x:mid.x+dy*16,y:mid.y-dx*16});
  const room=left&&!right?left:right&&!left?right:null;
  const weight=preferred.indexOf(room?.role??'');
  return {index,wall,length,mid,weight};
 }).filter(c=>c.weight>=0&&c.length>=105&&
  Math.hypot(c.mid.x-frontMid.x,c.mid.y-frontMid.y)>104)
  .sort((a,b)=>a.weight-b.weight||
    Math.hypot(b.mid.x-frontMid.x,b.mid.y-frontMid.y)-
    Math.hypot(a.mid.x-frontMid.x,a.mid.y-frontMid.y));
 if(choices.length){
  const candidate=choices[0];
  walls.splice(candidate.index,1);
  cut(candidate.wall,'SERVICE',walls,doors);
 }
 // Service bay, shipping frontage and shopfronts can have a truly wide
 // clear opening. Cut authoritative perimeter walls; this is a *permanently
 // open portal*, not a cosmetic or pretend-operable garage shutter.
 const openingRoles:Partial<Record<BuildingArchetype,readonly string[]>>={
  garage:['bay','workshop','waiting'],
  warehouse:['loading','storage','packing'],
  retail:['sales','checkout'],restaurant:['dining','reception'],
  utility:['service','equipment','control']
 };
 const openPreferred=openingRoles[kind]??[];
 const portalCandidates=walls.map((wall,index)=>{
  const length=span(wall);
  const industrial=['garage','warehouse','utility'].includes(kind);
  if(length<(industrial?135:142))return null;
  const p={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2};
  const vx=(wall.b.x-wall.a.x)/length,vy=(wall.b.y-wall.a.y)/length;
  const inward=interior({x:p.x-vy*17,y:p.y+vx*17})??
    interior({x:p.x+vy*17,y:p.y-vx*17});
  const roleIndex=openPreferred.indexOf(inward?.role??'');
  if(roleIndex<0||Math.hypot(p.x-frontMid.x,p.y-frontMid.y)<
    (['garage','warehouse','utility'].includes(kind)?76:78))return null;
  return {wall,index,length,roleIndex,p};
 }).filter((v):v is NonNullable<typeof v>=>v!==null)
   .sort((a,b)=>a.roleIndex-b.roleIndex||b.length-a.length);
 const openings:NonNullable<Site['openings']>=[];
 if(portalCandidates.length){
  const {index,wall,length}=portalCandidates[0];
  const extent=Math.min(112,length-46);
  const ux=(wall.b.x-wall.a.x)/length,uy=(wall.b.y-wall.a.y)/length;
  const mid={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2};
  const a={x:mid.x-ux*extent/2,y:mid.y-uy*extent/2};
  const b={x:mid.x+ux*extent/2,y:mid.y+uy*extent/2};
  walls.splice(index,1,{a:wall.a,b:a},{a:b,b:wall.b});
  if(['garage','warehouse','utility'].includes(kind))
    doors.push({id:'SHUTTER',a,b,kind:'shutter',open:false,openedAt:-1,
      resistance:2.4,latchIntegrity:5,frameIntegrity:8});
  else if(['retail','restaurant'].includes(kind)&&seed%2===0){
    // A single 96-unit threshold with two independently hinged 48-unit
    // leaves. The center is never occupied by a structural wall segment.
    const middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    const lhs={x:middle.x-ux*48,y:middle.y-uy*48};
    const rhs={x:middle.x+ux*48,y:middle.y+uy*48};
    walls.splice(index,2,{a:wall.a,b:lhs},{a:rhs,b:wall.b});
    doors.push({id:'DOUBLE-L',a:lhs,b:middle,kind:'hinged',
      hinge:'a',swing:-1,pairedWith:'DOUBLE-R',open:false,openedAt:-1});
    doors.push({id:'DOUBLE-R',a:middle,b:rhs,kind:'hinged',
      hinge:'b',swing:1,pairedWith:'DOUBLE-L',open:false,openedAt:-1});
  }else openings.push({id:'OPEN-SERVICE',a,b,kind:'wide'});
 }
 // Doors into enclosed or partly enclosed courts create an actual
 // circulation alternative. A courtyard is not merely a painted floor void.
 const courtAccess:string[]=['hallway','lobby','reception','aisle','guest',
   'living','dining','sales','service','maintenance','loading'];
 const courtWalls:{index:number;wall:Segment;rank:number}[]=[];
 for(let row=0;row<b.cells.length;row++)for(let col=0;col<b.widths.length;col++){
  if(b.cells[row][col]!==null)continue;
  const x=xs[col],xx=xs[col+1],y=ys[row],yy=ys[row+1];
  const sides=[
   {r:row-1,c:col,axis:'y',coord:y,lo:x,hi:xx},
   {r:row+1,c:col,axis:'y',coord:yy,lo:x,hi:xx},
   {r:row,c:col-1,axis:'x',coord:x,lo:y,hi:yy},
   {r:row,c:col+1,axis:'x',coord:xx,lo:y,hi:yy}
  ];
  for(const side of sides){
   const cell=lookup.get(key(side.r,side.c));
   if(cell===undefined)continue;
   const rank=courtAccess.indexOf(cells[cell].role);
   if(rank<0)continue;
   for(let index=0;index<walls.length;index++){
    const wall=walls[index],mid={x:(wall.a.x+wall.b.x)/2,
      y:(wall.a.y+wall.b.y)/2};
    const onEdge=side.axis==='x'?
      Math.abs(wall.a.x-side.coord)<.01&&
      Math.abs(wall.b.x-side.coord)<.01&&
      mid.y>side.lo+28&&mid.y<side.hi-28:
      Math.abs(wall.a.y-side.coord)<.01&&
      Math.abs(wall.b.y-side.coord)<.01&&
      mid.x>side.lo+28&&mid.x<side.hi-28;
    if(onEdge&&span(wall)>=94&&!courtWalls.some(c=>c.index===index))
      courtWalls.push({index,wall,rank});
   }
  }
 }
 courtWalls.sort((a,b)=>a.rank-b.rank||b.index-a.index);
 let courtDoors=0;
 for(const candidate of courtWalls){
  if(courtDoors>=2)break;
  const index=walls.indexOf(candidate.wall);
  if(index<0)continue;
  walls.splice(index,1);
  cut(candidate.wall,'COURT-'+(++courtDoors),walls,doors);
 }
 const west=xs[0],east=xs[xs.length-1],north=ys[0],south=ys[ys.length-1];
 return {seed,name:b.family.toUpperCase(),archetype:kind,scale,
   planFamily:b.family,programLocked:true,circulationStyle,
   rooms:cells.map(c=>c.room),walls,doors,openings,cover:[],
   entrance,spawn,enemies,objective,extract:point(frontX,frontY+117),
   roomCount:habitable.length,layout:'corridor',
   bounds:{minX:Math.min(0,west-80),minY:Math.min(0,north-80),
    maxX:Math.max(['expanded','medium','large'].includes(scale)?720:640,east+84),
    maxY:Math.max(740,south+156)}};
}
