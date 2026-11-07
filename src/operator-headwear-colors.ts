import {OPERATOR_SOLID_FAMILIES} from './operator-solid-color-families.ts';
/** Contextual headgear SOLID swatches (no universal operator color wheel).
 * One practical core color token can belong to several headwear families,
 * but each physical piece carries a deliberately restricted option list.
 * These are art-directed matte RGB references, not measured paint standards.
 * Covers and camouflage are separate future layers.
 */
import type {HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
export const HEADWEAR_SOLID_COLORS={
 black:{label:'Black',hex:OPERATOR_SOLID_FAMILIES.black},
 navy:{label:'Navy Blue',hex:OPERATOR_SOLID_FAMILIES.navy},
 'beret-maroon':{label:'Maroon',hex:OPERATOR_SOLID_FAMILIES['beret-maroon']},
 'beret-scarlet':{label:'Scarlet Red',hex:OPERATOR_SOLID_FAMILIES['beret-scarlet']},
 'beret-airborne-blue':{label:'Airborne Blue',hex:OPERATOR_SOLID_FAMILIES['beret-airborne-blue']},
 charcoal:{label:'Charcoal',hex:OPERATOR_SOLID_FAMILIES.charcoal},
 'olive-drab':{label:'Olive Drab',hex:OPERATOR_SOLID_FAMILIES['olive-drab']},
 'ranger-green':{label:'Ranger Green',hex:OPERATOR_SOLID_FAMILIES['ranger-green']},
 'foliage-green':{label:'Foliage Green',hex:OPERATOR_SOLID_FAMILIES.foliage},
 'desert-tan':{label:'Desert Tan',hex:OPERATOR_SOLID_FAMILIES.tan},
 'coyote-brown':{label:'Coyote Brown',hex:OPERATOR_SOLID_FAMILIES.coyote},
 'urban-gray':{label:'Urban Gray',hex:OPERATOR_SOLID_FAMILIES['urban-gray']},
 'winter-white':{label:'Winter White',hex:OPERATOR_SOLID_FAMILIES['winter-white']},
 'soviet-4bo':{label:'Soviet 4BO Green',hex:OPERATOR_SOLID_FAMILIES['soviet-4bo']},
 'postwar-green':{label:'Postwar Green',hex:OPERATOR_SOLID_FAMILIES['postwar-green']}
} as const;
export type HeadwearSolidColorId=keyof typeof HEADWEAR_SOLID_COLORS;
export const HEADWEAR_ALLOWED_SOLIDS:Readonly<Record<HeadSilhouetteId,readonly HeadwearSolidColorId[]>>={
 beret:['black','navy','olive-drab','ranger-green','beret-maroon',
  'beret-scarlet','beret-airborne-blue'],
 'patrol-cap':['olive-drab','ranger-green','desert-tan','black','navy'],
 boonie:['olive-drab','ranger-green','desert-tan','coyote-brown','black','navy'],
 beanie:['black','navy','charcoal','olive-drab','coyote-brown','desert-tan','winter-white'],
 ach:['olive-drab','foliage-green','desert-tan','coyote-brown','black','navy'],
 'high-cut':['ranger-green','black','desert-tan','coyote-brown','urban-gray'],
 'mich-2001':['olive-drab','black','desert-tan','ranger-green'],
 'mich-2002':['olive-drab','black','desert-tan','ranger-green'],
 'fast-sf':['ranger-green','black','desert-tan','coyote-brown','urban-gray'],
 'fast-xp-mid':['ranger-green','black','desert-tan','coyote-brown','urban-gray'],
 pasgt:['olive-drab','desert-tan','coyote-brown','black','navy'],
 'soviet-steel':['soviet-4bo','postwar-green'],
 'm1-steel':['olive-drab','postwar-green','desert-tan'],
 'ddr-m56':['urban-gray','postwar-green'],
 'police-helmet':['black','navy','charcoal']
};
export const HEADWEAR_DEFAULT_SOLIDS:Readonly<Record<HeadSilhouetteId,HeadwearSolidColorId>>={
 'patrol-cap':'olive-drab',boonie:'olive-drab',beanie:'black',beret:'black',
 ach:'olive-drab','high-cut':'ranger-green',pasgt:'olive-drab',
 'mich-2001':'olive-drab','mich-2002':'olive-drab',
 'fast-sf':'ranger-green','fast-xp-mid':'ranger-green',
 'soviet-steel':'soviet-4bo','m1-steel':'olive-drab',
 'ddr-m56':'urban-gray','police-helmet':'black'
};
export const HEADWEAR_COLOR_MODEL_IDS=Object.keys(HEADWEAR_ALLOWED_SOLIDS) as HeadSilhouetteId[];
export function isHeadwearSolidColorId(value:unknown):value is HeadwearSolidColorId{
 return typeof value==='string'&&Object.prototype.hasOwnProperty.call(HEADWEAR_SOLID_COLORS,value);
}
export function headwearColorChoices(id:string):readonly HeadwearSolidColorId[]{
 return Object.prototype.hasOwnProperty.call(HEADWEAR_ALLOWED_SOLIDS,id)?
  HEADWEAR_ALLOWED_SOLIDS[id as HeadSilhouetteId]:[];
}
/** Previously saved colors, and unsupported colors on another item, resolve
 * to the item's curated default rather than leaking a mismatched swatch.
 */
export function resolvedHeadwearSolid(id:string,requested:unknown):HeadwearSolidColorId|null{
 const allowed=headwearColorChoices(id);
 if(!allowed.length)return null;
 return isHeadwearSolidColorId(requested)&&allowed.includes(requested)?
  requested:HEADWEAR_DEFAULT_SOLIDS[id as HeadSilhouetteId];
}
export function headwearSolidHex(id:string,requested:unknown):number|null{
 const color=resolvedHeadwearSolid(id,requested);
 return color===null?null:HEADWEAR_SOLID_COLORS[color].hex;
}
