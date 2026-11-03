/** Automatic neutral equipment fabrics. These colors are artist-authored
 * pairings, NEVER derived by sampling or modifying camouflage pixels.
 * An explicit armor/gear/pack fabric choice always takes precedence.
 */
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
import {CAMO_CUFF_DEFAULTS,isGarmentSolidId,type GarmentSolidId}
 from './operator-garment-color-policy.ts';

export type GearAutoColors={armor:GarmentSolidId;gear:GarmentSolidId;pack:GarmentSolidId};
const PALETTE:Readonly<Record<GarmentSolidId,GearAutoColors>>={
 'olive-drab':{armor:'olive-drab',gear:'ranger-green',pack:'olive-drab'},
 'ranger-green':{armor:'ranger-green',gear:'olive-drab',pack:'ranger-green'},
 'forest-green':{armor:'ranger-green',gear:'olive-drab',pack:'forest-green'},
 'field-green':{armor:'olive-drab',gear:'ranger-green',pack:'olive-drab'},
 sage:{armor:'foliage',gear:'sage',pack:'foliage'},
 foliage:{armor:'foliage',gear:'foliage',pack:'foliage'},
 khaki:{armor:'coyote',gear:'khaki',pack:'khaki'},
 sand:{armor:'coyote',gear:'sand',pack:'khaki'},
 tan:{armor:'coyote',gear:'tan',pack:'coyote'},
 coyote:{armor:'coyote',gear:'coyote',pack:'coyote'},
 brown:{armor:'coyote',gear:'brown',pack:'brown'},
 slate:{armor:'slate',gear:'slate',pack:'charcoal'},
 charcoal:{armor:'charcoal',gear:'charcoal',pack:'charcoal'},
 black:{armor:'black',gear:'black',pack:'black'},
 'off-white':{armor:'khaki',gear:'sand',pack:'khaki'}
};
const PRINT_EXCEPTIONS:Partial<Record<HeadwearCamoId,GearAutoColors>>={
 multicam:{armor:'coyote',gear:'coyote',pack:'coyote'},
 'scorpion-w2':{armor:'coyote',gear:'coyote',pack:'coyote'},
 'british-mtp':{armor:'coyote',gear:'coyote',pack:'khaki'},
 'woodland-marpat':{armor:'coyote',gear:'coyote',pack:'olive-drab'},
 'desert-marpat':{armor:'coyote',gear:'coyote',pack:'coyote'},
 ucp:{armor:'foliage',gear:'foliage',pack:'foliage'},
 'three-color-desert':{armor:'coyote',gear:'khaki',pack:'khaki'},
 'australian-dpcu':{armor:'coyote',gear:'khaki',pack:'khaki'},
 'east-german-strichtarn':{armor:'olive-drab',gear:'olive-drab',pack:'olive-drab'},
 alpenflage:{armor:'olive-drab',gear:'olive-drab',pack:'olive-drab'},
 'six-color-desert':{armor:'coyote',gear:'khaki',pack:'khaki'}
};
export function resolveAutomaticGearColors(options:{
 print?:HeadwearCamoId|null;solid?:GarmentSolidId|null
}):GearAutoColors{
 if(options.print&&PRINT_EXCEPTIONS[options.print])
  return PRINT_EXCEPTIONS[options.print]!;
 const swatch=options.print?CAMO_CUFF_DEFAULTS[options.print]:
  isGarmentSolidId(options.solid)?options.solid:'ranger-green';
 return PALETTE[swatch];
}
