/** Curated AR/AK relaxed low-ready game-art fit, never a ballistic change. */
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {Anchor3} from './breach-anatomy.ts';
export type LowReadyFamilyFit={
 stockBack:number;stockIn:number;supportBack:number;supportDown:number;
 minSupportX:number;carryYaw:number;torsoTurn:number;
 elbowForward:number;elbowDown:number;elbowOutboard:number;
};
const AR:Readonly<LowReadyFamilyFit>={
 stockBack:.72,stockIn:.18,supportBack:2.15,supportDown:.90,
 minSupportX:4.8,carryYaw:.075,torsoTurn:-.045,
 elbowForward:9.1,elbowDown:-2.15,elbowOutboard:9.5
};
const HK:Readonly<LowReadyFamilyFit>={
 stockBack:.78,stockIn:.20,supportBack:2.7,supportDown:.95,
 minSupportX:4.20,carryYaw:.095,torsoTurn:-.055,
 elbowForward:9.0,elbowDown:-2.52,elbowOutboard:9.65
};
const HK_COMPACT:Readonly<LowReadyFamilyFit>={
 stockBack:.62,stockIn:.17,supportBack:1.65,supportDown:.70,
 minSupportX:3.65,carryYaw:.075,torsoTurn:-.045,
 elbowForward:8.6,elbowDown:-2.20,elbowOutboard:9.5
};
const HK_SMG:Readonly<LowReadyFamilyFit>={
 stockBack:.55,stockIn:.18,supportBack:.70,supportDown:.48,
 minSupportX:3.55,carryYaw:.075,torsoTurn:-.035,
 elbowForward:8.4,elbowDown:-2.10,elbowOutboard:9.25
};
const HK_SMG_K:Readonly<LowReadyFamilyFit>={
 stockBack:0,stockIn:0,supportBack:.20,supportDown:.22,
 minSupportX:3.80,carryYaw:.065,torsoTurn:-.025,
 elbowForward:7.6,elbowDown:-1.85,elbowOutboard:9.00
};
const AK:Readonly<LowReadyFamilyFit>={
 stockBack:.92,stockIn:.22,supportBack:3.40,supportDown:1.10,
 minSupportX:4.35,carryYaw:.115,torsoTurn:-.065,
 elbowForward:9.0,elbowDown:-2.85,elbowOutboard:10.1
};
export function lowReadyFamilyFit(
 configuration?:WeaponConfiguration):Readonly<LowReadyFamilyFit>|null{
 const family=configuration?.build?.family;
 return family==='ar'?AR:family==='ak'?AK:family==='hk'?
  (configuration?.build?.parts.receiver==='hk-mp5k-stockless'&&
   configuration.build.parts.stock==='hk-mp5k-cap'?HK_SMG_K:
   configuration?.weapon==='smg'?HK_SMG:
   configuration?.build?.parts.barrel==='hk53-short'?HK_COMPACT:HK):null;
}
/** Seat the stock farther back and slightly inboard into the shoulder pad. */
export function lowReadyPocket(pocket:Anchor3,fit:LowReadyFamilyFit|null,
 weight:number):Anchor3{
 if(!fit||weight<=0)return pocket;
 const w=Math.min(1,Math.max(0,weight));
 return {x:pocket.x-fit.stockBack*w,y:pocket.y,
  z:pocket.z-fit.stockIn*w};
}
/** Support elbow direction relative to its shoulder, with two alternatives. */
export function lowReadyElbowPole(shoulder:Anchor3,fit:LowReadyFamilyFit,
 variant:0|1=0):Anchor3{
 const x=fit.elbowForward+(variant===1?.75:0);
 const y=fit.elbowDown-(variant===1?1.3:0);
 const z=-(fit.elbowOutboard+(variant===1?1.45:0));
 return {x:x-shoulder.x,y:y-shoulder.y,z:z-shoulder.z};
}
