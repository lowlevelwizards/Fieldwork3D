import { terrainHeight,cellIndexAt } from './terrain-model.ts';
import { slopeAt } from './traffic-model.ts';
import { concealmentAt,type Plant } from './vegetation-model.ts';
import type { TerrainWater } from './hydrology.ts';

export type Faction='contractors'|'wardens';
export type Posture='advance'|'hold';
export type Actor={id:number;name:string;faction:Faction;x:number;z:number;
  health:number;maxHealth:number;destination:{x:number;z:number}|null;
  path:{x:number;z:number}[];cooldown:number;shots:number;
  alert:number;lastSeen:{x:number;z:number}|null;posture:Posture;
  patrol:number;};
export type Rect={x:number;z:number;w:number;d:number;name:string;blocksSight:boolean};
export type Operation={
  actors:Actor[];elapsed:number;intel:{x:number;z:number};
  extraction:{x:number;z:number};carrier:number|null;
  phase:'collect'|'extract'|'won'|'lost';events:string[];
  selected:number|null;};
export const STRUCTURES:readonly Rect[]=[
  {x:.8,z:-.7,w:1.50,d:1.30,name:'Weather Station',blocksSight:true},
  {x:2.8,z:1.25,w:1.35,d:1.35,name:'Relay Shed',blocksSight:true},
  {x:-1.25,z:-.30,w:.85,d:.22,name:'Low Barrier',blocksSight:true},
  {x:1.30,z:2.15,w:.80,d:.22,name:'Crate Wall',blocksSight:true},
];
export const OBJECTIVE={x:1.15,z:-2.02};
export const EXTRACTION={x:-4.05,z:3.35};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export function pointBlocked(x:number,z:number,radius=.13):boolean{
  if(Math.abs(x)>4.8||Math.abs(z)>4.8)return true;
  return STRUCTURES.some(r=>Math.abs(x-r.x)<r.w/2+radius&&
    Math.abs(z-r.z)<r.d/2+radius);
}
/** Segment-vs-AABB raycasting provides genuine building LOS occlusion. */
export function clearSight(a:{x:number;z:number},b:{x:number;z:number}):boolean{
  for(const r of STRUCTURES.filter(r=>r.blocksSight)){
    const dx=b.x-a.x,dz=b.z-a.z;
    let t0=0,t1=1;
    for(const [origin,delta,min,max] of [
      [a.x,dx,r.x-r.w/2,r.x+r.w/2],
      [a.z,dz,r.z-r.d/2,r.z+r.d/2],
    ]){
      if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return false;continue;}
      let lo=(min-origin)/delta,hi=(max-origin)/delta;
      if(lo>hi)[lo,hi]=[hi,lo];
      t0=Math.max(t0,lo);t1=Math.min(t1,hi);
    }
    if(t0<=t1&&t0<.995&&t1>.005)return false;
  }
  return true;
}
const STEP=.28;
const N=Math.ceil(9.6/STEP);
function gridPos(k:number):{x:number;z:number}{
  const c=k%N,r=Math.floor(k/N);
  return {x:-4.8+(c+.5)*STEP,z:-4.8+(r+.5)*STEP};
}
function gridIndex(x:number,z:number):number{
  const col=clamp(Math.floor((x+4.8)/STEP),0,N-1);
  const row=clamp(Math.floor((z+4.8)/STEP),0,N-1);
  return row*N+col;
}
/** Bounded A* routes around structures and impassable mud. Used for allies
 * and AI alike, not straight-line movement through the building geometry.
 */
