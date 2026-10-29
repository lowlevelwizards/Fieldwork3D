import {queryTravel,terrainSightClear,standingHeightAt,
  SITE_CENTER,roadCenterX} from './regional-physical.ts';
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export type Allegiance='player'|'northline'|'commune';
export type ActorTask='idle'|'move'|'hold'|'guard'|'investigate'|'engage';
export type GroundedActor={
  id:string;name:string;team:Allegiance;role:string;
  x:number;z:number;y:number;heading:number;
  vx:number;vz:number;height:number;radius:number;
  health:number;maxHealth:number;speed:number;grounded:boolean;
  task:ActorTask;destination:{x:number;z:number}|null;
  path:{x:number;z:number}[];
  contact:{x:number;z:number;seenAt:number}|null;
  shotCooldown:number;shots:number;hits:number;
};
export function spawnActor(id:string,name:string,team:Allegiance,
  x:number,z:number):GroundedActor{
  return {id,name,team,role:'rifleman',x,z,y:standingHeightAt(x,z),
    heading:0,vx:0,vz:0,height:1.75,radius:.27,
    health:3,maxHealth:3,speed:team==='player'?3.2:1.45,grounded:true,
    task:'idle',destination:null,path:[],contact:null,
    shotCooldown:0,shots:0,hits:0};
}
export type Vector2={x:number;z:number};
const distance=(a:Vector2,b:Vector2)=>Math.hypot(a.x-b.x,a.z-b.z);
const grid=3.25;
/** Small bounded local A*, not a path query for an entire 1km region.
 * Long journeys are coarse waypoints and replanned by the caller. */
export function findLocalRoute(from:Vector2,to:Vector2,
  maxTiles=38):Vector2[]{
  if(distance(from,to)<.25)return [];
  const dst=distance(from,to);
  if(dst>grid*maxTiles*.65){
    const fraction=Math.min(.70,grid*maxTiles*.55/dst);
    to={x:from.x+(to.x-from.x)*fraction,
      z:from.z+(to.z-from.z)*fraction};
  }
  const origin={x:Math.floor(from.x/grid),z:Math.floor(from.z/grid)};
  const finish={x:Math.floor(to.x/grid),z:Math.floor(to.z/grid)};
  const key=(x:number,z:number)=>x+','+z;
  const start=key(origin.x,origin.z);
  const goals=new Set<string>([key(finish.x,finish.z)]);
  const open=[{x:origin.x,z:origin.z,g:0,
    h:Math.hypot(origin.x-finish.x,origin.z-finish.z)}];
  const best=new Map<string,number>([[start,0]]);
  const came=new Map<string,string>();
  let found:string|null=null;
  let examined=0;
  while(open.length&&examined++<maxTiles*maxTiles*3){
    open.sort((a,b)=>(a.g+a.h)-(b.g+b.h));
    const node=open.shift()!,at=key(node.x,node.z);
    if(node.g>(best.get(at)??Infinity)+.0001)continue;
    if(goals.has(at)){found=at;break;}
    for(const [ox,oz] of [[0,1],[1,0],[0,-1],[-1,0],
      [-1,-1],[1,1],[-1,1],[1,-1]]){
      const x=node.x+ox,z=node.z+oz;
      if(Math.abs(x-origin.x)>maxTiles||Math.abs(z-origin.z)>maxTiles)continue;
      const px=(x+.5)*grid,pz=(z+.5)*grid;
      const travel=queryTravel(px,pz);
      if(!travel.passable)continue;
      const diagonal=ox!==0&&oz!==0;
      if(diagonal&&(!queryTravel((x-ox+.5)*grid,pz).passable||
        !queryTravel(px,(z-oz+.5)*grid).passable))continue;
      const cost=Math.hypot(ox,oz)/travel.speedMultiplier;
      const tentative=node.g+cost;
      const dest=key(x,z);
      if(tentative>=(best.get(dest)??Infinity))continue;
      best.set(dest,tentative);came.set(dest,at);
      open.push({x,z,g:tentative,
        h:Math.hypot(x-finish.x,z-finish.z)});
    }
  }
  if(!found)return [];
  const path:Vector2[]=[];
  for(let k=found;k!==start;){
    const [x,z]=k.split(',').map(Number);
    path.push({x:(x+.5)*grid,z:(z+.5)*grid});
    const previous=came.get(k);
    if(!previous)break;k=previous;
  }
  path.reverse();
  if(distance(to,path.at(-1)??from)<grid*2&&queryTravel(to.x,to.z).passable)
    path.push(to);
  return path;
}
export function assignDestination(actor:GroundedActor,to:Vector2):boolean{
  if(!queryTravel(to.x,to.z).passable)return false;
  actor.destination={...to};
  actor.path=findLocalRoute(actor,to);
  // For unconstrained nearby terrain, allow precise movement.
  if(!actor.path.length&&distance(actor,to)<12)actor.path=[{...to}];
  actor.task='move';
  return !!actor.path.length;
}
export function holdActor(actor:GroundedActor):void{
  actor.destination=null;actor.path=[];actor.task='hold';
  actor.vx=0;actor.vz=0;
}
/** A single motor is shared by player and all NPCs. The input is an
 * optional world-space movement vector; if omitted follow a queued order. */
