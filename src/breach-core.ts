/**
 * Fieldwork / Breach 052 — standalone tactical kernel.
 * Original level, artwork and mechanics informed by freeform pause-and-plan tactics.
 * No dependency on the abandoned regional terrain or 3D prototypes.
 */
import {type Site} from './breach-site.ts';
import {DOOR_PANEL_END_RECESS} from './breach-door-proportions.ts';
export type Pt={x:number;y:number};
export type Segment={a:Pt;b:Pt};
export type DoorStyle='wood'|'steel'|'reinforced'|'exit'|'glazed'|'mesh-gate'|'french'|'louvered'|'screen'|'barn'|'pocket'|'fire';
export type Door={id:string;a:Pt;b:Pt;open:boolean;openedAt:number;
  style?:DoorStyle;
  /** Mechanical closure with vertical lift; routes and shots respect shutter state. */
  kind?:'hinged'|'shutter'|'sliding';
  slideDirection?:-1|1;
  pairedWith?:string;
  hinge?:'a'|'b';swing?:-1|1;openFraction?:number;
  angularVelocity?:number;resistance?:number;kickImpulse?:number;heldBy?:string|null;latchIntegrity?:number;frameIntegrity?:number;
  kicks?:number;lastKickAt?:number;forced?:boolean;locked?:boolean;jammed?:boolean;
  /** Pressure may request a wider-than-normal door swing. */
  pushTarget?:number;
  /** A glass leaf keeps its frame after the glazing has shattered. */
  glassShattered?:boolean;
  wedged?:boolean;wedgeOwnerId?:string;}
export type Obstacle={x:number;y:number;w:number;h:number;low?:boolean;
  fixture?:string;material?:import('./breach-materials.ts').MaterialId;
  /** Render-only deterministic trim selection; ignored by collision and AI. */
  artVariant?:number;
  /** Cardinal local-facing turn, with w/h already representing rotated tactical bounds. */
  orientation?:0|1|2|3;
  /** Preview-only finish overrides; never used by tactical logic. */
  artCondition?:'clean'|'used'|'neglected'|'vacant';
  artSurface?:import('./rendering/pixel-recipes.ts').PixelSurface;
  integrity?:number;destroyed?:boolean};
export type Side='blue'|'red';
export type Operator={id:string;name:string;side:Side;p:Pt;heading:number;
  path:Pt[];health:number;shots:number;fireCd:number;aimLock:boolean;
  contacted:boolean;lastSpotted:Pt|null;};
export type Spark={p:Pt;age:number;side:Side};
export type Phase='planning'|'running'|'won'|'lost';
export type TacticalState={phase:Phase;seconds:number;operators:Operator[];
  doors:Door[];sparks:Spark[];spotted:Set<string>;events:string[];
  rng:number;};
export const W=640,H=740,GRID=16;
/** Single authoritative playable envelope for all movement and cameras. */
export const activeWorldBounds=()=>site?.bounds??
  {minX:0,minY:0,maxX:W,maxY:H};
const wall=(x:number,y:number,u:number,v:number):Segment=>
  ({a:{x,y},b:{x:u,y:v}});
export const WALLS:Segment[]=[
  wall(112,100,590,100),wall(112,100,112,532),
  wall(590,100,590,532),
  wall(112,532,276,532),wall(329,532,590,532),
  wall(382,100,382,305),wall(382,345,382,532),
];
export const COVER:Obstacle[]=[
  {x:159,y:189,w:86,h:39,low:true},
  {x:260,y:392,w:78,h:28,low:true},
  {x:448,y:164,w:94,h:40,low:false},
  {x:493,y:390,w:55,h:71,low:false},
  {x:23,y:573,w:94,h:42,low:true},
  {x:505,y:594,w:82,h:46,low:true},
];
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const doorCenter=(d:Door):Pt=>({
  x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2});
