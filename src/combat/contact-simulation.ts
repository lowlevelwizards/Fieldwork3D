import type { Obstacle, Point2 } from '../navigation/grid.ts';

export type FighterId = 'rook' | 'mica' | 'patrol-a' | 'patrol-b';
export type Team = 'crew' | 'patrol';
export type Alertness = 'unaware' | 'suspicious' | 'engaged' | 'searching' | 'down';
export type Order = 'follow' | 'hold' | 'cover' | 'withdraw';
export type Fighter = {
  id:FighterId; team:Team; position:Point2; facing:number;
  hp:number; maxHp:number; ammo:number; reserve:number; maxAmmo:number;
  cooldown:number; reload:number; suppressed:number; moving:boolean;
  state:Alertness; lastKnown:Point2|null; memory:number;
};
export type Shot = {
  from:FighterId; at:FighterId|null; start:Point2; end:Point2;
  blocked:boolean; hit:boolean; damage:number; impacts:Point2[];
};
export type ContactEvent =
  | {type:'shot';shot:Shot}
  | {type:'spotted';observer:FighterId;target:FighterId}
  | {type:'down';id:FighterId}
  | {type:'reload';id:FighterId}
  | {type:'heard';observer:FighterId};
export const CREW_WEAPON = {magazine:9,reserve:36,shotInterval:.42,reloadSeconds:1.75,
  range:25,damage:31,optimal:11} as const;
const distance=(a:Point2,b:Point2)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerp=(a:Point2,b:Point2,t:number)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
/** Exact 2D bullet/vision segment vs box or circle, used by BOTH player and AI. */
export function obstruction(a:Point2,b:Point2,objects:readonly Obstacle[],margin=0):Point2|null {
  let first=Infinity;
  const dx=b.x-a.x,dz=b.z-a.z;
  for(const o of objects){
    let t=Infinity;
    if(o.kind==='circle'){
      const r=o.radius+margin,ox=a.x-o.x,oz=a.z-o.z;
      const qa=dx*dx+dz*dz,qb=2*(ox*dx+oz*dz),qc=ox*ox+oz*oz-r*r;
      if(qc<=0){continue;} // shooter stands against cover: ignore initial overlap
      const d=qb*qb-4*qa*qc;
      if(d>=0&&qa>1e-8){const entry=(-qb-Math.sqrt(d))/(2*qa);if(entry>=0&&entry<=1)t=entry;}
    } else {
      const minX=o.x-o.halfX-margin,maxX=o.x+o.halfX+margin;
      const minZ=o.z-o.halfZ-margin,maxZ=o.z+o.halfZ+margin;
      if(a.x>=minX&&a.x<=maxX&&a.z>=minZ&&a.z<=maxZ)continue;
      let enter=0,exit=1,valid=true;
      for(const [q,velocity,low,high] of [[a.x,dx,minX,maxX],[a.z,dz,minZ,maxZ]]){
        if(Math.abs(velocity)<1e-8){if(q<low||q>high){valid=false;break;}}
        else{
          const v1=(low-q)/velocity,v2=(high-q)/velocity;
          enter=Math.max(enter,Math.min(v1,v2));exit=Math.min(exit,Math.max(v1,v2));
          if(enter>exit){valid=false;break;}
        }
      }
      if(valid&&enter>=0&&enter<=1)t=enter;
    }
    if(t<first)first=t;
  }
  return first<Infinity?lerp(a,b,first):null;
}
export function visible(a:Point2,b:Point2,obstacles:readonly Obstacle[]) {
  return obstruction(a,b,obstacles)===null;
}
const make=(id:FighterId,team:Team,pos:Point2):Fighter=>({
 id,team,position:{...pos},facing:team==='patrol'?-2.7:0,
 hp:100,maxHp:100,ammo:CREW_WEAPON.magazine,reserve:CREW_WEAPON.reserve,
 maxAmmo:CREW_WEAPON.magazine,cooldown:0,reload:0,suppressed:0,moving:false,
 state:'unaware',lastKnown:null,memory:0
});
/** Small deterministic tactical kernel, intentionally independent of Three.js.
 * Navigation/animations execute intents, while this model owns perception,
 * real shot obstructions, ammo, damage, suppression and morale. */
