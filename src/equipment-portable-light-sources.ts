/** Build 26.02: the same gun mount that casts the visible cone also
 * supplies gameplay illumination, from the actual clearance-retracted rail.
 * Do not reveal opponents or alter perception here.
 */
import type {Door} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import type {IlluminationSource} from './equipment-light-field.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {weaponLightEmitter,LIGHT_BEAM_RANGE,LIGHT_BEAM_HALF_ANGLE}
 from './equipment-weapon-light-beam.ts';
export function activeWeaponLightSources(actors:readonly TeamActor[],
 doors:readonly Door[]):IlluminationSource[]{
 const result:IlluminationSource[]=[];
 for(const a of actors){
  if(a.health<=0||!a.weaponLightOn||a.weaponConfiguration?.slots.light!=='light-compact')
   continue;
  const clearance=weaponClearance({x:a.p.x,z:a.p.y,
   heading:a.heading,weaponYaw:a.weaponYaw,weapon:a.weapon,
   weaponConfiguration:a.weaponConfiguration,
   aim:a.aim,velocity:a.velocity,recoil:a.recoil,
   posture:a.posture},doors);
  const emitter=weaponLightEmitter(clearance.muzzle,a.weaponConfiguration);
  result.push({id:'weapon:'+a.id,p:emitter,
   heading:clearance.muzzle.yaw,halfAngle:LIGHT_BEAM_HALF_ANGLE,
   intensity:.92,range:LIGHT_BEAM_RANGE,enabled:true});
 }
 return result;
}
