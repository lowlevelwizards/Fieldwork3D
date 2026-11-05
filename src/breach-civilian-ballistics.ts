/** E5-B5b actual projectile/body intersection. Never use this to
 * acquire a target or discover civilians before a shot is released.
 * Ordered nearest along-ray hit takes precedence over farther actors. */
import type {Pt} from './breach-core.ts';
import {setCivilianState,type CivilianActor} from './breach-civilian-types.ts';
export type CivilianRayHit={actor:CivilianActor;along:number};
export type RayHeightProfile={
 muzzleHeight:number;farHeight:number;farDistance:number;
};
/** Standing and ducking are actually different vertical targets. */
export function civilianBodyHeight(a:CivilianActor):number{
 if(a.health<=0)return 0;
 return a.state==='hiding'||a.state==='wounded'?22:38;
}

export function firstCivilianAlongRay(from:Pt,yaw:number,maxRange:number,
 civilians:readonly CivilianActor[],height?:RayHeightProfile):CivilianRayHit|null{
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
  const entry=Math.max(0,proj-chord);
  const exit=Math.min(maxRange,proj+chord);
  if(entry>exit)continue;
  let along=entry;
  if(height){
   if(height.farDistance<=0)continue;
   const slope=(height.farHeight-height.muzzleHeight)/height.farDistance;
   const upper=civilianBodyHeight(actor),lower=1;
   const hEntry=height.muzzleHeight+slope*entry;
   const hExit=height.muzzleHeight+slope*exit;
   if(Math.min(hEntry,hExit)>upper||
      Math.max(hEntry,hExit)<lower)continue;
   // A descending ray enters the volume only at its true height limit.
   if(hEntry>upper&&slope<0)
    along=Math.max(entry,(upper-height.muzzleHeight)/slope);
   if(hEntry<lower&&slope>0)
    along=Math.max(entry,(lower-height.muzzleHeight)/slope);
   if(along>exit)continue;
  }
  if(nearest&&nearest.along<=along)continue;
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
 setCivilianState(actor,actor.health<=0?'incapacitated':'wounded',now);
 actor.lastHitAt=now;
 return {before,after:actor.health,down:actor.health<=0};
}
