/** R5H4 visual-only police helmet shield with explicit fit restrictions. */
export const POLICE_VISOR_POSITIONS=['none','raised','lowered'] as const;
export const POLICE_VISOR_TINTS=['clear','smoke'] as const;
export const POLICE_VISOR_FRAMES=['standard','reinforced'] as const;
export type PoliceVisorPosition=typeof POLICE_VISOR_POSITIONS[number];
export type PoliceVisorTint=typeof POLICE_VISOR_TINTS[number];
export type PoliceVisorFrame=typeof POLICE_VISOR_FRAMES[number];
export type PoliceVisorOptions={
 policeVisorPosition?:PoliceVisorPosition;
 policeVisorTint?:PoliceVisorTint;
 policeVisorFrame?:PoliceVisorFrame;
};
export const isPoliceVisorPosition=(v:unknown):v is PoliceVisorPosition=>
 typeof v==='string'&&(POLICE_VISOR_POSITIONS as readonly string[]).includes(v);
export const isPoliceVisorTint=(v:unknown):v is PoliceVisorTint=>
 typeof v==='string'&&(POLICE_VISOR_TINTS as readonly string[]).includes(v);
export const isPoliceVisorFrame=(v:unknown):v is PoliceVisorFrame=>
 typeof v==='string'&&(POLICE_VISOR_FRAMES as readonly string[]).includes(v);
const LARGE_MASKS=new Set(['gas-gp5','gas-m17','gas-m40','gas-m50',
 'respirator-half','half-mask']);
const LARGE_GOGGLES=new Set(['goggles-field','goggles-retro']);
const LARGE_HEADSETS=new Set(['over-ear','boom-headset','helmet-ears']);
export function policeVisorFit(headwear:string,facewear:string,
 eyewear:string,headset:string):{compatible:boolean;reason:string}{
 if(headwear!=='police-helmet')return {compatible:false,reason:'Police helmet required'};
 if(LARGE_MASKS.has(facewear))return {compatible:false,reason:'Bulky face mask intersects the visor'};
 if(LARGE_GOGGLES.has(eyewear))return {compatible:false,reason:'Bulky goggles intersect the shield'};
 if(LARGE_HEADSETS.has(headset))return {compatible:false,reason:'Headset overlaps visor hinges'};
 return {compatible:true,reason:''};
}
