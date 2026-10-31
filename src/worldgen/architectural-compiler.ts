/** Compiles a building-specific architectural program into one physical
 * authoritative site: contiguous floor rectangles, perimeter/partition wall
 * segments, actual 48-unit doors, and purposeful connected circulation.
 * One purpose can occupy an L-shaped union of several rectangular cells.
 */
import {architecturalBlueprint,type Blueprint} from './architectural-program.ts';
import {type Site,type Room,type BuildingArchetype,seeded} from '../breach-site.ts';
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
const weight=(a:Cell,b:Cell,rng:()=>number)=>{
 if(straight(a,b))return -100;
 if(a.room.kind==='hall'||b.room.kind==='hall')return 0+rng()*4;
 if(publicRoles.has(a.role)&&publicRoles.has(b.role))return 5+rng()*5;
 if(protectedRoles.has(a.role)&&protectedRoles.has(b.role))return 45+rng()*4;
 return 15+rng()*9;
};
function cut(wall:Segment,id:string,walls:Segment[],doors:Door[]){
 const length=span(wall);
 if(length<68){walls.push(wall);return;}
 const vx=(wall.b.x-wall.a.x)/length,vy=(wall.b.y-wall.a.y)/length;
 const middle={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2};
 const a={x:middle.x-vx*24,y:middle.y-vy*24};
 const b={x:middle.x+vx*24,y:middle.y+vy*24};
 if(span({a:wall.a,b:a})>.05)walls.push({a:wall.a,b:a});
 if(span({a:b,b:wall.b})>.05)walls.push({a:b,b:wall.b});
 doors.push({id,a,b,open:false,openedAt:-1});
}
export function compileArchitecturalSite(kind:BuildingArchetype,seed:number):Site{
 const b:Blueprint=architecturalBlueprint(kind,seed);
 const rng=seeded(seed^0x2a33bedd);
 const xs=[80],ys=[92];
 for(const w of b.widths)xs.push(xs[xs.length-1]+w);
 for(const h of b.depths)ys.push(ys[ys.length-1]+h);
 const cells:Cell[]=[],lookup=new Map<string,number>();
 for(let row=0;row<b.cells.length;row++)for(let col=0;col<b.widths.length;col++){
  const role=b.cells[row][col];if(!role)continue;
  const id='R'+(cells.length+1);
  const room:Room={id,zoneId:openRoles.has(role)?'ZONE-'+role:id,
   x:xs[col],y:ys[row],w:b.widths[col],h:b.depths[row],
   purpose:role,kind:role==='hallway'?'hall':'room',tone:(role.length+col)%4};
  lookup.set(key(row,col),cells.length);
  cells.push({row,col,role,room});
 }
 const internal:Edge[]=[],walls:Segment[]=[],doors:Door[]=[];
 const point=(x:number,y:number):Pt=>({x,y});
 const adj=(c:Cell,row:number,col:number,wall:Segment,orientation:Edge['orientation'])=>{
  const i=lookup.get(key(row,col));if(i===undefined)return false;
  const a=lookup.get(key(c.row,c.col))!,neighbor=cells[i];
  internal.push({a,b:i,wall,length:span(wall),orientation,
   score:weight(c,neighbor,rng),free:straight(c,neighbor),selected:false});
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
 // In rare fragmented grammars, retain the legacy fallback instead of
 // manufacturing a disconnected room with no physical traversal.
 if(new Set(cells.map((_,i)=>root(i))).size!==1)
   throw Error('Blueprint circulation disconnected');
 let id=1;
 for(const edge of internal){
  if(edge.free)continue;
  const a=cells[edge.a],b=cells[edge.b];
  const optionalLoop=!edge.selected&&edge.length>=86&&
    !protectedRoles.has(a.role)&&!protectedRoles.has(b.role)&&rng()<.10;
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
 const west=xs[0],east=xs[xs.length-1],north=ys[0],south=ys[ys.length-1];
 return {seed,name:b.family.toUpperCase(),archetype:kind,scale:'expanded',
   planFamily:b.family,programLocked:true,
   rooms:cells.map(c=>c.room),walls,doors,cover:[],
   entrance,spawn,enemies,objective,extract:point(frontX,frontY+117),
   roomCount:habitable.length,layout:'corridor',
   bounds:{minX:Math.min(0,west-80),minY:Math.min(0,north-80),
    maxX:Math.max(640,east+84),maxY:Math.max(740,south+156)}};
}
