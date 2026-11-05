/** DDR M56 historical exterior accents; purely visual. */
export const M56_DETAILS=['early-rivets','late-smooth'] as const;
export const M56_NETS=['none','coarse'] as const;
export type M56Details=typeof M56_DETAILS[number];
export type M56Net=typeof M56_NETS[number];
export type M56Options={m56Details?:M56Details;m56Net?:M56Net};
export const isM56Details=(v:unknown):v is M56Details=>
 typeof v==='string'&&(M56_DETAILS as readonly string[]).includes(v);
export const isM56Net=(v:unknown):v is M56Net=>
 typeof v==='string'&&(M56_NETS as readonly string[]).includes(v);
