/** Fieldwork Stage 2 camouflage garment policy.
 * A print appearing on a uniform does NOT imply it was ever produced as a
 * plate carrier, chest rig, rucksack or combat shirt. This deliberately
 * conservative matrix lists only documented issue or credible production.
 *
 * All headgear remains governed by the independently approved eligibility
 * matrix in operator-headwear-camo.ts. Do not broaden helmet choices here.
 */
import {HEADWEAR_CAMO_IDS,type HeadwearCamoId}
 from './operator-headwear-camo.ts';

export const FABRIC_CAMO_CHANNELS=['top','trousers','armor','gear','pack'] as const;
export type FabricCamoChannel=typeof FABRIC_CAMO_CHANNELS[number];
export type CamouflageEvidence='issued'|'issued-or-commercial'|'limited'|'headwear-only';
export type FabricCamoPolicy={
 channels:readonly FabricCamoChannel[];
 period:'historic'|'transition'|'modern';
 evidence:CamouflageEvidence;
 note:string;
};
const all=['top','trousers','armor','gear','pack'] as const;
const uniform=['top','trousers'] as const;
const withPack=['top','trousers','pack'] as const;
const withKit=['top','trousers','gear','pack'] as const;
const withArmor=['top','trousers','armor'] as const;
const policy=(channels:readonly FabricCamoChannel[],
 period:FabricCamoPolicy['period'],evidence:CamouflageEvidence,
 note:string):FabricCamoPolicy=>({channels,period,evidence,note});

/** Historical garment policy: conservatively deny unverified equipment
 * instead of assuming that every print belongs on every modern nylon item.
 */
export const FABRIC_CAMO_POLICY:Readonly<Record<HeadwearCamoId,FabricCamoPolicy>>={
 'm81-woodland':policy(all,'transition','issued-or-commercial','BDU, woodland armor covers, commercial and later woodland nylon equipment'),
 'three-color-desert':policy(withArmor,'transition','issued','DCU coat and trousers; documented desert body-armor covers, not automatic matching rucks'),
 'tiger-stripe':policy(uniform,'historic','issued-or-commercial','Vietnam-era specialty uniforms and commercial reproductions; no assumed patterned carriers'),
 ucp:policy(all,'modern','issued','Army ACU uniform, headwear and matching organizational equipment'),
 multicam:policy(all,'modern','issued-or-commercial','Combat uniforms and manufactured MultiCam carriers, pouches and packs'),
 flecktarn:policy(all,'transition','issued-or-commercial','German uniforms plus commercially available compatible load-bearing equipment'),
 'woodland-dpm':policy(withKit,'transition','issued','British DPM uniforms, PLCE covers/pouches and field bergens'),
 'swedish-m90':policy(withKit,'modern','issued-or-commercial','M90 uniforms and available Swedish-pattern field packs and pouches'),
 'six-color-desert':policy(uniform,'historic','issued','Desert combat uniform; keep contemporary armor and rucks solid without specific evidence'),
 'woodland-marpat':policy(withPack,'modern','issued','MCCUU uniform and issued woodland MARPAT ILBE pack; combat armor usually coyote'),
 alpenflage:policy(withPack,'historic','issued','Swiss TAZ57/83 uniform and matching vintage rucks; not modern plate carriers'),
 'desert-marpat':policy(uniform,'modern','issued','Marine desert MCCUU; equipment typically coyote, not uniformly printed'),
 'erdl-lowland':policy(uniform,'historic','issued','Vietnam tropical combat uniform; load-bearing equipment generally olive nylon/canvas'),
 'finnish-m05':policy(all,'modern','issued','Uniform, M05 field kit, pouches, packs and manufactured M05 plate carriers'),
 'polish-pantera':policy(all,'modern','issued-or-commercial','Polish Wz.93 uniforms and produced field equipment/covers'),
 'russian-flora':policy(all,'transition','issued-or-commercial','Flora combat uniform and made-to-match Russian load-bearing gear'),
 'rhodesian-brushstroke':policy(uniform,'historic','issued-or-commercial','Issued patterned fatigues; standard-period webbing is unprinted'),
 'desert-tropentarn':policy(all,'modern','issued-or-commercial','Bundeswehr arid uniforms and commercially manufactured equipment covers and packs'),
 'belgian-jigsaw':policy(withKit,'transition','issued-or-commercial','Belgian uniform and matching fabric bags/load gear; avoid unverified plate covers'),
 'east-german-strichtarn':policy(withKit,'historic','issued','East German uniform, rain-pattern field pack and textile field pouches'),
 'mitchell-leaf':policy([],'historic','headwear-only','Historically issued as reversible helmet cover/shelter half, not standard fatigues'),
 'splittertarn-31':policy(uniform,'historic','limited','German poncho/smock and limited winter suit trousers; no issued modern tactical nylon'),
 'australian-dpcu':policy(all,'modern','issued','DPCU fatigues and matching manufactured pouches, vest covers and packs'),
 'italian-vegetato':policy(all,'modern','issued-or-commercial','Italian uniforms and available Italian-pattern field equipment'),
 'scorpion-w2':policy(all,'modern','issued','Army OCP uniform and matching organizational equipment'),
 'russian-emr':policy(all,'modern','issued','Russian EMR uniform and matching textile field equipment'),
 'pla-xingkong':policy(withKit,'modern','issued','Chinese digital uniform and matching issued load-bearing equipment, not universal plates'),
 'cadpat-tw':policy(all,'modern','issued','Canadian camouflage uniforms and matching textured combat web gear'),
 'british-mtp':policy(all,'modern','issued','UK MTP uniform, plate carriers, web gear and Bergen packs'),
 'indian-digital-2022':policy(uniform,'modern','issued','2022 Indian Army protected print: issue combat uniforms verified, not all third-party equipment')
};

