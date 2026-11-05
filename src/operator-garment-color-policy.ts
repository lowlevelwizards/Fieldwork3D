/** Authored solid fabric and cuff colors. No runtime sampling of printed
 * camouflage pixels: folds are chosen deliberately for each fabric family.
 * Stored material IDs are cosmetic and never alter equipment eligibility. */
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
import type {FabricCamoChannel} from './operator-fabric-camo-policy.ts';
export const GARMENT_SOLID_COLORS={
 'olive-drab':{label:'OD Green',hex:0x646c49},
 'ranger-green':{label:'Ranger Green',hex:0x566a57},
 'forest-green':{label:'Forest Green',hex:0x43563e},
 'field-green':{label:'Field Green',hex:0x737b59},
 'sage':{label:'Sage',hex:0x87907d},
 'foliage':{label:'Foliage Gray',hex:0x8a9388},
 'khaki':{label:'Khaki',hex:0xaa9978},
 'sand':{label:'Sand',hex:0xc5b38d},
 'tan':{label:'Tan',hex:0xb59d77},
 'coyote':{label:'Coyote Brown',hex:0x927557},
 'brown':{label:'Earth Brown',hex:0x66513d},
 'nutria-brown':{label:'Nutria Brown',hex:0x937b58},
 'slate':{label:'Slate',hex:0x727b7a},
 'charcoal':{label:'Charcoal',hex:0x383e3b},
 'black':{label:'Black',hex:0x292f2d},
 'off-white':{label:'Off-white',hex:0xd6d3bc}
} as const;
export type GarmentSolidId=keyof typeof GARMENT_SOLID_COLORS;
const all:readonly GarmentSolidId[]=[
 'olive-drab','ranger-green','forest-green','field-green','sage',
 'foliage','khaki','sand','tan','coyote','brown','slate',
 'charcoal','black','off-white','nutria-brown'];
const kit:readonly GarmentSolidId[]=[
 'olive-drab','ranger-green','forest-green','foliage','khaki',
 'sand','tan','coyote','brown','nutria-brown','slate','charcoal','black'];
export const FABRIC_SOLID_CHOICES:Readonly<Record<FabricCamoChannel,readonly GarmentSolidId[]>>={
 top:all,trousers:all,armor:kit,gear:kit,pack:kit
};
export function isGarmentSolidId(value:unknown):value is GarmentSolidId{
 return typeof value==='string'&&Object.prototype.hasOwnProperty.call(GARMENT_SOLID_COLORS,value);
}
export function solidChoicesFor(channel:FabricCamoChannel):readonly GarmentSolidId[]{
 return FABRIC_SOLID_CHOICES[channel];
}
/** Artist-selected functional trim tones, not the average sampled map RGB.
 * Special cases can depart from terrain grouping where real fabric does. */
