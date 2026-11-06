/** Weapon families 01: game-only modular appearance catalog.
 * Family parts are visual identities, not instructions for physical assembly.
 * Legacy carbine/rifle classes continue to own firing, inventory and magazines.
 */
import type {WeaponId} from './breach-combat.ts';

export const FAMILY_PART_SLOTS=['stock','receiver','grip','magazine',
 'handguard','barrel'] as const;
export type FamilyPartSlot=typeof FAMILY_PART_SLOTS[number];
export type WeaponFamily='ar'|'ak';
export type FamilyLength='long'|'mid'|'short';
type Feed='stanag'|'ak762'|'ak545';
export type WeaponFamilyPart={
 id:string;name:string;family:WeaponFamily;slot:FamilyPartSlot;
 receivers?:readonly string[];feed?:Feed;length?:FamilyLength;
 role?:'carbine'|'rifle'|'both';stockX?:number;
};
export type WeaponFamilyBuild={family:WeaponFamily;
 parts:Record<FamilyPartSlot,string>};
export type WeaponFamilyPreset={id:string;name:string;weapon:'carbine'|'rifle';
 family:WeaponFamily;parts:Record<FamilyPartSlot,string>};
const ar=['ar-a1','ar-a2','ar-retro','ar-flat'];
const akClassic=['akm','ak74'];
const akModern=['ak74m','ak103','ak105'];
const add=(id:string,name:string,family:WeaponFamily,slot:FamilyPartSlot,
 extra:Partial<WeaponFamilyPart>={}):WeaponFamilyPart=>({id,name,family,slot,...extra});