/** Fabric cut restrictions prevent period-incompatible garment constructions.
 * No use on plain civilian tees, flannel, jeans, boots, buckles or weapons.
 */
const HISTORIC_TOP=['field-jacket','bdu-shirt','light-shirt'] as const;
const TRANSITION_TOP=['field-jacket','bdu-shirt','acu-shirt','combat-shirt',
 'light-shirt','softshell','softshell-hood','pcu-shell'] as const;
const MODERN_TOP=['field-jacket','bdu-shirt','acu-shirt','combat-shirt',
 'light-shirt','softshell','softshell-hood','pcu-shell'] as const;
const HISTORIC_TROUSERS=['field-trousers','bdu-trousers'] as const;
const MODERN_TROUSERS=['field-trousers','bdu-trousers','acu-trousers',
 'combat-trousers','softshell-trousers'] as const;
export type CamoOutfit={
 top:string;trousers:string;armorStyle:string;rigStyle:string;packStyle:string
};
export function fabricCamoCompatible(id:HeadwearCamoId,
 channel:FabricCamoChannel,outfit:CamoOutfit):boolean{
 const entry=FABRIC_CAMO_POLICY[id];
 if(!entry.channels.includes(channel))return false;
 switch(channel){
  case 'top':{
   const allowed=entry.period==='historic'?HISTORIC_TOP:
    entry.period==='transition'?TRANSITION_TOP:MODERN_TOP;
   // Splinter 31 was issued as a smock/winter jacket, not a BDU field blouse.
   if(id==='splittertarn-31')return outfit.top==='field-jacket';
   return (allowed as readonly string[]).includes(outfit.top);
  }
  case 'trousers':
   return ((entry.period==='historic'?HISTORIC_TROUSERS:
    MODERN_TROUSERS) as readonly string[]).includes(outfit.trousers);
  case 'armor':
   return outfit.armorStyle!=='armor-bare';
  case 'gear':
   return outfit.rigStyle!=='no-rig';
  case 'pack':
   return outfit.packStyle!=='no-pack';
 }
}
export function fabricCamoChoices(channel:FabricCamoChannel,
 outfit:CamoOutfit):HeadwearCamoId[]{
 return HEADWEAR_CAMO_IDS.filter(id=>fabricCamoCompatible(id,channel,outfit));
}
export function fabricCamoAllowedChannels(id:HeadwearCamoId):readonly FabricCamoChannel[]{
 return FABRIC_CAMO_POLICY[id].channels;
}