export const CAMO_CUFF_DEFAULTS:Readonly<Record<HeadwearCamoId,GarmentSolidId>>={
 'm81-woodland':'olive-drab',
 'three-color-desert':'sand',
 'tiger-stripe':'olive-drab',
 ucp:'foliage',
 multicam:'coyote',
 flecktarn:'field-green',
 'woodland-dpm':'olive-drab',
 'swedish-m90':'olive-drab',
 'six-color-desert':'tan',
 'woodland-marpat':'forest-green',
 alpenflage:'field-green',
 'desert-marpat':'coyote',
 'erdl-lowland':'olive-drab',
 'finnish-m05':'forest-green',
 'polish-pantera':'olive-drab',
 'russian-flora':'olive-drab',
 'rhodesian-brushstroke':'khaki',
 'desert-tropentarn':'sand',
 'belgian-jigsaw':'field-green',
 'east-german-strichtarn':'field-green',
 'mitchell-leaf':'olive-drab',
 'splittertarn-31':'field-green',
 'australian-dpcu':'khaki',
 'italian-vegetato':'olive-drab',
 'scorpion-w2':'coyote',
 'russian-emr':'forest-green',
 'pla-xingkong':'field-green',
 'cadpat-tw':'forest-green',
 'british-mtp':'khaki',
 'indian-digital-2022':'khaki',
 'atacs-fg':'ranger-green',
 'ukrainian-mm14':'khaki',
 aor2:'ranger-green',
 'multicam-tropic':'forest-green',
 'atacs-au':'khaki',
 'ss-leto':'olive-drab',
 aor1:'coyote',
 'multicam-arid':'sand',
 'multicam-black':'charcoal','multicam-alpine':'off-white',
 'pencott-greenzone':'forest-green','pencott-badlands':'khaki',
 'desert-night':'sage','kryptek-highlander':'coyote',
 berezka:'olive-drab','spectre-skwo':'ranger-green',
 'russian-izlom':'forest-green','greek-lizard':'olive-drab','urban-kamysh':'slate',
 'jgsdf-type2':'field-green','pencott-metropolis':'charcoal',
 'south-african-s2000':'nutria-brown','kryptek-typhon':'charcoal','norwegian-m98':'olive-drab',
 'french-cce':'olive-drab','russian-vsr93':'olive-drab','swiss-taz90':'field-green',
 'british-desert-dpm':'khaki','south-korean-granite-b':'ranger-green',
 'indonesian-kopassus-flowing-blood':'field-green','cadpat-ar':'coyote','usaf-abu':'sage'
};
export function garmentSolidHex(id:GarmentSolidId):number{
 return GARMENT_SOLID_COLORS[id].hex;
}
export function resolvedCuffSolid(options:{
 print?:HeadwearCamoId|null;solid?:GarmentSolidId|null;
 override?:GarmentSolidId|null;fallback?:GarmentSolidId
}):GarmentSolidId{
 return options.override??(options.print?CAMO_CUFF_DEFAULTS[options.print]:null)??
  options.solid??options.fallback??'olive-drab';
}

/** Automatically selected knit undershirt color for combat shirts.
 * Reference-driven family pairing: woodland -> muted olive, arid -> khaki
 * or coyote, transitional -> neutral tan, urban -> foliage/slate.
 * No random sampling of the preserved camouflage masters. */
export const CAMO_COMBAT_KNIT_DEFAULTS:Readonly<Record<HeadwearCamoId,GarmentSolidId>>={
 ...CAMO_CUFF_DEFAULTS,
 multicam:'khaki',
 'scorpion-w2':'khaki',
 'british-mtp':'khaki',
 'three-color-desert':'khaki',
 'six-color-desert':'tan',
 'desert-marpat':'coyote',
 'desert-tropentarn':'sand',
 'australian-dpcu':'khaki',
 'indian-digital-2022':'khaki',
 'rhodesian-brushstroke':'khaki',
 'woodland-marpat':'olive-drab',
 'russian-emr':'olive-drab',
 'cadpat-tw':'olive-drab',
 'polish-pantera':'ranger-green',
 'pla-xingkong':'sage'
};
export const SOLID_COMBAT_KNIT_DEFAULTS:Readonly<Record<GarmentSolidId,GarmentSolidId>>={
 'olive-drab':'olive-drab','ranger-green':'ranger-green',
 'forest-green':'ranger-green','field-green':'olive-drab',
 sage:'foliage',foliage:'foliage',khaki:'khaki',sand:'sand',tan:'khaki',
 coyote:'coyote',brown:'coyote','nutria-brown':'khaki',slate:'slate',
 charcoal:'charcoal',black:'black','off-white':'off-white'
};
export function resolvedCombatKnitSolid(options:{
 print?:HeadwearCamoId|null;solid?:GarmentSolidId|null;
 override?:GarmentSolidId|null;fallback?:GarmentSolidId
}):GarmentSolidId{
 return options.override??(options.print?CAMO_COMBAT_KNIT_DEFAULTS[options.print]:null)??
  (options.solid?SOLID_COMBAT_KNIT_DEFAULTS[options.solid]:null)??
  options.fallback??'khaki';
}
