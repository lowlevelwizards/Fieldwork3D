/** E5-B5b actual projectile/body intersection. Never use this to
 * acquire a target or discover civilians before a shot is released.
 * Ordered nearest along-ray hit takes precedence over farther actors. */
import type {Pt} from './breach-core.ts';
import type {CivilianActor} from './breach-civilian-types.ts';
export type CivilianRayHit={actor:CivilianActor;along:number};
export function firstCivilianAlongRay(from:Pt,yaw:number,maxRange:number,
  civilians:readonly CivilianActor[]):CivilianRayHit|null{
 if(!Number.isFinite(maxRange)||maxRange<=0)return null;
 const ux=Math.cos(yaw),uy=Math.sin(yaw);
 let nearest:CivilianRayHit|null=null;
 for(const actor of civilians){
  if(actor.health<=0)continue;
  const dx=actor.p.x-from.x,dy=actor.p.y-from.y;
  const proj=dx*ux+dy*uy;
  const cross=Math.abs(dx*uy-dy*ux);
  const radius=Math.max(4,Math.min(14,actor.radius));
  if(cross>=radius||proj+radius<=0)continue;
  const chord=Math.sqrt(radius*radius-cross*cross);
  const along=Math.max(0,proj-chord);
  if(along>maxRange||nearest&&nearest.along<=along)continue;
  nearest={actor,along};
 }
 return nearest;
}
export function applyCivilianBulletHit(actor:CivilianActor,now:number):{
 before:number;after:number;down:boolean}{
 const before=actor.health;
 if(before<=0)return {before,after:before,down:true};
 actor.health=Math.max(0,before-1);
 actor.injuryStage=actor.health<=0?3:1;
 actor.state=actor.health<=0?'incapacitated':'wounded';
 actor.stateSince=now;actor.lastHitAt=now;
 actor.goal=null;actor.nav=[];actor.velocity=0;
 return {before,after:actor.health,down:actor.health<=0};
}
