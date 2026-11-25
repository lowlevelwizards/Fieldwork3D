/** V20 shared presentation-only commit for confirmed shots and suppression. */
import type {Session,TeamActor} from './breach-game.ts';
import type {MuzzleSample} from './breach-muzzle.ts';
import type {GlockAppearanceId} from './weapons/geometry/glock-family-silhouettes.ts';
import {CASING_LIMIT,casingAt,type EjectedCasing} from './breach-effects.ts';
import {casingLanding,planCasingFlight,type CasingTrace} from './breach-casing-trajectory.ts';
import {strikeSurface} from './breach-ballistic-resolution.ts';
export function emitSpentCasing(s:Session,a:TeamActor,id:number,muzzle:MuzzleSample,
 secondaryWeapon?:GlockAppearanceId,options?:{at?:number;visualScale?:number;friction?:number}):EjectedCasing{
 // The fallback is a receiver-based body anchor for historical/custom
 // callers, not an offset behind the barrel tip.
 const yaw=muzzle.yaw;
 const origin=muzzle.ejection??{x:a.p.x+Math.cos(yaw)*6-Math.sin(yaw)*2,
  z:a.p.y+Math.sin(yaw)*6+Math.cos(yaw)*2,y:muzzle.y};
 const at=options?.at??s.seconds;
 const trace:CasingTrace=(from,to)=>{
  const span=Math.hypot(to.x-from.x,to.z-from.z);
  if(span<.0001)return 1;
  const result=strikeSurface({x:from.x,y:from.z},{x:to.x,y:to.z},s,from.y,to.y,0);
  return Math.min(1,Math.hypot(result.end.x-from.x,result.end.y-from.z)/span);
 };
 const occupied=s.casings.map(c=>c.flight?casingLanding(c.flight):casingAt(c,c.at+3));
 const flight=planCasingFlight(id,origin,yaw,trace,occupied,.56,options?.friction);
 const casing:EjectedCasing={id,at,weapon:secondaryWeapon?'smg':a.weapon,
  ...(secondaryWeapon?{secondaryWeapon}:{}),side:a.side,...origin,heading:yaw,flight,
  ...(options?.visualScale!==undefined?{visualScale:options.visualScale}:{})};
 s.casings.push(casing);
 if(s.casings.length>CASING_LIMIT)s.casings.shift();
 return casing;
}