export function stepActor(actor:GroundedActor,dt:number,
  direct:Vector2|null=null):void{
  if(actor.health<=0)return;
  const h=Math.min(.08,Math.max(0,dt));
  actor.shotCooldown=Math.max(0,actor.shotCooldown-h);
  let desiredX=0,desiredZ=0;
  if(direct){
    const length=Math.hypot(direct.x,direct.z);
    if(length>.02){desiredX=direct.x/Math.max(1,length);
      desiredZ=direct.z/Math.max(1,length);}
  }else{
    const next=actor.path[0];
    if(next){
      const dx=next.x-actor.x,dz=next.z-actor.z;
      const dist=Math.hypot(dx,dz);
      if(dist<.34)actor.path.shift();
      else{desiredX=dx/dist;desiredZ=dz/dist;}
    }
    if(!actor.path.length&&actor.destination&&
      distance(actor,actor.destination)>2.8){
      actor.path=findLocalRoute(actor,actor.destination);
    }
  }
  const oldTravel=queryTravel(actor.x,actor.z);
  const moveSpeed=actor.speed*oldTravel.speedMultiplier;
  const damping=1-Math.exp(-8*h);
  actor.vx+=(desiredX*moveSpeed-actor.vx)*damping;
  actor.vz+=(desiredZ*moveSpeed-actor.vz)*damping;
  const nextX=actor.x+actor.vx*h,nextZ=actor.z+actor.vz*h;
  const p=queryTravel(nextX,nextZ);
  if(p.passable){
    actor.x=nextX;actor.z=nextZ;
  }else{
    // Slide independently against obstacles; no flying or tunneling.
    if(queryTravel(nextX,actor.z).passable)actor.x=nextX;
    else actor.vx=0;
    if(queryTravel(actor.x,nextZ).passable)actor.z=nextZ;
    else actor.vz=0;
  }
  actor.y=standingHeightAt(actor.x,actor.z);
  actor.grounded=true;
  const moving=Math.hypot(actor.vx,actor.vz)>.09;
  if(moving){
    const direction=Math.atan2(actor.vx,actor.vz);
    const d=Math.atan2(Math.sin(direction-actor.heading),
      Math.cos(direction-actor.heading));
    actor.heading+=clamp(d,-h*5,h*5);
  }
  if(!direct&&actor.destination&&distance(actor,actor.destination)<.48){
    actor.path=[];actor.destination=null;
    if(actor.task==='move')actor.task='idle';
  }
}
/** Same ground and building visibility rules for player and opponents. */
export function canSee(observer:GroundedActor,target:GroundedActor,
  range=60):boolean{
  if(observer.health<=0||target.health<=0)return false;
  if(distance(observer,target)>range)return false;
  const a={x:observer.x,y:observer.y+1.58,z:observer.z};
  const b={x:target.x,y:target.y+1.22,z:target.z};
  return terrainSightClear(a,b);
}
export function shootAt(actor:GroundedActor,target:GroundedActor,
  distanceLimit=75):boolean{
  if(actor.shotCooldown>0||!canSee(actor,target,distanceLimit))return false;
  actor.shotCooldown=.68;actor.shots++;
  actor.heading=Math.atan2(target.x-actor.x,target.z-actor.z);
  target.health=Math.max(0,target.health-1);actor.hits++;
  return true;
}
/** The initial tactical sandbox deliberately has very few entities. */
export function spawnCutwoodsActors():GroundedActor[]{
  return [
    spawnActor('player','Operator','player',roadCenterX(158)-60,158),
    spawnActor('north-lead','Northline Lead','northline',SITE_CENTER.x+14,SITE_CENTER.z+35),
    spawnActor('north-scout','Northline Scout','northline',SITE_CENTER.x+18,SITE_CENTER.z+24),
    spawnActor('commune-sentry','Commune Sentry','commune',SITE_CENTER.x-15,SITE_CENTER.z+5),
  ];
}
