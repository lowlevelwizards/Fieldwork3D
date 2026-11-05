/** R5G: historically informed canvas H-suspender appearance, not inventory. */
export const M1956_VARIANTS=['early','late','light'] as const;
export type M1956Variant=typeof M1956_VARIANTS[number];
export const isM1956Variant=(v:unknown):v is M1956Variant=>
 typeof v==='string'&&(M1956_VARIANTS as readonly string[]).includes(v);
export const resolvedM1956Variant=(v:unknown):M1956Variant=>
 isM1956Variant(v)?v:'late';