export const FAMILY_PARTS:Readonly<Record<string,WeaponFamilyPart>>={
 'ar-a1':add('ar-a1','Early carry-handle receiver','ar','receiver',{feed:'stanag',role:'rifle'}),
 'ar-a2':add('ar-a2','A2 carry-handle receiver','ar','receiver',{feed:'stanag',role:'rifle'}),
 'ar-retro':add('ar-retro','Retro carbine receiver','ar','receiver',{feed:'stanag',role:'carbine'}),
 'ar-flat':add('ar-flat','Flat-top receiver','ar','receiver',{feed:'stanag',role:'both'}),
 'akm':add('akm','AKM stamped receiver','ak','receiver',{feed:'ak762',role:'rifle'}),
 'ak74':add('ak74','AK-74 receiver','ak','receiver',{feed:'ak545',role:'rifle'}),
 'ak74m':add('ak74m','AK-74M receiver','ak','receiver',{feed:'ak545',role:'rifle'}),
 'ak103':add('ak103','AK-103 receiver','ak','receiver',{feed:'ak762',role:'rifle'}),
 'ak105':add('ak105','AK-105 carbine receiver','ak','receiver',{feed:'ak545',role:'carbine'}),
 'akcompact':add('akcompact','AKS-74U compact receiver','ak','receiver',{feed:'ak545',role:'carbine'}),
 'ar-fixed':add('ar-fixed','Fixed rifle stock','ar','stock',{receivers:['ar-a1','ar-a2','ar-flat'],stockX:-13.5}),
 'ar-car':add('ar-car','Collapsible carbine stock','ar','stock',{receivers:['ar-retro','ar-flat'],stockX:-12.3}),
 'ar-compact':add('ar-compact','Compact adjustable stock','ar','stock',{receivers:['ar-flat'],stockX:-11.7}),
 'ak-wood':add('ak-wood','Wood fixed stock','ak','stock',{receivers:akClassic,stockX:-13.5}),
 'ak-wood74':add('ak-wood74','AK-74 fixed wood stock','ak','stock',{receivers:['ak74'],stockX:-13.5}),
 'ak-poly':add('ak-poly','Polymer fixed stock','ak','stock',{receivers:['akm','ak74','ak74m','ak103'],stockX:-13.5}),
 'ak-sidefold':add('ak-sidefold','Polymer side-folding stock','ak','stock',{receivers:akModern,stockX:-12.7}),
 'ak-skeleton':add('ak-skeleton','Metal skeleton folding stock','ak','stock',{receivers:['akcompact'],stockX:-12.7}),
 'ak-triangle-full':add('ak-triangle-full','Full-length AKS metal triangle folder','ak','stock',{receivers:['ak74'],stockX:-14.4}),
 'ak-underfolder':add('ak-underfolder','AKMS double-bar underfolding stock','ak','stock',{receivers:['akm'],stockX:-14.5}),
 'ar-grip-classic':add('ar-grip-classic','Classic pistol grip','ar','grip',{receivers:ar}),
 'ar-grip-a2':add('ar-grip-a2','A2 pistol grip','ar','grip',{receivers:ar}),
 'ar-grip-poly':add('ar-grip-poly','Modern polymer grip','ar','grip',{receivers:['ar-flat','ar-retro']}),
 'ak-grip-wood':add('ak-grip-wood','Wood pistol grip','ak','grip',{receivers:akClassic}),
 'ak-grip-bakelite':add('ak-grip-bakelite','Resin pistol grip','ak','grip',{receivers:[...akClassic,...akModern,'akcompact']}),
 'ak-grip-poly':add('ak-grip-poly','Polymer pistol grip','ak','grip',{receivers:[...akClassic,...akModern,'akcompact']}),
 'ar-mag20':add('ar-mag20','Straight 20-round profile','ar','magazine',{feed:'stanag'}),
 'ar-mag30':add('ar-mag30','Curved 30-round profile','ar','magazine',{feed:'stanag'}),
 'ar-magpoly':add('ar-magpoly','Modern polymer magazine','ar','magazine',{feed:'stanag'}),
 'ak-mag762':add('ak-mag762','7.62 curved steel profile','ak','magazine',{feed:'ak762'}),
 'ak-mag762poly':add('ak-mag762poly','7.62 curved polymer profile','ak','magazine',{feed:'ak762'}),
 'ak-mag545':add('ak-mag545','5.45 resin magazine','ak','magazine',{feed:'ak545'}),
 'ak-mag545poly':add('ak-mag545poly','5.45 polymer magazine','ak','magazine',{feed:'ak545'}),
 'ar-triangle':add('ar-triangle','Triangular rifle handguard','ar','handguard',{receivers:['ar-a1'],length:'long'}),
 'ar-round':add('ar-round','Round rifle handguard','ar','handguard',{receivers:['ar-a2','ar-flat'],length:'long'}),
 'ar-carbine':add('ar-carbine','Carbine polymer handguard','ar','handguard',{receivers:['ar-retro','ar-flat'],length:'mid'}),
 'ar-car15-ribbed':add('ar-car15-ribbed','Slim CAR-15 handguard','ar','handguard',{receivers:['ar-retro'],length:'mid'}),
 'ar-733-ribbed':add('ar-733-ribbed','Colt 733 short ribbed handguard','ar','handguard',{receivers:['ar-retro'],length:'short'}),
 'ar-quad':add('ar-quad','Carbine quad rail','ar','handguard',{receivers:['ar-flat'],length:'mid'}),
 'ar-m5-rail':add('ar-m5-rail','Full-length rifle rail','ar','handguard',{receivers:['ar-flat'],length:'long'}),
 'ar-risii':add('ar-risii','Compact RIS-style rail','ar','handguard',{receivers:['ar-flat'],length:'short'}),
 'ar-compact-rail':add('ar-compact-rail','Compact free-float rail','ar','handguard',{receivers:['ar-flat'],length:'short'}),
 'ak-wood-long':add('ak-wood-long','Classic wood handguard','ak','handguard',{receivers:akClassic,length:'long'}),
 'ak-poly-long':add('ak-poly-long','Polymer handguard','ak','handguard',{receivers:['akm','ak74','ak74m','ak103'],length:'long'}),
 'ak-rail-long':add('ak-rail-long','Railed AK handguard','ak','handguard',{receivers:['ak74m','ak103'],length:'long'}),
 'ak-wood-short':add('ak-wood-short','Compact wood handguard','ak','handguard',{receivers:['akcompact'],length:'short'}),
 'ak-poly-short':add('ak-poly-short','Compact polymer handguard','ak','handguard',{receivers:['akcompact'],length:'short'}),
 'ak-poly-mid':add('ak-poly-mid','Carbine polymer handguard','ak','handguard',{receivers:['ak105'],length:'mid'}),
 'ar-20':add('ar-20','Full-length rifle barrel','ar','barrel',{receivers:['ar-a1','ar-a2','ar-flat'],length:'long',role:'rifle'}),
 'ar-145':add('ar-145','Carbine barrel','ar','barrel',{receivers:['ar-retro','ar-flat'],length:'mid',role:'carbine'}),
 'ar-103':add('ar-103','Compact carbine barrel','ar','barrel',{receivers:['ar-flat'],length:'short',role:'carbine'}),
 'ar-733-115':add('ar-733-115','Colt 733 compact front with A-frame','ar','barrel',{receivers:['ar-retro'],length:'short',role:'carbine'}),
 'ak-long':add('ak-long','Full-length AK barrel','ak','barrel',{receivers:['akm','ak74','ak74m','ak103'],length:'long',role:'rifle'}),
 'ak-mid':add('ak-mid','AK carbine barrel','ak','barrel',{receivers:['ak105'],length:'mid',role:'carbine'}),
 'ak-short':add('ak-short','AKS-74U compact barrel','ak','barrel',{receivers:['akcompact'],length:'short',role:'carbine'})
};
const p=(id:string,name:string,weapon:'carbine'|'rifle',family:WeaponFamily,
 receiver:string,stock:string,grip:string,magazine:string,handguard:string,
 barrel:string):WeaponFamilyPreset=>({
 id,name,weapon,family,parts:{receiver,stock,grip,magazine,handguard,barrel}
});
export const FAMILY_PRESETS:readonly WeaponFamilyPreset[]=[
 p('ar-m16a1','M16A1','rifle','ar','ar-a1','ar-fixed','ar-grip-classic','ar-mag20','ar-triangle','ar-20'),
 p('ar-m16a2','M16A2','rifle','ar','ar-a2','ar-fixed','ar-grip-a2','ar-mag30','ar-round','ar-20'),
 p('ar-m16a4','M16A4','rifle','ar','ar-flat','ar-fixed','ar-grip-a2','ar-mag30','ar-m5-rail','ar-20'),
 p('ar-car15','CAR-15','carbine','ar','ar-retro','ar-car','ar-grip-classic','ar-mag20','ar-car15-ribbed','ar-145'),
 p('ar-colt733','Colt 733 Commando','carbine','ar','ar-retro','ar-car','ar-grip-a2','ar-mag30','ar-733-ribbed','ar-733-115'),
 p('ar-m4a1','M4A1','carbine','ar','ar-flat','ar-car','ar-grip-a2','ar-mag30','ar-quad','ar-145'),
 p('ar-mk18','Mk 18','carbine','ar','ar-flat','ar-compact','ar-grip-poly','ar-magpoly','ar-risii','ar-103'),
 p('ak-akm','AKM','rifle','ak','akm','ak-wood','ak-grip-bakelite','ak-mag762','ak-wood-long','ak-long'),
 p('ak-akms','AKMS','rifle','ak','akm','ak-underfolder','ak-grip-bakelite','ak-mag762','ak-wood-long','ak-long'),
 p('ak-ak74','AK-74','rifle','ak','ak74','ak-wood74','ak-grip-bakelite','ak-mag545','ak-wood-long','ak-long'),
 p('ak-aks74','AKS-74','rifle','ak','ak74','ak-triangle-full','ak-grip-bakelite','ak-mag545','ak-wood-long','ak-long'),
 p('ak-ak74m','AK-74M','rifle','ak','ak74m','ak-sidefold','ak-grip-poly','ak-mag545poly','ak-poly-long','ak-long'),
 p('ak-ak103','AK-103','rifle','ak','ak103','ak-sidefold','ak-grip-poly','ak-mag762poly','ak-poly-long','ak-long'),
 p('ak-aks74u','AKS-74U','carbine','ak','akcompact','ak-skeleton','ak-grip-bakelite','ak-mag545','ak-wood-short','ak-short'),
 p('ak-ak105','AK-105','carbine','ak','ak105','ak-sidefold','ak-grip-poly','ak-mag545poly','ak-poly-mid','ak-mid')
];
export function familyPreset(id:string):WeaponFamilyPreset|undefined{
 return FAMILY_PRESETS.find(preset=>preset.id===id);
}
export function initialWeaponFamilyBuild(presetId:string):WeaponFamilyBuild|undefined{
 const preset=familyPreset(presetId);
 return preset?{family:preset.family,parts:{...preset.parts}}:undefined;
}
const receiverFor=(id:string,weapon:WeaponId):WeaponFamilyPart|undefined=>{
 const receiver=FAMILY_PARTS[id];
 return receiver?.slot==='receiver'&&
  (receiver.role==='both'||receiver.role===weapon)?receiver:undefined;
};
export function compatibleFamilyPart(receiverId:string,slot:FamilyPartSlot,
 id:string,weapon:WeaponId,barrelLength?:FamilyLength):boolean{
 const receiver=receiverFor(receiverId,weapon),part=FAMILY_PARTS[id];
 if(!receiver||!part||part.slot!==slot||part.family!==receiver.family)return false;
 if(slot==='receiver')return receiverId===id;
 if(part.receivers&&!part.receivers.includes(receiverId))return false;
 if(part.feed&&part.feed!==receiver.feed)return false;
 if(part.role&&part.role!==weapon&&part.role!=='both')return false;
 if(slot==='handguard'&&barrelLength&&part.length!==barrelLength)return false;
 return true;
}
export function readWeaponFamilyBuild(raw:unknown,weapon:WeaponId):WeaponFamilyBuild|undefined{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return undefined;
 const source=raw as {family?:unknown;parts?:unknown};
 if(!source.parts||typeof source.parts!=='object'||Array.isArray(source.parts))return undefined;
 const parts=source.parts as Record<string,unknown>;
 const receiverId=parts.receiver;
 if(typeof receiverId!=='string')return undefined;
 const receiver=receiverFor(receiverId,weapon);
 if(!receiver||source.family!==receiver.family)return undefined;
 const defaultPreset=FAMILY_PRESETS.find(x=>x.weapon===weapon&&x.parts.receiver===receiverId);
 if(!defaultPreset)return undefined;
 const next:WeaponFamilyBuild={family:receiver.family,parts:{...defaultPreset.parts}};
 for(const slot of ['stock','grip','magazine','barrel'] as const){
  const id=parts[slot];
  if(typeof id==='string'&&compatibleFamilyPart(receiverId,slot,id,weapon))
   next.parts[slot]=id;
 }
 const barrelLength=FAMILY_PARTS[next.parts.barrel].length;
 const handguard=parts.handguard;
 if(typeof handguard==='string'&&compatibleFamilyPart(
   receiverId,'handguard',handguard,weapon,barrelLength))
  next.parts.handguard=handguard;
 else if(!compatibleFamilyPart(receiverId,'handguard',next.parts.handguard,weapon,barrelLength)){
  const suitable=Object.values(FAMILY_PARTS).find(part=>part.slot==='handguard'&&
   compatibleFamilyPart(receiverId,'handguard',part.id,weapon,barrelLength));
  if(suitable)next.parts.handguard=suitable.id;
 }
 return next;
}
export function setWeaponFamilyPart(build:WeaponFamilyBuild,weapon:WeaponId,
 slot:FamilyPartSlot,id:string):WeaponFamilyBuild{
 if(!FAMILY_PART_SLOTS.includes(slot))return build;
 const receiverId=slot==='receiver'?id:build.parts.receiver;
 const receiver=receiverFor(receiverId,weapon);
 if(!receiver||receiver.family!==build.family)return build;
 if(slot!=='receiver'&&!compatibleFamilyPart(
   receiverId,slot,id,weapon,FAMILY_PARTS[build.parts.barrel]?.length))return build;
 if(build.parts[slot]===id)return build;
 if(slot==='receiver'){
  const fallback=FAMILY_PRESETS.find(x=>x.weapon===weapon&&x.parts.receiver===id);
  if(!fallback)return build;
  const normalized=readWeaponFamilyBuild({family:build.family,
   parts:{...build.parts,receiver:id}},weapon);
  return normalized??{family:build.family,parts:{...fallback.parts}};
 }
 const next=readWeaponFamilyBuild({family:build.family,
  parts:{...build.parts,[slot]:id}},weapon);
 return next??build;
}
export function matchingFamilyPreset(build:WeaponFamilyBuild):WeaponFamilyPreset|undefined{
 return FAMILY_PRESETS.find(p=>p.family===build.family&&
  FAMILY_PART_SLOTS.every(slot=>p.parts[slot]===build.parts[slot]));
}
