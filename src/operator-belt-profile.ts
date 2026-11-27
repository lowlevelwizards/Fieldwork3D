/** BT0: stable saved equipment IDs, one representative visual per belt.
 * Old light/standard IDs remain valid; do not mint items during migration.
 * Legacy standard kits may retain their saved battle/padded look until
 * explicitly re-equipped (capacity stays that of the owned utility belt).
 */
export const BELT_PROFILES={
 'no-belt':{equipment:'belt-none',name:'No belt',capacity:0,massKg:0,bulk:0,height:0,thickness:0},
 'plain-belt':{equipment:'belt-light',name:'Leather belt',capacity:1,massKg:.15,bulk:0,height:1.05,thickness:.24},
 'duty-belt':{equipment:'belt-standard',name:'Utility belt',capacity:4,massKg:.5,bulk:1,height:1.75,thickness:.5},
 'battle-belt':{equipment:'belt-battle',name:'Battle belt',capacity:5,massKg:.55,bulk:2,height:2.25,thickness:.76},
 'padded-belt':{equipment:'belt-padded',name:'Padded war belt',capacity:6,massKg:.9,bulk:3,height:3.35,thickness:1.25}
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
