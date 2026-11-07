/** Small, hand-auditable artistic templates. These define the preferred
 * *relationship* of stock, hands and shoulder, not hard IK joint overrides.
 * Every family still uses its real geometry/contact sockets.
 */
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
export type LowReadyFamily='ar-carbine'|'ar-rifle'|'ak-carbine'|
 'ak-rifle'|'rpk-long'|'hk-rifle'|'hk-carbine'|'hk-smg'|'hk-smg-stockless';
export type LowReadyPass='standard'|'compressed'|'deep';
export type LowReadyArchetype={
 family:LowReadyFamily;
 yaw:number;pitch:number;
 supportFraction:number;
 stock:{x:number;y:number;z:number};
 elbowBias:{firingDrop:number;supportDrop:number};
};
export const LOW_READY_ARCHETYPES:Readonly<Record<
 LowReadyFamily,LowReadyArchetype>>={
 'ar-carbine':{family:'ar-carbine',yaw:.35,pitch:-.22,
  supportFraction:.19,stock:{x:0,y:0,z:0},
  elbowBias:{firingDrop:5.6,supportDrop:5.2}},
 'ar-rifle':{family:'ar-rifle',yaw:.40,pitch:-.27,
  supportFraction:.26,stock:{x:.12,y:-.18,z:0},
  elbowBias:{firingDrop:5.8,supportDrop:5.2}},
 'ak-carbine':{family:'ak-carbine',yaw:.36,pitch:-.24,
  supportFraction:.12,stock:{x:.08,y:-.08,z:0},
  elbowBias:{firingDrop:5.7,supportDrop:5.4}},
 'ak-rifle':{family:'ak-rifle',yaw:.40,pitch:-.27,
  supportFraction:.17,stock:{x:.13,y:-.15,z:0},
  elbowBias:{firingDrop:5.8,supportDrop:5.2}},
 'rpk-long':{family:'rpk-long',yaw:.44,pitch:-.31,
  supportFraction:.31,stock:{x:.22,y:-.25,z:0},
  elbowBias:{firingDrop:5.9,supportDrop:5.1}},
 'hk-rifle':{family:'hk-rifle',yaw:.41,pitch:-.26,
  supportFraction:.23,stock:{x:.16,y:-.20,z:0},
  elbowBias:{firingDrop:5.7,supportDrop:5.3}},
 'hk-carbine':{family:'hk-carbine',yaw:.36,pitch:-.23,
  supportFraction:.39,stock:{x:.08,y:-.12,z:0},
  elbowBias:{firingDrop:5.7,supportDrop:5.35}},
 'hk-smg':{family:'hk-smg',yaw:.35,pitch:-.22,
  supportFraction:.38,stock:{x:.05,y:-.10,z:0},
  elbowBias:{firingDrop:5.5,supportDrop:5.15}},
 'hk-smg-stockless':{family:'hk-smg-stockless',yaw:.28,pitch:-.17,
  supportFraction:.55,stock:{x:0,y:0,z:0},
  elbowBias:{firingDrop:5.25,supportDrop:5.05}}
};
export const LOW_READY_PASSES:Readonly<Record<LowReadyPass,{
 stockX:number;stockY:number;stockZ:number;
 yaw:number;pitch:number;softScale:number;
 contactFractions:readonly number[];centerPenalty:number;
}>>={
 standard:{stockX:.42,stockY:.25,stockZ:.30,
  yaw:.09,pitch:.08,softScale:1,
  contactFractions:[0,.18,.38,.58],centerPenalty:0},
 compressed:{stockX:.90,stockY:.48,stockZ:.52,
  yaw:.19,pitch:.15,softScale:1.35,
  contactFractions:[0,.12,.26,.43,.65],centerPenalty:1.6},
 deep:{stockX:1.42,stockY:.70,stockZ:.83,
  yaw:.29,pitch:.22,softScale:1.65,
  contactFractions:[0,.10,.22,.40,.68,.90],centerPenalty:3.0}
};
export function lowReadyArchetype(config:WeaponConfiguration):LowReadyArchetype|null{
 const build=config.build;if(!build)return null;
 if(build.family==='hk')
  return LOW_READY_ARCHETYPES[
   build.parts.receiver==='hk-mp5k-stockless'&&
   build.parts.stock==='hk-mp5k-cap'?'hk-smg-stockless':
   config.weapon==='smg'?'hk-smg':
   config.weapon==='carbine'?'hk-carbine':'hk-rifle'];
 if(build.family==='ar'){
  const carbine=config.weapon==='carbine'||
   build.parts.stock==='ar-car'||build.parts.stock==='ar-stock-m4'||
   build.parts.stock==='ar-compact';
  return LOW_READY_ARCHETYPES[carbine?'ar-carbine':'ar-rifle'];
 }
 if(build.family==='ak'){
  if(build.parts.receiver==='ak-rpk74')
   return LOW_READY_ARCHETYPES['rpk-long'];
  const short=build.parts.receiver==='akcompact'||
   build.parts.receiver==='ak105'||config.weapon==='carbine';
  return LOW_READY_ARCHETYPES[short?'ak-carbine':'ak-rifle'];
 }
 return null;
}
