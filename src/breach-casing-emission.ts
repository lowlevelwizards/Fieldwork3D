/** V20 shared presentation-only commit for confirmed shots and suppression. */
import type {Session,TeamActor} from './breach-game.ts';
import type {MuzzleSample} from './breach-muzzle.ts';
import type {GlockAppearanceId} from './weapons/geometry/glock-family-silhouettes.ts';
import {CASING_LIMIT,casingAt,type EjectedCasing} from './breach-effects.ts';
import {casingLanding,planCasingFlight,type CasingTrace} from './breach-casing-trajectory.ts';
import {segmentImpact} from './breach-ballistic-resolution.ts';
import {doorLeafSegment} from './breach-core.ts';
import {coverImpactFraction,coverHeight} from './breach-cover-height.ts';
import {windowPaneSegment} from './breach-windows.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
export function emitSpentCasing(s:Session,a:TeamActor,id:number,muzzle:MuzzleSample,
 secondaryWeapon?:GlockAppearanceId,options?:{at?:number;visualScale?:number;friction?:number}):EjectedCasing{
 // The fallback is a receiver-based body anchor for historical/custom
 // callers, not an offset behind the barrel tip.
 const yaw=muzzle.yaw;
 const origin=muzzle.ejection??{x:a.p.x+Math.cos(yaw)*6-Math.sin(yaw)*2,
  z:a.p.y+Math.sin(yaw)*6+Math.cos(yaw)*2,y:muzzle.y};
 const at=options?.at??s.seconds;
 const world=sessionWorldGeometry(s);
 const floor=(secondaryWeapon||a.weapon==='smg'?.46:a.weapon==='shotgun'?.77:.54)*
  (options?.visualScale??1);
 const trace:CasingTrace=(from,to)=>{
  const span=Math.hypot(to.x-from.x,to.z-from.z);
  if(span<.0001)return 1;
  const p={x:from.x,y:from.z},q={x:to.x,y:to.z};
  let nearest=1;
  const height=(t:number)=>from.y+(to.y-from.y)*t;
  const accept=(t:number|null)=>{if(t!==null&&t>=0&&t<nearest)nearest=t;};
  const center={x:(p.x+q.x)*.5,y:(p.y+q.y)*.5};
  world.someWallNearPoint(center,span*.5+2,wall=>{
   const t=segmentImpact(p,q,wall);
   if(t!==null&&height(t)<=56)accept(t);
   return false;
  });
  world.someCoverAlongRay(p,q,box=>{
   if(!box.destroyed&&coverHeight(box)>0)
    accept(coverImpactFraction(p,q,from.y,to.y,box));
   return false;
  });
  for(const d of s.doors){
   const t=segmentImpact(p,q,doorLeafSegment(d));
   if(t!==null&&height(t)<=39)accept(t);
  }
  for(const w of s.windows){
   if(w.open||w.shattered)continue;
   const t=segmentImpact(p,q,windowPaneSegment(w));
   if(t!==null&&height(t)>=(w.sillHeight??14)&&height(t)<=(w.headHeight??32))accept(t);
  }
  return nearest<1?Math.max(0,nearest-.75/span):1;
 };
 const support=(p:{x:number;y:number;z:number})=>{
  let h=floor;
  world.someCoverNearPoint({x:p.x,y:p.z},0,box=>{
   if(!box.destroyed&&Math.abs(p.x-box.x)<box.w/2&&Math.abs(p.z-box.y)<box.h/2){
    const top=coverHeight(box)+floor;
    if(top<=p.y+1.25)h=Math.max(h,top);
   }
   return false;
  });
  return h;
 };
 const occupied=s.casings.map(c=>c.flight?casingLanding(c.flight):casingAt(c,c.at+3));
 const flight=planCasingFlight(id,origin,yaw,trace,occupied,floor,options?.friction,support);
 const casing:EjectedCasing={id,at,weapon:secondaryWeapon?'smg':a.weapon,
  ...(secondaryWeapon?{secondaryWeapon}:{}),side:a.side,...origin,heading:yaw,flight,
  ...(options?.visualScale!==undefined?{visualScale:options.visualScale}:{})};
 s.casings.push(casing);
 if(s.casings.length>CASING_LIMIT)s.casings.shift();
 return casing;
}