export class ContactSimulation {
  readonly fighters:Record<FighterId,Fighter>;
  readonly obstacles:readonly Obstacle[];
  order:Order='follow';
  active=false;
  time=0;
  private rng=214513;
  private report:(event:ContactEvent)=>void;
  constructor(obstacles:readonly Obstacle[],emit:(event:ContactEvent)=>void=()=>{}){
    this.obstacles=obstacles;
    this.report=emit;
    this.fighters={
      rook:make('rook','crew',{x:10.7,z:10.15}),
      mica:make('mica','crew',{x:8.2,z:10.8}),
      'patrol-a':make('patrol-a','patrol',{x:23,z:5}),
      'patrol-b':make('patrol-b','patrol',{x:29,z:7}),
    };
  }
  setPosition(id:FighterId,pos:Point2,facing?:number,moving=false) {
    const f=this.fighters[id];f.position={...pos};f.moving=moving;
    if(facing!==undefined)f.facing=facing;
  }
  reset() {
    this.fighters.rook=make('rook','crew',{x:10.7,z:10.15});
    this.fighters.mica=make('mica','crew',{x:8.2,z:10.8});
    this.fighters['patrol-a']=make('patrol-a','patrol',{x:28,z:11});
    this.fighters['patrol-b']=make('patrol-b','patrol',{x:31,z:8});
    this.order='follow';this.active=false;this.time=0;this.rng=214513;
  }
  revive(helper:FighterId,subject:FighterId):boolean {
    const a=this.fighters[helper],b=this.fighters[subject];
    if(a.team!==b.team||helper===subject||a.hp<=0||b.hp>0||
      distance(a.position,b.position)>2.1)return false;
    for(const threat of Object.values(this.fighters)){
      if(threat.team!==a.team&&threat.hp>0&&
        distance(threat.position,b.position)<10 &&
        visible(threat.position,b.position,this.obstacles))return false;
    }
    b.hp=34;b.suppressed=.45;b.state='searching';b.memory=0;
    return true;
  }
  get crewAlive(){return ['rook','mica'].some(id=>this.fighters[id as FighterId].hp>0);}
  get patrolAlive(){return ['patrol-a','patrol-b'].some(id=>this.fighters[id as FighterId].hp>0);}
  get resolved(){return this.active && (!this.crewAlive||!this.patrolAlive);}
  private random(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
  reload(id:FighterId) {
    const f=this.fighters[id];
    if(f.hp<=0||f.reload>0||f.ammo===f.maxAmmo||f.reserve<=0)return false;
    f.reload=CREW_WEAPON.reloadSeconds;
    f.cooldown=Math.max(f.cooldown,.22);
    return true;
  }
  /** Shot resolves at barrel velocity against the world first; cover cannot be
   * ignored merely because a target is selected from the interface. */
  fire(id:FighterId,target:FighterId):Shot|null{
    const f=this.fighters[id],victim=this.fighters[target];
    if(f.team===victim.team||f.hp<=0||victim.hp<=0||
      f.cooldown>0||f.reload>0)return null;
    if(f.ammo<=0){this.reload(id);return null;}
    f.ammo--;f.cooldown=CREW_WEAPON.shotInterval;
    this.active=true;
    const d=distance(f.position,victim.position);
    const blockedAt=obstruction(f.position,victim.position,this.obstacles);
    const inRange=d<=CREW_WEAPON.range;
    const chance=clamp(.94-Math.max(0,d-CREW_WEAPON.optimal)*.026-
      (f.moving?.14:0)-f.suppressed*.38, .2,.96);
    const hit=!blockedAt && inRange && this.random()<chance;
    const shot:Shot={from:id,at:target,start:{...f.position},end:blockedAt??{...victim.position},
      blocked:Boolean(blockedAt),hit,damage:0,impacts:[]};
    if(hit){
      shot.damage=CREW_WEAPON.damage;
      victim.hp=Math.max(0,victim.hp-shot.damage);
      shot.impacts.push({...victim.position});
      victim.suppressed=clamp(victim.suppressed+.22,0,1);
      victim.lastKnown={...f.position};victim.memory=10;
      victim.state=victim.hp===0?'down':'engaged';
    }else if(blockedAt)shot.impacts.push({...blockedAt});
    else { // Miss rounds still create an atmospheric impact nearby.
      shot.end={x:victim.position.x+(this.random()-.5)*2,z:victim.position.z+(this.random()-.5)*2};
      shot.impacts.push({...shot.end});
      if(inRange&&!blockedAt)victim.suppressed=clamp(victim.suppressed+.06,0,1);
    }
    this.report({type:'shot',shot});
    if(hit&&victim.hp<=0)this.report({type:'down',id:target});
    for(const other of Object.values(this.fighters)){
      if(other.team!==f.team&&other.hp>0&&distance(other.position,f.position)<23){
        other.lastKnown={...f.position};other.memory=10;
        if(other.state==='unaware'){other.state='suspicious';this.report({type:'heard',observer:other.id});}
      }
    }
    return shot;
  }
  update(dt:number){
    const step=clamp(dt,0,.1);this.time+=step;
    for(const f of Object.values(this.fighters)){
      f.cooldown=Math.max(0,f.cooldown-step);
      if(f.reload>0) {
        f.reload=Math.max(0,f.reload-step);
        if(f.reload===0){
          const count=Math.min(f.maxAmmo-f.ammo,f.reserve);
          f.ammo+=count;f.reserve-=count;
          this.report({type:'reload',id:f.id});
        }
      }
      f.suppressed=Math.max(0,f.suppressed-step*.16);
      f.memory=Math.max(0,f.memory-step);
      if(f.hp<=0){f.state='down';continue;}
      if(f.team!=='patrol')continue;
      const options=[this.fighters.rook,this.fighters.mica].filter(x=>x.hp>0);
      for(const target of options){
        const len=distance(f.position,target.position);
        const angle=Math.atan2(target.position.x-f.position.x,target.position.z-f.position.z);
        const difference=Math.abs(Math.atan2(Math.sin(angle-f.facing),Math.cos(angle-f.facing)));
        if(len<17 && (difference<1.25||len<4.2) && visible(f.position,target.position,this.obstacles)){
          const initial=f.state==='unaware'||f.state==='searching';
          f.state='engaged';f.lastKnown={...target.position};f.memory=10;this.active=true;
          if(initial)this.report({type:'spotted',observer:f.id,target:target.id});
          break;
        }
      }
      if(f.state==='engaged'&&f.memory<=0)f.state='searching';
      if(f.state==='suspicious'&&f.memory<=0)f.state='searching';
    }
  }
  nearestEnemy(id:FighterId):FighterId|null{
    const f=this.fighters[id];
    let best:FighterId|null=null,bestDist=Infinity;
    for(const v of Object.values(this.fighters)){
      if(v.team===f.team||v.hp===0)continue;
      const d=distance(f.position,v.position);
      if(d<bestDist){best=v.id;bestDist=d;}
    }
    return best;
  }
}