export function route(start:{x:number;z:number},goal:{x:number;z:number},
  water?:TerrainWater):{x:number;z:number}[]{
  const origin=gridIndex(start.x,start.z);
  const target=gridIndex(goal.x,goal.z);
  const passable=(k:number)=>{
    const p=gridPos(k);
    if(pointBlocked(p.x,p.z,.12))return false;
    if(water && water.waterDepthAtCell(cellIndexAt(p.x,p.z))>.37)return false;
    return true;
  };
  if(!passable(target))return [];
  const dist=new Float64Array(N*N).fill(Infinity),f=new Float64Array(N*N).fill(Infinity);
  const parent=new Int32Array(N*N).fill(-1);
  const closed=new Uint8Array(N*N);
  dist[origin]=0;f[origin]=distance(gridPos(origin),gridPos(target));
  for(let cycle=0;cycle<N*N;cycle++){
    let at=-1;
    for(let i=0;i<f.length;i++)
      if(!closed[i]&&(at<0||f[i]<f[at]))at=i;
    if(at<0||!Number.isFinite(f[at]))break;
    if(at===target)break;
    closed[at]=1;
    const row=Math.floor(at/N),col=at%N;
    for(const [dr,dc] of [[0,1],[1,0],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const rr=row+dr,cc=col+dc;
      if(rr<0||rr>=N||cc<0||cc>=N)continue;
      const next=rr*N+cc;
      if(closed[next]||!passable(next))continue;
      if(dr!==0&&dc!==0&&(!passable(row*N+cc)||!passable(rr*N+col)))continue;
      const p=gridPos(next),cell=water?cellIndexAt(p.x,p.z):-1;
      const mud=water?water.soilFraction(cell):.35;
      const penalty=1+.5*mud+clamp(slopeAt(p.x,p.z)/35,0,1)*.7;
      const cost=dist[at]+Math.hypot(dr,dc)*STEP*penalty;
      if(cost>=dist[next])continue;
      dist[next]=cost;parent[next]=at;
      f[next]=cost+distance(p,gridPos(target));
    }
  }
  if(target!==origin && parent[target]<0)return [];
  const output:{x:number;z:number}[]=[];
  let cursor=target;
  for(let i=0;i<N*N&&cursor!==origin;i++){
    output.unshift(gridPos(cursor));
    cursor=parent[cursor];
    if(cursor<0)return [];
  }
  if(!pointBlocked(goal.x,goal.z))output.push({x:goal.x,z:goal.z});
  return output;
}
function actor(id:number,name:string,faction:Faction,x:number,z:number):Actor{
  return {id,name,faction,x,z,health:3,maxHealth:3,destination:null,
    path:[],cooldown:0,shots:0,alert:0,lastSeen:null,posture:'hold',patrol:0};
}
export function newOperation():Operation{
  return {actors:[
    actor(1,'Lead','contractors',-3.95,3.2),
    actor(2,'Scout','contractors',-4.25,2.8),
    actor(3,'Support','contractors',-3.5,3.56),
    actor(4,'Sentry','wardens',2.1,-2.5),
    actor(5,'Watch','wardens',3.4,.15),
    actor(6,'Guard','wardens',.1,-3.55),
  ],elapsed:0,intel:{...OBJECTIVE},extraction:{...EXTRACTION},
    carrier:null,phase:'collect',events:['Reach the weather station, secure the field logs, and extract.'],
    selected:null};
}
function message(world:Operation,event:string){
  if(world.events.at(-1)!==event)world.events.push(event);
  if(world.events.length>8)world.events.shift();
}
export function orderMove(world:Operation,id:number|null,
  goal:{x:number;z:number},water?:TerrainWater):boolean{
  if(world.phase==='won'||world.phase==='lost')return false;
  const selected=world.actors.filter(a=>a.faction==='contractors'&&a.health>0&&
    (id===null||a.id===id));
  let issued=0;
  for(const [i,a] of selected.entries()){
    const offset=id===null?{x:(i%2)*.25-.125,z:Math.floor(i/2)*.24}: {x:0,z:0};
    const p={x:clamp(goal.x+offset.x,-4.6,4.6),
      z:clamp(goal.z+offset.z,-4.6,4.6)};
    const path=route(a,p,water);
    if(!path.length)continue;
    a.path=path;a.destination=p;a.posture='advance';issued++;
  }
  if(!issued)message(world,'No safe route to that point.');
  return issued>0;
}
export function setPosture(world:Operation,id:number|null,posture:Posture):void{
  for(const a of world.actors.filter(a=>a.faction==='contractors'&&a.health>0&&
    (id===null||a.id===id))){
    a.posture=posture;
    if(posture==='hold'){a.path=[];a.destination=null;}
  }
}
function move(a:Actor,dt:number,water?:TerrainWater):void{
  if(a.path.length===0||a.health<=0)return;
  const p=a.path[0],d=distance(a,p);
  if(d<.08){a.path.shift();if(!a.path.length)a.destination=null;return;}
  const cell=water?cellIndexAt(a.x,a.z):-1;
  const wet=water?water.soilFraction(cell):.38;
  const depth=water?water.waterDepthAtCell(cell):0;
  const groundPenalty=clamp(1-wet*.31-depth*1.4,.28,1);
  const amount=Math.min(d,dt*.72*groundPenalty);
  const x=a.x+(p.x-a.x)/d*amount,z=a.z+(p.z-a.z)/d*amount;
  if(!pointBlocked(x,z)){a.x=x;a.z=z;}
  else{a.path=[];a.destination=null;}
}
function observed(observer:Actor,target:Actor,plants:readonly Plant[]):boolean{
  const d=distance(observer,target);
  const foliage=concealmentAt(target.x,target.z,plants,.25);
  const range=3.7*(1-.65*foliage);
  return d<range&&clearSight(observer,target);
}
const patrols=[
  [{x:2.15,z:-2.5},{x:3.45,z:-2.0}],
  [{x:3.40,z:.15},{x:2.50,z:2.50}],
  [{x:.10,z:-3.55},{x:-1.35,z:-2.60}],
];
/** Small reactive opposition: patrol, observe, share contact locally, pursue
 * last-seen positions, fire only along an unobstructed line. These are
 * bounded tactics, not a claim of advanced squad strategy.
 */
export function stepOperation(world:Operation,dt:number,plants:readonly Plant[],
  water?:TerrainWater):void{
  if(world.phase==='won'||world.phase==='lost')return;
  const seconds=clamp(dt,0,.1);world.elapsed+=seconds;
  const blues=world.actors.filter(a=>a.faction==='contractors'&&a.health>0);
  const reds=world.actors.filter(a=>a.faction==='wardens'&&a.health>0);
  for(const a of world.actors){a.cooldown=Math.max(0,a.cooldown-seconds);
    a.alert=Math.max(0,a.alert-seconds);}
  for(const enemy of reds){
    const seen=blues.filter(b=>observed(enemy,b,plants))
      .sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];
    if(seen){
      enemy.lastSeen={x:seen.x,z:seen.z};enemy.alert=7;
      for(const ally of reds){
        if(distance(enemy,ally)<2.6){ally.lastSeen={x:seen.x,z:seen.z};ally.alert=Math.max(ally.alert,4);}
      }
    }
    if(enemy.alert>0&&enemy.lastSeen){
      if(distance(enemy,enemy.lastSeen)>1.5&&(!enemy.destination||
        distance(enemy.destination,enemy.lastSeen)>.45)){
        enemy.path=route(enemy,enemy.lastSeen,water);
        enemy.destination={...enemy.lastSeen};
      }
    }else if(!enemy.path.length){
      const stops=patrols[enemy.id-4];
      if(stops){
        enemy.patrol=(enemy.patrol+1)%2;
        enemy.path=route(enemy,stops[enemy.patrol],water);
      }
    }
  }
  for(const a of world.actors)move(a,seconds,water);
  // Auto-fire for now. Buildings hard-block sight; foliage reduces
  // observation and outgoing hit probability instead of being cosmetic.
  for(const a of world.actors){
    if(a.health<=0||a.cooldown>0)continue;
    const enemies=world.actors.filter(b=>b.health>0&&b.faction!==a.faction)
      .filter(b=>distance(a,b)<2.6&&clearSight(a,b));
    if(a.faction==='wardens'){
      const spotted=enemies.filter(b=>observed(a,b,plants)||a.alert>0);
      if(!spotted.length)continue;
    }
    const target=enemies.sort((b,c)=>distance(a,b)-distance(a,c))[0];
    if(!target)continue;
    a.cooldown=a.faction==='wardens'?1.7:1.35;
    a.shots++;
    const cover=concealmentAt(target.x,target.z,plants,.18);
    const hit=(Math.sin(a.id*41+target.id*17+a.shots*23)*.5+.5)<
      (.82-.48*cover);
    if(hit){
      target.health=Math.max(0,target.health-1);
      if(target.health===0){
        message(world,target.name+' is down.');
        if(world.carrier===target.id){
          world.intel={x:target.x,z:target.z};
          world.carrier=null;world.phase='collect';
          message(world,'Field logs dropped. Recover them.');
        }
      }
    }
    if(a.faction==='contractors'){
      for(const enemy of reds)if(distance(a,enemy)<3.4){
        enemy.lastSeen={x:a.x,z:a.z};enemy.alert=Math.max(enemy.alert,4.5);
      }
    }
  }
  if(world.phase==='collect'){
    const picker=blues.find(a=>distance(a,world.intel)<.37);
    if(picker){
      world.carrier=picker.id;world.phase='extract';
      message(world,picker.name+' secured the field logs. Reach extraction.');
    }
  }
  if(world.phase==='extract'){
    const carrier=blues.find(a=>a.id===world.carrier);
    if(carrier&&distance(carrier,world.extraction)<.55){
      world.phase='won';message(world,'Operation complete. Logs extracted.');
    }
  }
  if(!blues.some(a=>a.health>0)){
    world.phase='lost';message(world,'Team lost. Operation failed.');
  }
}
