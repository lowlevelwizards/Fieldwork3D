import type {GarmentSolidId} from './operator-garment-color-policy.ts';
/** BT0: stable saved equipment IDs, one representative visual per belt.
 * Old light/standard IDs remain valid; do not mint items during migration.
 * Legacy standard kits may retain their saved battle/padded look until
 * explicitly re-equipped (capacity stays that of the owned utility belt).
 */
export const BELT_PROFILES={
 'no-belt':{equipment:'belt-none',name:'No belt',capacity:0,massKg:0,bulk:0,height:0,thickness:0},
 'plain-belt':{equipment:'belt-light',name:'Leather belt',capacity:1,massKg:.15,bulk:0,height:1.15,thickness:.32},
 'duty-belt':{equipment:'belt-standard',name:'Utility belt',capacity:4,massKg:.5,bulk:1,height:1.85,thickness:.58},
 'battle-belt':{equipment:'belt-battle',name:'Battle belt',capacity:5,massKg:.55,bulk:2,height:2.6,thickness:.86},
 'padded-belt':{equipment:'belt-padded',name:'Padded war belt',capacity:6,massKg:.9,bulk:3,height:3.8,thickness:1.35}
} as const;
export type BeltStyle=keyof typeof BELT_PROFILES;
export const BELT_STYLES=Object.keys(BELT_PROFILES) as BeltStyle[];
export function canonicalBeltStyle(style:unknown):BeltStyle|undefined{
 if(style==='light-belt')return 'plain-belt';
 return typeof style==='string'&&Object.prototype.hasOwnProperty.call(BELT_PROFILES,style)?style as BeltStyle:undefined;
}
export function beltStyleForEquipment(id:string,requested?:unknown):BeltStyle{
 const style=canonicalBeltStyle(requested);
 if(id==='belt-standard'&&(style==='battle-belt'||style==='padded-belt'))return style;
 if(style&&BELT_PROFILES[style].equipment===id)return style;
 return BELT_STYLES.find(s=>BELT_PROFILES[s].equipment===id)??'no-belt';
}

/** Restrained, belt-family-specific finishes. Missing override inherits the
 * saved gear textile for backward compatibility; no stock effect. */
const BELT_FINISHES:Readonly<Record<BeltStyle,readonly GarmentSolidId[]>>={
 'no-belt':[],
 'plain-belt':['black','brown','tan'],
 'duty-belt':['black','olive-drab','khaki','brown'],
 'battle-belt':['black','ranger-green','coyote','olive-drab'],
 'padded-belt':['black','olive-drab','ranger-green','coyote']
};
export function beltSolidChoices(style:string):readonly GarmentSolidId[]{
 return BELT_FINISHES[canonicalBeltStyle(style)??'no-belt'];
}
