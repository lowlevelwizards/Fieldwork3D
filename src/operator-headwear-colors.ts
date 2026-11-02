/** Contextual headgear SOLID swatches (no universal operator color wheel).
 * One practical core color token can belong to several headwear families,
 * but each physical piece carries a deliberately restricted option list.
 * These are art-directed matte RGB references, not measured paint standards.
 * Covers and camouflage are separate future layers.
 */
import type {HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
export const HEADWEAR_SOLID_COLORS={
 black:{label:'Black',hex:0x292e2d},
 navy:{label:'Navy Blue',hex:0x354355},
 charcoal:{label:'Charcoal',hex:0x535958},
 'olive-drab':{label:'Olive Drab',hex:0x686d4e},
 'ranger-green':{label:'Ranger Green',hex:0x506354},
 'foliage-green':{label:'Foliage Green',hex:0x909987},
 'desert-tan':{label:'Desert Tan',hex:0xbda880},
 'coyote-brown':{label:'Coyote Brown',hex:0x887054},
 'urban-gray':{label:'Urban Gray',hex:0x7c8787},
 'winter-white':{label:'Winter White',hex:0xd9d8c9},
 'soviet-4bo':{label:'Soviet 4BO Green',hex:0x555e3e},
 'postwar-green':{label:'Postwar Green',hex:0x80864f}
} as const;
export type HeadwearSolidColorId=keyof typeof HEADWEAR_SOLID_COLORS;
export const HEADWEAR_ALLOWED_SOLIDS:Readonly<Record<HeadSilhouetteId,readonly HeadwearSolidColorId[]>>={
 'patrol-cap':['olive-drab','ranger-green','desert-tan','black','navy'],
 boonie:['olive-drab','ranger-green','desert-tan','coyote-brown','black','navy'],
 beanie:['black','navy','charcoal','olive-drab','coyote-brown','desert-tan','winter-white'],
 ach:['olive-drab','foliage-green','desert-tan','coyote-brown','black','navy'],
 'high-cut':['ranger-green','black','desert-tan','coyote-brown','urban-gray'],
 pasgt:['olive-drab','desert-tan','coyote-brown','black','navy'],
 'soviet-steel':['soviet-4bo','postwar-green']
};
export const HEADWEAR_DEFAULT_SOLIDS:Readonly<Record<HeadSilhouetteId,HeadwearSolidColorId>>={
 'patrol-cap':'olive-drab',boonie:'olive-drab',beanie:'black',
 ach:'olive-drab','high-cut':'ranger-green',pasgt:'olive-drab',
 'soviet-steel':'soviet-4bo'
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