const BASE_WALLS=WALLS.map(w=>({a:{...w.a},b:{...w.b}}));
const BASE_COVER=COVER.map(o=>({...o}));
let site:Site|null=null;
/** A single geometry source drives collision, LOS, routefinding and renderers. */
export function activateSite(next:Site|null){
  site=next;
  WALLS.splice(0,WALLS.length,...(next?.walls??BASE_WALLS));
  COVER.splice(0,COVER.length,...(next?.cover??BASE_COVER).map(o=>({...o})));
  // Runtime displacements never mutate the seed-derived site data.
}
export const activeSite=()=>site;
export const initialDoors=():Door[]=>
  (site?.doors??[
    {id:'FRONT',a:{x:276,y:532},b:{x:329,y:532},open:false,openedAt:-1},
    {id:'INNER',a:{x:382,y:305},b:{x:382,y:345},open:false,openedAt:-1},
  ]).map(d=>({...d,a:{...d.a},b:{...d.b}}));
export const pointToSegment=(p:Pt,s:Segment):number=>{
  const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y;
  const t=Math.max(0,Math.min(1,((p.x-s.a.x)*dx+(p.y-s.a.y)*dy)/
    Math.max(.0001,dx*dx+dy*dy)));
  return Math.hypot(p.x-s.a.x-dx*t,p.y-s.a.y-dy*t);
};
const orient=(a:Pt,b:Pt,c:Pt)=>
  (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function segmentsCross(a:Segment,b:Segment):boolean{
  const ab1=orient(a.a,a.b,b.a),ab2=orient(a.a,a.b,b.b);
  const ba1=orient(b.a,b.b,a.a),ba2=orient(b.a,b.b,a.b);
  return ab1*ab2<0&&ba1*ba2<0;
}
const pointInCover=(p:Pt,o:Obstacle,r=0)=>
  Math.abs(p.x-o.x)<o.w/2+r&&Math.abs(p.y-o.y)<o.h/2+r;
export const OPERATOR_RADIUS=8;
export function passable(p:Pt,clearance=OPERATOR_RADIUS):boolean{
  const bounds=activeWorldBounds();
  if(p.x<bounds.minX+13||p.y<bounds.minY+20||
    p.x>bounds.maxX-13||p.y>bounds.maxY-13)return false;
  if(WALLS.some(s=>pointToSegment(p,s)<clearance+1))return false;
  if(COVER.some(o=>pointInCover(p,o,clearance)))return false;
  return true;
}
/** The rotated leaf is the single collision/sightline surface. A hinge on
 * endpoint B reverses the closed direction. Tactical (x,y) rotates opposite
 * THREE's Y-axis door yaw so the 2D and 3D leaves overlap. */
export const doorYaw=(d:Door)=>d.kind==='sliding'?0:(d.swing??-1)*
  (d.openFraction??(d.open?1:0))*1.54;
export function doorLeafSegment(d:Door):Segment{
 // Vertical shutters obstruct their full width until the panel is
 // sufficiently high for an operator to pass underneath.
 if(d.kind==='shutter')return (d.openFraction??(d.open?1:0))>=.72?
   {a:{...d.a},b:{...d.a}}:{a:{...d.a},b:{...d.b}};
 if(d.kind==='sliding'){
   const fraction=d.openFraction??(d.open?1:0),sign=d.slideDirection??1;
   const dx=(d.b.x-d.a.x)*fraction*sign,dy=(d.b.y-d.a.y)*fraction*sign;
   return {a:{x:d.a.x+dx,y:d.a.y+dy},b:{x:d.b.x+dx,y:d.b.y+dy}};
 }
 const hinge=d.hinge==='b'?d.b:d.a;
 const end=d.hinge==='b'?d.a:d.b;
 // The physical leaf stops just shy of the latch jamb instead of
 // mathematically occupying the entire structural opening. The rendered
 // panel already has an equivalent inset; keeping both aligned prevents
 // the last few units of open door from trapping an operator at the tip.
 const rawX=end.x-hinge.x,rawY=end.y-hinge.y;
 const reach=Math.hypot(rawX,rawY);
 const scale=reach?Math.max(0,reach-DOOR_PANEL_END_RECESS)/reach:0;
 const x=rawX*scale,y=rawY*scale;
 const angle=-doorYaw(d),cos=Math.cos(angle),sin=Math.sin(angle);
 return {a:{...hinge},b:{x:hinge+x*cos-y*sin,
   y:hinge+x*sin+y*cos}};
}
export function doorBlocksSegment(door:Door,line:Segment):boolean{
 const leaf=doorLeafSegment(door);
 return segmentsCross(line,leaf);
}
export function doorBlocksRay(doors:Door[],line:Segment):boolean{
 return doors.some(door=>door.style!=='mesh-gate'&&door.style!=='screen'&&doorBlocksSegment(door,line));
}
/** Transparent hinged glass transmits sight but retains its physical collision leaf. */
export function doorBlocksSightRay(doors:Door[],ray:Segment):boolean{
 return doors.some(d=>!['glazed','mesh-gate','screen','french'].includes(d.style??'wood')&&doorBlocksSegment(d,ray));
}
export function isClear(a:Pt,b:Pt,doors:Door[],ignoreDoors=false):boolean{
  const shot={a,b};
  if(WALLS.some(w=>segmentsCross(shot,w)))return false;
  if(!ignoreDoors&&doorBlocksRay(doors,shot))
    return false;
  // Furniture blocks bullets/visibility but can be bypassed through doors.
  const n=Math.max(1,Math.ceil(distance(a,b)/8));
  for(let i=1;i<n;i++){
    const t=i/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
    if(COVER.some(o=>!['chain-link-fence','iron-fence'].includes(o.fixture??'')&&pointInCover(p,o,0)))return false;
  }
  return true;
}
const key=(col:number,row:number)=>col+','+row;
const sweepPassable=(from:Pt,to:Pt,canStand:(p:Pt)=>boolean)=>{
  const count=Math.max(1,Math.ceil(distance(from,to)/4));
  for(let i=1;i<=count;i++){
    const t=i/count;
    if(!canStand({x:from.x+(to.x-from.x)*t,
      y:from.y+(to.y-from.y)*t}))return false;
  }
  return true;
};
/** Broad pathfinding remains 16-unit A*, with bounded local 8-unit rescue
 * for a physically valid narrow route missed by the coarse grid. */
export function route(from:Pt,to:Pt,
  canStand:(p:Pt)=>boolean=passable):Pt[]{
  // Most routes have a legal snapped endpoint. Preserve the single cheap
  // A* path in that overwhelmingly common case. A disconnected map must not
  // pay for another full search on every attempted door or actor route.
  const snap={x:Math.round(to.x/GRID)*GRID,
    y:Math.round(to.y/GRID)*GRID};
  const needsAlternate=canStand(to)&&
    (!canStand(snap)||!sweepPassable(snap,to,canStand));
  if(needsAlternate){
    // Bypass the guaranteed failed first pass when the snapped target is
    // physically invalid. A nearby swept legal grid anchor is enough.
    return distance(from,to)>245?
      routeGrid(from,to,canStand,GRID,5000,Infinity,true):
      routeGrid(from,to,canStand,GRID/2,3800,76,true);
  }
  const broad=routeGrid(from,to,canStand,GRID,6000);
  if(broad.length||distance(from,to)>245)return broad;
  return routeGrid(from,to,canStand,GRID/2,3800,76,true);
}
function routeGrid(from:Pt,to:Pt,canStand:(p:Pt)=>boolean,
  grid:number,budget:number,padding=Infinity,
  alternateGoal=false):Pt[]{
  const cellAt=(p:Pt)=>({col:Math.round(p.x/grid),
    row:Math.round(p.y/grid)});
  const cellPoint=(col:number,row:number):Pt=>({x:col*grid,
    y:row*grid});
  if(!canStand(to))return [];
  const st=cellAt(from),goal=cellAt(to);
  const startKey=key(st.col,st.row),goalKey=key(goal.col,goal.row);
  if(startKey===goalKey)return [{...to}];
  // Endpoint rescue: an exact walkable location can snap to an illegal
  // grid vertex. Find a nearby legal vertex with a swept final connector.
  // Do this only after the inexpensive ordinary A* has failed.
  const targets=new Set<string>();
  if(alternateGoal){
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
      const col=goal.col+dx,row=goal.row+dy,p=cellPoint(col,row);
      if(canStand(p)&&sweepPassable(p,to,canStand))
        targets.add(key(col,row));
    }
    if(!targets.size)return [];
  }else targets.add(goalKey);
  const open=[{col:st.col,row:st.row,g:0,f:0}];
  const best=new Map<string,number>([[startKey,0]]);
  const parents=new Map<string,string>();
  const visited=new Set<string>();
  let reachedKey:string|null=null;
  const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for(let iter=0;open.length&&iter<budget;iter++){
    open.sort((a,b)=>a.f-b.f);
    const at=open.shift()!,k=key(at.col,at.row);
    if(visited.has(k))continue;visited.add(k);
    if(targets.has(k)){reachedKey=k;break;}
    for(const [dx,dy] of dirs){
      const col=at.col+dx,row=at.row+dy,p=cellPoint(col,row);
      if(padding!==Infinity&&
        (p.x<Math.min(from.x,to.x)-padding||
         p.x>Math.max(from.x,to.x)+padding||
         p.y<Math.min(from.y,to.y)-padding||
         p.y>Math.max(from.y,to.y)+padding))continue;
      if(!canStand(p))continue;
      // Grid centres alone can lie clear while the straight diagonal
      // between them clips a door-frame corner. Sample the actual travel
      // segment before accepting a nav edge; motor collision uses the
      // same solid-world clearance policy.
      const atPoint=cellPoint(at.col,at.row);
      if(!sweepPassable(atPoint,p,canStand))continue;
      if(dx!==0&&dy!==0&&
        (!canStand(cellPoint(at.col+dx,at.row))||
         !canStand(cellPoint(at.col,at.row+dy))))continue;
      const next=key(col,row),cost=at.g+Math.hypot(dx,dy);
      if(cost>=(best.get(next)??Infinity))continue;
      best.set(next,cost);parents.set(next,k);
      open.push({col,row,g:cost,
        f:cost+Math.hypot(col-goal.col,row-goal.row)});
    }
  }
  if(!reachedKey)return [];
  const path:Pt[]=[];
  let cursor=reachedKey;
  while(cursor!==startKey){
    const [col,row]=cursor.split(',').map(Number);
    path.push(cellPoint(col,row));
    const parent=parents.get(cursor);if(!parent)return [];
    cursor=parent;
  }
  path.reverse();
  if(path.length&&!sweepPassable(from,path[0],canStand))return [];
  // Remove collinear small grid legs; retain all corners.
  const compact:Pt[]=[];
  for(let i=0;i<path.length;i++){
    const a=compact.at(-1)??from,b=path[i],c=path[i+1];
    if(c){
      const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
      if(Math.abs(cross)<1e-6)continue;
    }
    compact.push(b);
  }
  // The final connector is also collision-tested, not just the grid.
  if(!sweepPassable(compact.at(-1)??from,to,canStand))return [];
  // If close enough use the exact requested endpoint.
  if(distance(compact.at(-1)??from,to)>2)compact.push({...to});
  else compact[compact.length-1]={...to};
  return compact;
}
const actor=(id:string,name:string,side:Side,x:number,y:number,
  heading=-Math.PI/2):Operator=>({
  id,name,side,p:{x,y},heading,path:[],health:side==='blue'?2:1,
  shots:0,fireCd:0,aimLock:false,contacted:false,lastSpotted:null,
});
export const newTacticalState=():TacticalState=>({
  phase:'planning',seconds:0,doors:initialDoors(),sparks:[],
  spotted:new Set(),events:['PLAN THE ENTRY'],
  rng:10361,operators:[
    actor('rook','ROOK','blue',282,628,-Math.PI/2),
    actor('moss','MOSS','blue',346,642,-Math.PI/2),
    actor('sentry','SENTRY','red',242,301,Math.PI/2),
    actor('guard','GUARD','red',523,254,Math.PI*.79),
  ],
});
export const own=(s:TacticalState)=>s.operators.filter(a=>a.side==='blue');
export const hostiles=(s:TacticalState)=>s.operators.filter(a=>a.side==='red');
export function queueWaypoint(s:TacticalState,id:string,to:Pt):boolean{
  const a=own(s).find(o=>o.id===id);
  if(!a||a.health<=0||s.phase==='won'||s.phase==='lost')return false;
  const from=a.path.at(-1)??a.p;
  const way=route(from,to);
  if(!way.length)return false;
  a.path.push(...way);a.aimLock=false;return true;
}
export function clearPath(s:TacticalState,id:string){
  const a=own(s).find(o=>o.id===id);
  if(a){a.path=[];a.aimLock=false;}
}
export function setLook(s:TacticalState,id:string,point:Pt):boolean{
  const a=own(s).find(o=>o.id===id);if(!a)return false;
  a.heading=Math.atan2(point.y-a.p.y,point.x-a.p.x);
  a.aimLock=true;return true;
}
export function toggleExecution(s:TacticalState){
  if(s.phase==='planning')s.phase='running';
  else if(s.phase==='running')s.phase='planning';
}
const viewAngle=(a:number,b:number)=>{
  const d=Math.atan2(Math.sin(a-b),Math.cos(a-b));
  return Math.abs(d);
};
export function sees(a:Operator,b:Operator,s:TacticalState){
  if(a.health<=0||b.health<=0||distance(a.p,b.p)>260)return false;
  const angle=Math.atan2(b.p.y-a.p.y,b.p.x-a.p.x);
  return viewAngle(angle,a.heading)<.93&&isClear(a.p,b.p,s.doors);
}
const pickTarget=(a:Operator,s:TacticalState)=>{
  const enemies=s.operators.filter(o=>o.side!==a.side&&sees(a,o,s));
  enemies.sort((b,c)=>distance(a.p,b.p)-distance(a.p,c.p));
  return enemies[0];
};
const roll=(s:TacticalState)=>{
  s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;
  return s.rng/4294967296;
};
function addEvent(s:TacticalState,t:string){
  if(s.events.at(-1)!==t){s.events.push(t);if(s.events.length>5)s.events.shift();}
}
export function step(s:TacticalState,dt:number){
  if(s.phase!=='running')return;
  const h=Math.min(Math.max(0,dt),.08);
  s.seconds+=h;
  for(const spark of s.sparks)spark.age+=h;
  s.sparks=s.sparks.filter(a=>a.age<.20);
  for(const a of s.operators){
    if(a.health<=0)continue;
    a.fireCd=Math.max(0,a.fireCd-h);
    if(a.side==='blue'&&a.path.length){
      const next=a.path[0],dx=next.x-a.p.x,dy=next.y-a.p.y;
      const len=Math.hypot(dx,dy);
      if(len<3){a.path.shift();continue;}
      const stepLen=Math.min(len,74*h);
      const nextPos={x:a.p.x+dx/len*stepLen,y:a.p.y+dy/len*stepLen};
      // Automatic door interaction: movement pauses to open a reachable
      // hinged door. Still physically blocks sight until opened.
      const nearby=s.doors.find(d=>!d.open&&
        distance(doorCenter(d),a.p)<29&&
        distance(doorCenter(d),nextPos)<31);
      if(nearby){
        nearby.open=true;nearby.openedAt=s.seconds;
        addEvent(s,nearby.id+' DOOR OPENED');
      }
      if(passable(nextPos)){
        a.p=nextPos;
        if(!a.aimLock)a.heading=Math.atan2(dy,dx);
      }else{a.path=[];addEvent(s,a.name+' BLOCKED');}
    }
  }
  // An open door gives the enemy in the next room a reason to react:
  // the closest sentry faces the doorway as the sound arrives.
  for(const a of hostiles(s)){
    if(a.health<=0)continue;
    const recent=s.doors.filter(d=>d.open&&
      s.seconds-d.openedAt<1.25&&
      distance(a.p,doorCenter(d))<245);
    if(recent.length&&!a.contacted){
      const to=doorCenter(recent[0]);
      a.heading=Math.atan2(to.y-a.p.y,to.x-a.p.x);
      a.contacted=true;
    }
  }
  for(const a of s.operators){
    if(a.health<=0)continue;
    const t=pickTarget(a,s);
    if(!t)continue;
    if(a.side==='blue'){s.spotted.add(t.id);t.lastSpotted={...t.p};}
    if(a.fireCd>0)continue;
    a.fireCd=a.side==='blue'?.52:.77;
    a.shots++;
    s.sparks.push({p:{...a.p},age:0,side:a.side});
    const chance=a.side==='blue'?.70:.40;
    if(roll(s)<chance){
      t.health--;
      addEvent(s,t.health<=0?t.name+' DOWN':t.name+' HIT');
      if(t.health<=0)t.path=[];
    }else addEvent(s,a.name+' FIRED');
  }
  if(hostiles(s).every(o=>o.health<=0)){
    s.phase='won';addEvent(s,'STATION SECURED');
  }else if(own(s).every(o=>o.health<=0)){
    s.phase='lost';addEvent(s,'TEAM LOST');
  }
}
