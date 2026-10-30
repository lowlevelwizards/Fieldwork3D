/** 118: authoritative planar muzzle solution. No frame-rate dependence:
 * all random spread uses the Session's seeded RNG. The renderer follows. */
import type {WeaponId} from './breach-combat.ts';
import type {Pt} from './breach-core.ts';
export type FiringMode='point'|'ads';
export type BallisticProfile={pointSpread:number;adsSpread:number;
  recoilKick:number;recover:number;turnSpeed:number};
export const BALLISTICS:Record<WeaponId,BallisticProfile>={
  carbine:{pointSpread:.12,adsSpread:.046,recoilKick:.039,
    recover:.27,turnSpeed:6.4},
  smg:{pointSpread:.155,adsSpread:.070,recoilKick:.048,
    recover:.35,turnSpeed:8.2},
  rifle:{pointSpread:.13,adsSpread:.026,recoilKick:.066,
    recover:.23,turnSpeed:5.7},
  shotgun:{pointSpread:.16,adsSpread:.072,recoilKick:.087,
    recover:.20,turnSpeed:6.1}
};
export const angleDelta=(from:number,to:number)=>
  Math.atan2(Math.sin(to-from),Math.cos(to-from));
export const approachAngle=(from:number,to:number,maxDelta:number)=>
  from+Math.max(-maxDelta,Math.min(maxDelta,angleDelta(from,to)));
export const clamp01=(x:number)=>Math.max(0,Math.min(1,x));
export function readyMode(range:number,aim:number,
  weapon:WeaponId):FiringMode|null{
  const near=weapon==='shotgun'?86:weapon==='smg'?100:74;
  if(range<=near&&aim>=.34)return 'point';
  if(aim>=.91)return 'ads';
  return null;
}
export function dispersion(id:WeaponId,mode:FiringMode,
  stability:number,moving:boolean,suppression:number,injury:number,
  recoil:number):number{
  const profile=BALLISTICS[id];
  const base=mode==='ads'?profile.adsSpread:profile.pointSpread;
  return base*(1+(.9-clamp01(stability))*.9+
    (moving?.48:0)+suppression*.85+injury*.27)+recoil*.45;
}
export function shotYaw(alignment:number,spread:number,
  sampleA:number,sampleB:number):number{
  return alignment+(sampleA-sampleB)*spread;
}
export function rayHitsActor(from:Pt,yaw:number,target:Pt,radius:number){
  const dx=target.x-from.x,dy=target.y-from.y;
  const along=dx*Math.cos(yaw)+dy*Math.sin(yaw);
  const across=Math.abs(dx*Math.sin(yaw)-dy*Math.cos(yaw));
  return along>0&&across<=radius;
}
export const muzzleEndpoint=(from:Pt,yaw:number,length:number):Pt=>({
  x:from.x+Math.cos(yaw)*length,y:from.y+Math.sin(yaw)*length});
export function recoverWeapon(recoil:number,stability:number,
  dt:number,profile:BallisticProfile,moving:boolean):{recoil:number;stability:number}{
  const next=Math.max(0,recoil-dt*profile.recover);
  return {recoil:next,stability:clamp01(stability+
    dt*(moving?-.65:.62)*(1-next*.50))};
}
