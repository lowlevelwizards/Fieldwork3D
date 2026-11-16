/** Equipment 21.07: selected operator light state, independent of DOM/canvas. */
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {fittedWeaponLight,weaponLightEditable,weaponLightEmitting}
 from './equipment-weapon-light-operations.ts';
export type LightControlOperator={
 name:string;health:number;weaponLightOn:boolean;
 weaponConfiguration?:WeaponConfiguration;
};
export function lightControlState(actor:LightControlOperator|undefined,
 phase:string,replaying=false){
 const mounted=fittedWeaponLight(actor);
 const on=weaponLightEmitting(actor);
 const name=actor?.name.toUpperCase()??'NO OPERATOR';
 const status=!mounted?'NOT FITTED':on?'ON':'OFF';
 return {
  text:'LIGHT · '+name+' · '+status,
  shortText:mounted?'LIGHT '+(on?'ON':'OFF'):'NO LIGHT',
  fitted:mounted,
  aria:'Weapon light for '+name+': '+status,
  pressed:on,
  disabled:!weaponLightEditable(actor,phase,replaying)
 };
}
