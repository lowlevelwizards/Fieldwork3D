/** EB13. Fictional game equipment pools, independent of experience rank.
 * Uses authored Arsenal assets and existing physical inventory slots. */
import type {AiGroupKind} from './breach-ai-group-profiles.ts';
import type {WardrobeSlot} from './operator-wardrobe-data.ts';
import type {GarmentSolidId} from './operator-garment-color-policy.ts';
export type EnemyOutfitProfile={
 weapons:readonly string[]; tops:readonly string[]; trousers:readonly string[];
 headwear:readonly string[]; armor:'armor-none'|'armor-soft'|'armor-carrier';
 armorStyle:string;rig:'rig-none'|'rig-light'|'rig-full';rigStyle:string;
 belt:string;pack:string;topColors:readonly GarmentSolidId[];
 trouserColors:readonly GarmentSolidId[]; coherent:boolean;
};
export const ENEMY_OUTFIT_PROFILES:Readonly<Record<AiGroupKind,EnemyOutfitProfile>>={
 opportunists:{weapons:['r870-police-wood','ak-akm','fal-5000-classic'],tops:['t-shirt','button-up-shirt','tank-top','hoodie'],trousers:['jeans','civilian-cargo','track-pants'],headwear:['bare','beanie'],armor:'armor-none',armorStyle:'armor-bare',rig:'rig-none',rigStyle:'no-rig',belt:'plain-belt',pack:'no-pack',topColors:['muted-blue','rust','off-white','charcoal'],trouserColors:['navy','charcoal','khaki'],coherent:false},
 'organised-criminals':{weapons:['hk-mp5a3','ak-akms','r870-police-synthetic','ar-car15'],tops:['button-up-shirt','t-shirt','hoodie','casual-jacket'],trousers:['jeans','civilian-cargo','track-pants'],headwear:['bare','beanie'],armor:'armor-soft',armorStyle:'soft-slick',rig:'rig-light',rigStyle:'micro-rig',belt:'plain-belt',pack:'no-pack',topColors:['charcoal','black','navy','slate'],trouserColors:['navy','charcoal','khaki'],coherent:false},
 'armed-irregulars':{weapons:['ak-akm','ak-ak74','fal-5000','fnc-service'],tops:['bdu-shirt','button-up-shirt','gorka-jacket'],trousers:['bdu-trousers','gorka-trousers','civilian-cargo'],headwear:['bare','patrol-cap','soviet-steel'],armor:'armor-soft',armorStyle:'soft-flak',rig:'rig-light',rigStyle:'chicom-rig',belt:'light-belt',pack:'no-pack',topColors:['olive-drab','khaki','brown','forest-green'],trouserColors:['olive-drab','khaki','brown'],coherent:false},
 security:{weapons:['hk-mp5a2','r870-police-synthetic','ar-car15'],tops:['polo-shirt'],trousers:['civilian-cargo'],headwear:['bare','patrol-cap'],armor:'armor-soft',armorStyle:'soft-vest',rig:'rig-none',rigStyle:'no-rig',belt:'duty-belt',pack:'no-pack',topColors:['navy','charcoal'],trouserColors:['charcoal','navy'],coherent:true},
 'regular-force':{weapons:['ak-ak74m','ar-m16a4','g36-service','fnc-service'],tops:['acu-shirt'],trousers:['acu-trousers'],headwear:['ach'],armor:'armor-carrier',armorStyle:'plate-standard',rig:'rig-full',rigStyle:'field-webbing',belt:'battle-belt',pack:'day-pack',topColors:['olive-drab','ranger-green','khaki'],trouserColors:['olive-drab','ranger-green','khaki'],coherent:true},
 specialists:{weapons:['ar-m4a1','g36-k-dual','hk-mp5a3'],tops:['combat-shirt'],trousers:['acu-trousers'],headwear:['mich-2001'],armor:'armor-carrier',armorStyle:'plate-jpc',rig:'rig-light',rigStyle:'chest-placard',belt:'battle-belt',pack:'no-pack',topColors:['ranger-green','charcoal','khaki'],trouserColors:['ranger-green','charcoal','khaki'],coherent:true},
 fugitives:{weapons:['r870-police-wood','ak-aks74u','hk-mp5k'],tops:['t-shirt','hoodie','casual-jacket'],trousers:['jeans','track-pants','civilian-cargo'],headwear:['bare','beanie'],armor:'armor-none',armorStyle:'armor-bare',rig:'rig-none',rigStyle:'no-rig',belt:'plain-belt',pack:'day-pack',topColors:['charcoal','muted-blue','brown','navy'],trouserColors:['navy','charcoal','khaki'],coherent:false}
};
export function outfitRoll(seed:number,key:string,channel:string):number{
 let h=(seed^2166136261)>>>0;
 for(const ch of key+'/'+channel)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
 h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;
 return (h>>>0)/4294967296;
}
export function outfitPick<T>(items:readonly T[],seed:number,key:string,channel:string):T{
 return items[Math.floor(outfitRoll(seed,key,channel)*items.length)]!;
}
