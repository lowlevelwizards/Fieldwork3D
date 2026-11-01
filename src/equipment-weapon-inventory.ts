/** Equipment 19.08: finite campaign attachment stock. Standard factory
 * components are included with a purchased weapon and cost no extra credit.
 * Non-default modules move between shared stores and equipped assemblies.
 */
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,
 initialWeaponConfiguration,type WeaponConfiguration}
 from './equipment-weapon-assemblies.ts';
export const ATTACHMENT_PRICES:Readonly<Record<string,number>>={
 'optic-irons':0,'optic-reflex':120,'optic-magnified':220,
 'muzzle-bare':0,'muzzle-hider':70,'muzzle-brake':95,'muzzle-suppressor':280,
 'foregrip-none':0,'foregrip-handstop':45,'foregrip-vertical':75,
 'stock-standard':0,'stock-compact':90,'stock-extended':110,
 'light-none':0,'light-compact':135,
 'sling-none':0,'sling-two-point':55
};
export const attachmentPrice=(id:string):number=>
 WEAPON_ATTACHMENTS[id]?ATTACHMENT_PRICES[id]??0:-1;
export const catalogStockIds=Object.keys(WEAPON_ATTACHMENTS)
 .filter(id=>attachmentPrice(id)>0);
export function readAttachmentStock(raw:unknown):Record<string,number>{
 const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?
  raw as Record<string,unknown>:{};
 return Object.fromEntries(catalogStockIds.map(id=>{
  const n=source[id];return [id,typeof n==='number'&&Number.isInteger(n)&&
   n>=0&&n<=999?n:0];
 }));
}
export function returnAttachments(stock:Record<string,number>,
 previous:WeaponConfiguration,next?:WeaponConfiguration):Record<string,number>{
 const values={...stock};
 const defaults=initialWeaponConfiguration(previous.weapon).slots;
 for(const slot of WEAPON_ATTACHMENT_SLOTS){
  const id=previous.slots[slot];
  if(id!==defaults[slot]&&id!==next?.slots[slot]&&attachmentPrice(id)>0)
   values[id]=(values[id]??0)+1;
 }
 return values;
}
