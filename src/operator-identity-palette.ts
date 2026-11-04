/** Operator identity colors and haircut choices. Pure presentation:
 * no ancestry/ethnicity, gameplay stats, damage or mechanical equipment. */
export const SKIN_TONES={
 'medium-neutral':{label:'Medium neutral',hex:0xb29b83},
 'medium-deep-warm':{label:'Medium deep warm',hex:0x8b6754},
 'light-warm':{label:'Light warm',hex:0xc4aa86},
 'deep-warm':{label:'Deep warm',hex:0x6e4938},
 'medium-warm':{label:'Medium warm',hex:0xaa7c63},
 'fair-warm':{label:'Fair warm',hex:0xd3b698},
 'medium-olive':{label:'Medium olive',hex:0x98765c},
 'deep-neutral':{label:'Deep neutral',hex:0x533a32},
 'fair-neutral':{label:'Fair neutral',hex:0xe2c5ab},
 'deep-cool':{label:'Deep cool',hex:0x674d43}
} as const;
export type SkinToneId=keyof typeof SKIN_TONES;
export const SKIN_TONE_IDS=Object.keys(SKIN_TONES) as SkinToneId[];
const ORIGINAL_SKIN_TONES=SKIN_TONE_IDS.slice(0,8);
export const isSkinToneId=(value:unknown):value is SkinToneId=>
 typeof value==='string'&&Object.prototype.hasOwnProperty.call(SKIN_TONES,value);
export const seededSkinTone=(seed:number):SkinToneId=>
 ORIGINAL_SKIN_TONES[(seed>>>6)%ORIGINAL_SKIN_TONES.length];

export const HAIR_STYLES={
 'buzz':{label:'Buzz cut'},
 'crop':{label:'Short crop'},
 'side-part':{label:'Side-parted'},
 'textured':{label:'Textured / curly'},
 'tied-back':{label:'Tied back'},
 'close-afro':{label:'Close afro'}
} as const;
export type HairStyleId=keyof typeof HAIR_STYLES;
export const HAIR_STYLE_IDS=Object.keys(HAIR_STYLES) as HairStyleId[];
export const isHairStyleId=(value:unknown):value is HairStyleId=>
 typeof value==='string'&&Object.prototype.hasOwnProperty.call(HAIR_STYLES,value);
export const seededHairStyle=(seed:number):HairStyleId=>
 HAIR_STYLE_IDS[(seed>>>0)%3];

export const HAIR_TONES={
 'dark-brown':{label:'Dark brown',hex:0x332e29},
 'brown':{label:'Brown',hex:0x635244},
 'near-black':{label:'Near black',hex:0x2f3530},
 'sandy-blond':{label:'Sandy blond',hex:0x9b8060},
 'warm-brown':{label:'Warm brown',hex:0x4d4136},
 'ash-gray':{label:'Ash gray',hex:0x6c6255},
 'auburn':{label:'Auburn',hex:0x744839},
 'white-gray':{label:'White gray',hex:0xbcb7a7}
} as const;
export type HairToneId=keyof typeof HAIR_TONES;
export const HAIR_TONE_IDS=Object.keys(HAIR_TONES) as HairToneId[];
export const isHairToneId=(value:unknown):value is HairToneId=>
 typeof value==='string'&&Object.prototype.hasOwnProperty.call(HAIR_TONES,value);
export const seededHairTone=(seed:number):HairToneId=>
 HAIR_TONE_IDS[(seed>>>0)%6];
