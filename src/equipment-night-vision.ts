/** L1.5 — physical, per-operator night-vision device contract.
 * Helmet goggles, shrouds, battery pouches and strobe are ONLY cosmetics.
 * An issued NVG utility device AND a compatible mounted shell are required.
 * Perception modifiers remain owned by L1.6.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';
import {resolveHelmetField,isFieldHelmet} from './operator-helmet-field-policy.ts';
export type NvgCarrier={
 health:number;equipment?:EquipmentLoadout;wardrobe?:WardrobeOptions;
 nvgDeployed?:boolean;
};
export function nvgMounted(a:Pick<NvgCarrier,'equipment'|'wardrobe'>|undefined):boolean{
 if(a?.equipment?.slots.utility!=='utility-nvg'||a.equipment.slots.head!=='head-helmet')
  return false;
 const shell=a.wardrobe?.styles?.headwear??'ach';
 if(!isFieldHelmet(shell))return false;
 // Legacy wardrobe records without field hardware never implicitly gain a mount.
 return a.wardrobe?.helmetField!==undefined&&
  resolveHelmetField(shell,a.wardrobe.helmetField).shroud===true;
}
export function nvgOperational(a:NvgCarrier|undefined):boolean{
 return !!a&&a.health>0&&a.nvgDeployed===true&&nvgMounted(a);
}
export function nvgEditable(a:NvgCarrier|undefined,phase:string,replaying=false):boolean{
 return !!a&&a.health>0&&!replaying&&
  (phase==='planning'||phase==='running')&&nvgMounted(a);
}
/** Pure status; stays descriptive when an operator has a device but cannot
 * mount it, rather than promising an action that will fail silently. */
export function nvgControlState(a:(NvgCarrier&{name:string})|undefined,
 phase:string,replaying=false){
 const issued=a?.equipment?.slots.utility==='utility-nvg';
 const mounted=nvgMounted(a);
 const on=nvgOperational(a);
 const status=!issued?'NOT ISSUED':!mounted?'NO MOUNT':
  a&&a.health<=0?'DOWN':on?'DOWN / ON':'STOWED';
 return {
  text:mounted?'NVG '+(on?'ON':'UP'):'NVG '+status,
  aria:'Night vision for '+(a?.name.toUpperCase()??'NO OPERATOR')+
   ': '+status,
  fitted:!!issued,pressed:on,
  disabled:!nvgEditable(a,phase,replaying)
 };
}
