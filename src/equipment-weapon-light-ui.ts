/** Equipment 21.07: selected operator light state, independent of DOM/canvas. */
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
export type LightControlOperator={
 name:string;health:number;weaponLightOn:boolean;
 weaponConfiguration?:WeaponConfiguration;
};
export function lightControlState(actor:LightControlOperator|undefined,
 phase:string,replaying=false){
 const mounted=actor?.weaponConfiguration?.slots.light==='light-compact';
 const on=!!(mounted&&actor?.weaponLightOn);
 const name=actor?.name.toUpperCase()??'NO OPERATOR';
 const status=!mounted?'NOT FITTED':on?'ON':'OFF';
 return {
  text:'LIGHT · '+name+' · '+status,
  aria:'Weapon light for '+name+': '+status,
  pressed:on,
  disabled:!actor||!mounted||actor.health<=0||replaying||
   (phase!=='planning'&&phase!=='running')
 };
}
